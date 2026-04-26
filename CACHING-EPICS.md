# ChiselGrid — Caching and Performance EPICs

All caching EPICs reference CACHING.md for architecture decisions and patterns.
See ROADMAP.md for milestone placement.

---

## EPIC-CACHE-01 — Browser-Side Caching (M1 Demo, This Week)

**Goal:** Prevent work loss when navigating between Chamber, Grid, Studio.
Zero infrastructure cost. Implement before April 29 demo.

**Milestone:** M1

---

### TASK-CACHE-01-01 — React memoisation on Grid renderer

**Files:** packages/grid-renderer/src/components/DiagramCanvas.tsx,
packages/grid-renderer/src/utils/gridIRToReactFlow.ts

- Subtask: Wrap gridIRToReactFlow call in useMemo with [gridIR] dependency
- Subtask: Apply React.memo to every node component (DefaultNode, AWSNode)
- Subtask: Apply React.memo to DiagramToolbar component
- Subtask: Verify with React DevTools — node components must not re-render on pan/zoom
- Acceptance: Panning and zooming a 20-node diagram runs at 60fps. No unnecessary re-renders on unrelated state changes.

---

### TASK-CACHE-01-02 — sessionStorage for Grid session

**File:** apps/web/src/app/admin/grid/architecture/page.tsx

- Subtask: On mount, read sessionId from URL param ?session=UUID
- Subtask: If no sessionId in URL, generate UUID and add with router.replace()
- Subtask: After every successful diagram generation, write to sessionStorage:
  key: grid_session_{sessionId}
  value: { gridIR, diagramType, messages, savedAt }
- Subtask: On mount with sessionId, restore gridIR and messages from sessionStorage
- Subtask: Debounce writes to 500ms to avoid excessive serialisation
- Acceptance: Generate a diagram. Navigate to Chamber. Return to Grid. Diagram and chat history are fully restored. No Aurora call needed for restore.

---

### TASK-CACHE-01-03 — sessionStorage for Chamber session

**File:** apps/web/src/app/admin/chamber/page.tsx

- Subtask: Same sessionId from URL param ?session=UUID
- Subtask: After every Bedrock exchange, write to sessionStorage:
  key: chamber_session_{sessionId}
  value: { messages, agentSelections, savedAt }
- Subtask: On mount, restore messages and agent selections from sessionStorage
- Subtask: Invalidate if savedAt older than 4 hours
- Acceptance: Start a Chamber conversation. Navigate to Grid. Return to Chamber. Full conversation history restored instantly.

---

### TASK-CACHE-01-04 — Session ID in sidebar navigation

**File:** apps/web/src/components/admin/AdminShell.tsx (or sidebar component)

- Subtask: Read current sessionId from URL params on every render
- Subtask: Append ?session={sessionId} to Chamber, Grid, Studio nav links
  when sessionId is present in current URL
- Subtask: If no sessionId (user on Dashboard), nav links have no session param
- Subtask: New session button creates fresh UUID and navigates without session param
- Acceptance: Clicking between Chamber, Grid, Studio nav items always preserves the session ID in the URL. Work is never lost mid-session.

---

### TASK-CACHE-01-05 — localStorage for recent sessions

**File:** apps/web/src/lib/cache/recentSessions.ts (new utility)

- Subtask: Create recentSessions.ts with addRecentSession, getRecentSessions, removeRecentSession
- Subtask: Max 20 sessions, LRU eviction when limit reached
- Subtask: Fields stored per session: id, title, lastAccessed, diagramCount, messageCount
- Subtask: Call addRecentSession on every session access (mount with valid sessionId)
- Subtask: Display last 5 recent sessions in sidebar below Chamber/Grid/Studio
  Format: session title + relative time ("2 hours ago")
  Click to navigate to /admin/chamber?session={id}
- Acceptance: Recent sessions list shows last 5 sessions. Clicking one restores the session. Sessions persist across browser restarts.

---

### TASK-CACHE-01-06 — localStorage for user preferences

**File:** apps/web/src/lib/cache/userPrefs.ts (new utility)

- Subtask: Create userPrefs.ts with getUserPrefs, setUserPref, resetPrefs
- Subtask: Store: defaultDiagramType, activeAgents, sidebarCollapsed, preferredTheme, gridLayout
- Subtask: Read preferences on Grid architecture page mount (restore last diagram type and active agents)
- Subtask: Write on every user preference change (diagram type tab click, agent toggle, sidebar toggle)
- Acceptance: User selects C4 Context diagram type. Closes tab. Reopens Grid. C4 Context is pre-selected. Sidebar collapse state is preserved across sessions.

---

### TASK-CACHE-01-07 — CloudFront Cache-Control headers

