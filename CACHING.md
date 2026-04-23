# ChiselGrid — Caching and Performance Strategy

## Overview

ChiselGrid uses a five-layer caching architecture. Each layer targets a
different latency and cost problem. Layers are additive — adding a layer
never removes functionality, only improves performance.

---

## The Five Layers

| Layer | Technology | Latency | Cost | TTL | Survives Navigation |
|-------|-----------|---------|------|-----|-------------------|
| 1 | React state + useMemo | 0ms | Free | Tab lifetime | No |
| 2 | sessionStorage | <1ms | Free | Browser session | Yes (same tab) |
| 3 | localStorage | 1-3ms | Free | Permanent | Yes (cross-session) |
| 4 | ElastiCache Redis | 0.3-1ms | ~$18/month | Configurable | Yes (server-side) |
| 5 | CloudFront edge | <10ms | Near zero | Hours | Yes (public only) |

---

## Data Classification

| Data Type | Read Freq | Write Freq | Staleness OK | Cache Layer |
|-----------|----------|------------|--------------|-------------|
| Chamber messages (current session) | Very high | Medium | No | Layer 2 |
| Grid-IR diagram (current) | High | Low | 5-30s | Layer 2 |
| Bedrock AI responses | Low | Never (immutable) | Yes — forever | Layer 4 |
| Session metadata (title, status) | High | Very low | Seconds | Layer 3 + 4 |
| RAG article context | Medium | Never (user content) | 30 min | Layer 4 |
| User preferences | High | Rare | Days | Layer 3 |
| Tenant config (feature flags) | Very high | Very rare | 15 min | Layer 3 + 4 |
| Grid-IR embeddings (vectors) | Low | Once on save | 7 days | Layer 4 |
| Published article content | Medium | On publish | 1 hour | Layer 5 |
| Category tree | Medium | On admin change | 15 min | Layer 5 |

---

## Layer 1 — React State and Memoisation

Zero infrastructure. Zero cost. Prevents unnecessary re-renders.

```typescript
// Diagram layout — only recompute when Grid-IR structure changes
const { nodes, edges } = useMemo(
  () => gridIRToReactFlow(gridIR),
  [gridIR]
)

// Message list — past messages never re-render
const MessageItem = React.memo(({ message }) => <div>{message.content}</div>)

// Agent selection state — stable references prevent re-instantiation
const [agentState, dispatch] = useReducer(agentReducer, initialAgentState)
```

**Rule:** Every expensive computation in a render function must be memoised.
**Measure:** React DevTools Profiler — no component should re-render > 2x per user action.

---

## Layer 2 — sessionStorage

Persists current work session across navigation within the same browser tab.
Survives route changes. Lost when tab closes.

```typescript
// Keys
const CHAMBER_KEY = (sessionId: string) => `chamber_session_${sessionId}`
const GRID_KEY    = (sessionId: string) => `grid_session_${sessionId}`
const STUDIO_KEY  = (sessionId: string) => `studio_session_${sessionId}`

// Write after every exchange (debounced 500ms)
function saveChumberSession(sessionId: string, messages: Message[]) {
  sessionStorage.setItem(CHAMBER_KEY(sessionId), JSON.stringify({
    messages,
    savedAt: Date.now()
  }))
}

// Read on mount
function restoreChamberSession(sessionId: string): Message[] {
  const raw = sessionStorage.getItem(CHAMBER_KEY(sessionId))
  if (!raw) return []
  const { messages, savedAt } = JSON.parse(raw)
  // Invalidate if older than 4 hours
  if (Date.now() - savedAt > 4 * 60 * 60 * 1000) return []
  return messages
}
```

**Limit:** 5MB per origin. Grid-IR JSON is 5-20KB. Supports ~200 sessions.
**Invalidation:** When Aurora confirms a save, mark entry with syncedAt timestamp.

---

## Layer 3 — localStorage

Persists user preferences and recent sessions list across browser sessions.

```typescript
// Recent sessions (max 20, LRU eviction)
const RECENT_SESSIONS_KEY = 'chiselgrid_recent_sessions'

interface RecentSession {
  id: string
  title: string
  lastAccessed: number
  diagramCount: number
  messageCount: number
}

function addRecentSession(session: RecentSession) {
  const existing: RecentSession[] = JSON.parse(
    localStorage.getItem(RECENT_SESSIONS_KEY) || '[]'
  )
  const updated = [
    session,
    ...existing.filter(s => s.id !== session.id)
  ].slice(0, 20)
  localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(updated))
}

// User preferences
const USER_PREFS_KEY = 'chiselgrid_user_prefs'

interface UserPrefs {
  defaultDiagramType: string
  activeAgents: string[]
  sidebarCollapsed: boolean
  preferredTheme: 'dark' | 'light'
  gridLayout: 'LR' | 'TB'
}

// Tenant config cache (1 hour TTL)
const TENANT_CONFIG_KEY = (tenantId: string) =>
  `chiselgrid_tenant_config_${tenantId}`
```

---

## Layer 4 — ElastiCache Redis (Add in M2)

Server-side shared cache. Required when daily active users reach 10+.
Infrastructure cost: ~$18/month for cache.t3.micro in ap-southeast-1.

### Cache Key Patterns

```
bedrock:{sha256(systemPromptVersion + userMessage)}    TTL: 24h
session:{sessionId}:hydration                          TTL: 5min
tenant:config:{tenantId}                               TTL: 15min
rag:{tenantId}:{sha256(query)}:{abstractionLevel}      TTL: 30min
embedding:{diagramId}:{version}                        TTL: 7d
```

### Bedrock Response Cache (Highest ROI)

```typescript
async function cachedBedrockCall(
  prompt: string,
  systemPrompt: string,
  systemPromptVersion: string
): Promise<string> {
  const key = `bedrock:${sha256(systemPromptVersion + prompt)}`

  const cached = await redis.get(key)
  if (cached) {
    metrics.increment('bedrock.cache.hit')
    return cached
  }

  const response = await invokeModel(systemPrompt, prompt)
  await redis.setex(key, 86400, response)
  metrics.increment('bedrock.cache.miss')
  return response
}
```

Expected hit rate: 15-30% for common architectural patterns.
At 100 diagram generations/day: saves ~$45-90/month in Bedrock costs.
More importantly: 3-8 second calls become <1ms on cache hits.

### Session Hydration Bundle Cache

```typescript
interface SessionHydration {
  messages: Message[]          // last 20 Chamber messages
  diagrams: DiagramMetadata[]  // list of linked Grid diagrams
  documentDraft: object        // Studio document state
  cachedAt: number
}

async function getSessionHydration(
  sessionId: string
): Promise<SessionHydration | null> {
  const key = `session:${sessionId}:hydration`
  const cached = await redis.get(key)
  return cached ? JSON.parse(cached) : null
}

async function setSessionHydration(
  sessionId: string,
  data: SessionHydration
): Promise<void> {
  const key = `session:${sessionId}:hydration`
  await redis.setex(key, 300, JSON.stringify(data)) // 5 min TTL
}
```

Result: Session navigation feels instant (<100ms vs 300-800ms cold).

---

## Layer 5 — CloudFront Edge Cache

Already deployed. Requires only correct Cache-Control headers.

```typescript
// Published articles — 1 hour cache
return NextResponse.json(article, {
  headers: {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=60'
  }
})

// Category tree — 15 minute cache
return NextResponse.json(categories, {
  headers: {
    'Cache-Control': 'public, max-age=900, stale-while-revalidate=60'
  }
})

// Admin routes — NEVER cache
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'private, no-store, no-cache'
  }
})
```

---

## Quality Preservation Rules

### Never Cache
1. Security and compliance agent findings — must be fresh per diagram version
2. BSP/PCI-DSS compliance checks — regulatory rules may be updated
3. Active diagram state during editing — always write-through to sessionStorage
4. Authentication tokens and session cookies
5. Any PII outside encrypted short-TTL keys

### Always Invalidate When
- Grid-IR diagram saved → invalidate `session:{id}:hydration`
- Article approved → invalidate CloudFront article cache via API
- Tenant config changed → immediately delete `tenant:config:{tenantId}`
- Chamber message sent → invalidate `session:{id}:hydration`
- Agent system prompt updated → all `bedrock:*` keys for that agent type

### Cache Busting for AI Responses
Cache key for Bedrock includes the system prompt VERSION hash.
When an agent's system prompt changes, its cache is automatically
invalidated because the key changes. Never use time-based invalidation
alone for AI responses — use content-based keys.

---

## Performance Targets

| Operation | Current | Target (Layers 1-3) | Target (All Layers) |
|-----------|---------|---------------------|---------------------|
| Session navigation | ~500ms | <100ms | <50ms |
| Diagram re-render (pan/zoom) | ~200ms | <16ms (60fps) | <16ms |
| Chamber message send | ~5s | ~5s (Bedrock) | <1s (cache hit) |
| Grid generation (new) | ~5s | ~5s (Bedrock) | <1s (cache hit) |
| Page load (admin) | ~800ms | ~200ms | ~100ms |
| RAG query | ~3s | ~3s | <50ms (cache hit) |
| Tenant config lookup | ~100ms | <2ms (localStorage) | <1ms (Redis) |

---

## Cost Model

| Layer | Monthly Cost | Break-even | ROI |
|-------|-------------|------------|-----|
| Layers 1-3 (browser) | $0 | Immediate | Infinite |
| ElastiCache t3.micro | ~$18 | ~1,200 Bedrock cache hits/month | High at 100+ DAU |
| CloudFront headers | $0 | Immediate | High (already deployed) |

---

## Monitoring

Track these metrics to validate caching effectiveness:

```
bedrock.cache.hit_rate          Target: >20%
bedrock.cache.miss_latency_p99  Target: <8s
bedrock.cache.hit_latency_p99   Target: <5ms
session.hydration.hit_rate      Target: >80%
cloudfront.cache_hit_rate       Target: >60% for articles
```

---

*Last updated: April 2026*
*See CACHING-EPICS.md for implementation tasks.*