**Files:** apps/web/src/app/api/articles/[slug]/route.ts,
apps/web/src/app/api/categories/route.ts,
apps/web/src/app/api/admin/*/route.ts

- Subtask: Add Cache-Control: public, max-age=3600 to published article API responses
- Subtask: Add Cache-Control: public, max-age=900 to categories API response
- Subtask: Verify all /api/admin/* routes return Cache-Control: private, no-store
- Subtask: Verify all /api/auth/* routes return Cache-Control: private, no-store
- Subtask: Test with curl -I to confirm headers are present on responses
- Acceptance: curl -I https://www.chiselgrid.com/api/articles/[slug] shows Cache-Control: public, max-age=3600. curl -I https://www.chiselgrid.com/api/admin/queue shows Cache-Control: private, no-store.

---

## EPIC-CACHE-02 — Session Persistence to Aurora (M2, May)

**Goal:** Full Aurora persistence for sessions so they survive browser close
and are accessible from any device.

**Milestone:** M2

---

### TASK-CACHE-02-01 — Aurora session tables migration

**File:** tools/migration/src/session-schema.ts

- Subtask: Create work_sessions table per CACHING.md schema
- Subtask: Create chamber_messages table with session_id FK
- Subtask: Add session_id column to grid_diagrams table
- Subtask: Create studio_documents table with session_id FK
- Subtask: Create indexes: work_sessions(tenant_id), chamber_messages(session_id), grid_diagrams(session_id)
- Acceptance: All four tables exist in Aurora. FKs are enforced. Indexes created.

---

### TASK-CACHE-02-02 — Session create and hydrate API routes

**Files:** apps/web/src/app/api/admin/sessions/route.ts,
apps/web/src/app/api/admin/sessions/[id]/route.ts

- Subtask: POST /api/admin/sessions — create new session, return { id, title }
- Subtask: GET /api/admin/sessions — list sessions for tenant, ordered by updated_at DESC
- Subtask: GET /api/admin/sessions/[id] — hydrate session bundle:
  returns { session, messages: last50, diagrams: [metadata], document: draft }
- Subtask: PATCH /api/admin/sessions/[id] — update title or status
- Subtask: DELETE /api/admin/sessions/[id] — soft delete (status=archived)
- Acceptance: Full session CRUD works. Hydration returns complete session state in single request.

---

### TASK-CACHE-02-03 — Write-through from browser to Aurora

**Files:** apps/web/src/app/admin/chamber/page.tsx,
apps/web/src/app/admin/grid/architecture/page.tsx

- Subtask: After every Chamber exchange, POST message to /api/admin/sessions/[id]/messages
- Subtask: After every Grid generation, PATCH diagram with session_id via /api/admin/grid/diagrams/[id]
- Subtask: Write is background/async — never blocks UI
- Subtask: Write failures logged silently — sessionStorage remains source of truth for current session
- Subtask: sessionStorage marked with syncedAt after successful Aurora write
- Acceptance: Session content appears in Aurora within 5 seconds of creation. Browser close and reopen restores session from Aurora if sessionStorage is empty.

---

### TASK-CACHE-02-04 — Sessions list page

**File:** apps/web/src/app/admin/sessions/page.tsx

- Subtask: Page shows all sessions for tenant ordered by last accessed
- Subtask: Each session shows: title, last accessed time, diagram count, message count
- Subtask: Click session navigates to /admin/chamber?session={id}
- Subtask: Search input filters sessions by title
- Subtask: Archive button soft-deletes session
- Acceptance: All past sessions visible. Clicking one restores full Chamber + Grid + Studio state.

---

## EPIC-CACHE-03 — ElastiCache Redis (M2, May)

**Goal:** Server-side caching for Bedrock responses, session hydration,
and tenant config. Break-even at ~10 daily active users.

**Milestone:** M2
**Infrastructure cost:** ~$18/month (cache.t3.micro)

---

### TASK-CACHE-03-01 — Provision ElastiCache Redis

**File:** infra/lib/stacks/cache.stack.ts (new)

- Subtask: Create new CDK stack CacheStack with ElastiCache cluster
- Subtask: cache.t3.micro, single node, ap-southeast-1
- Subtask: Place in same VPC as Lambda and Aurora
- Subtask: Security group: allow inbound 6379 from Lambda security group only
- Subtask: Output: Redis endpoint URL
- Subtask: Store endpoint in Lambda env var REDIS_URL
- Acceptance: Redis reachable from Lambda. telnet {endpoint} 6379 succeeds from within VPC.

---

### TASK-CACHE-03-02 — Redis client utility

**File:** apps/web/src/lib/cache/redis.ts

- Subtask: Install ioredis: pnpm add ioredis
- Subtask: Create redis.ts with lazy connection singleton
- Subtask: Export: get(key), set(key, value, ttlSeconds), del(key), exists(key)
- Subtask: Graceful degradation: if REDIS_URL not set, all operations are no-ops
  This means caching is optional — app works without Redis
- Subtask: Connection error handling: log warning, return null from get, skip set
- Acceptance: Redis client works in Lambda. If Redis is unavailable, app continues normally with no caching.

---

### TASK-CACHE-03-03 — Bedrock response cache

**File:** packages/grid-agents/src/bedrock.ts

- Subtask: Add cachedInvokeModel(systemPrompt, userMessage, systemPromptVersion) function
- Subtask: Cache key: bedrock:{sha256(systemPromptVersion + userMessage)}
- Subtask: TTL: 86400 seconds (24 hours)
- Subtask: On cache hit: return cached string, log cache hit metric
- Subtask: On cache miss: call Bedrock, store result, return result
- Subtask: Never cache responses from compliance or security agents (add skipCache flag)
- Acceptance: Sending identical prompt twice — second call returns in <5ms. Cache hit rate metric visible in CloudWatch.

---

### TASK-CACHE-03-04 — Session hydration cache

**File:** apps/web/src/app/api/admin/sessions/[id]/route.ts

- Subtask: Before Aurora query, check Redis: session:{id}:hydration (TTL: 5 min)
- Subtask: On cache miss: query Aurora, store bundle in Redis, return
- Subtask: Invalidate session:{id}:hydration whenever chamber message or diagram is saved
- Subtask: Log cache hit rate to CloudWatch metric
- Acceptance: Second GET to /api/admin/sessions/[id] returns in <10ms. First call populates cache.

---

### TASK-CACHE-03-05 — Tenant config cache

**File:** apps/web/src/lib/db/tenantConfig.ts (new)

- Subtask: getTenantConfig(tenantId) checks Redis tenant:config:{tenantId} first
- Subtask: TTL: 900 seconds (15 minutes)
- Subtask: Cache warm on user login: pre-fetch and cache tenant config
- Subtask: Immediate invalidation when tenant config is updated via admin API
- Acceptance: Admin page loads do not trigger Aurora tenant config queries after warmup. Config changes reflect within 15 minutes.

---

## EPIC-CACHE-04 — RAG Performance (M4, June)

**Goal:** Embedding cache and RAG context cache reduce AI query costs by 60-80%.

**Milestone:** M4

---

### TASK-CACHE-04-01 — Embedding cache in Redis

**File:** apps/web/src/lib/ai/embeddings.ts (new)

- Subtask: generateEmbedding(text, id, version) checks Redis embedding:{id}:{version} first
- Subtask: TTL: 604800 seconds (7 days)
- Subtask: On cache miss: call Bedrock Titan, store in Redis AND Aurora pgvector
- Subtask: Cache grid diagram embeddings on save, not on first query
- Acceptance: RAG queries for previously seen diagrams skip Bedrock Titan call. Embedding generation cost reduced to zero for cached content.

---

### TASK-CACHE-04-02 — RAG context cache

**File:** apps/web/src/lib/ai/rag.ts (new)

- Subtask: getCachedRAGContext(tenantId, query, abstractionLevel) checks Redis
  Key: rag:{tenantId}:{sha256(query)}:{abstractionLevel}, TTL: 1800 seconds (30 min)
- Subtask: Cache value: { articles: [], diagrams: [], relevanceScores: [], cachedAt }
- Subtask: Cache miss: run pgvector similarity search, fetch content, cache result
- Subtask: Do not cache RAG context used for compliance queries
- Acceptance: Same question asked within 30 minutes returns cached RAG context in <5ms vs 2-4 seconds.

---

## Performance Targets by Milestone

| Metric | Current | After M1 (EPIC-01) | After M2 (EPIC-02/03) | After M4 (EPIC-04) |
|--------|---------|-------------------|----------------------|-------------------|
| Session navigation | ~500ms | <100ms | <50ms | <50ms |
| Diagram re-render | ~200ms | <16ms | <16ms | <16ms |
| Bedrock (new) | ~5s | ~5s | <1s (cache hit) | <1s (cache hit) |
| Page load (admin) | ~800ms | ~200ms | ~100ms | ~100ms |
| RAG query | ~3s | ~3s | <50ms (hit) | <5ms (hit) |
| Tenant config | ~100ms | <2ms | <1ms | <1ms |

---

## Monitoring and Alerting

Add these CloudWatch metrics in EPIC-CACHE-03:

| Metric | Target | Alert if |
|--------|--------|---------|
| bedrock.cache.hit_rate | >20% | <5% for 1 hour |
| session.hydration.hit_rate | >80% | <50% for 30 min |
| cloudfront.cache_hit_rate | >60% | <30% for 1 hour |
| redis.connection.errors | 0 | >0 for 5 min |
| bedrock.p99_latency_ms | <8000 | >15000 for 5 min |

---

## Never Cache — Non-Negotiable Rules

Document these in CLAUDE.md to prevent regression:

1. Security agent findings — must be fresh per diagram version
2. Compliance agent outputs (BSP, PCI-DSS) — regulatory rules may change
3. Authentication tokens — never, under any circumstances
4. Active diagram during editing — write-through only, never read-stale
5. Any key containing PII without encryption + short TTL

---

*Last updated: April 2026*
*Owner: Jeril Panicker, Solutions Architect, Ascendion Digital Services Philippines*
*See CACHING.md for architecture decisions and code patterns.*
