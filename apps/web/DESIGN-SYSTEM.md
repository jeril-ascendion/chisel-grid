# ChiselGrid Design System

> **Source of truth for all UI work in `apps/web` and `packages/ui`.**
> Before touching any UI component, read this document and ensure the change
> follows the tokens, patterns, and accessibility requirements below.

---

## 1. Design Principles

ChiselGrid's interface is **minimal, functional, and deliberately undecorated** —
inspired by the Claude Code visual language. Every pixel earns its place by
serving the user's task, not by decorating the screen.

### Visual stance
- **Calm by default.** Content is the hero. Chrome recedes.
- **Sharp over soft.** Prefer crisp 1px borders over heavy shadows.
- **Type-driven hierarchy.** Use weight and size before color and decoration.
- **Monospace where it matters.** Code, IDs, paths, and diagrams are mono.
- **Restrained color.** A single accent (terracotta) plus semantic status colors.
- **No gradients, no glassmorphism, no decorative illustration** unless it
  carries information.

### UX Laws applied (https://lawsofux.com)

| Law | Application in ChiselGrid |
|---|---|
| **Hick's Law** — decision time grows with options | Toolbars max 5 items per group; overflow into a `…` menu. Settings split into tabs of ≤7 fields. Primary actions never compete with secondary. |
| **Fitts's Law** — target size and distance | Touch targets ≥ 44×44 px. Primary CTAs ≥ 32 px tall. Toggles for sidebar/chat panel pinned to fixed positions so users build muscle memory. |
| **Jakob's Law** — users expect familiar patterns | Sidebar left, content center, chat right (Cursor/Claude Code/Linear convention). `Cmd+K` opens command palette. `/` focuses search. `Esc` closes overlays. |
| **Miller's Law** — 7±2 chunks of working memory | Navigation grouped into ≤7 sections. Forms split when they exceed 7 fields. Article cards display ≤5 metadata items. |
| **Aesthetic-Usability Effect** — perceived ease tracks visual quality | Type, spacing, and alignment treated as features, not polish. Every screen passes a 1px-grid alignment check before merge. |
| **Law of Proximity** — related items are grouped | Related controls share a container with 8–12 px internal spacing; unrelated groups separated by ≥24 px or a divider. |
| **Law of Common Region** — shared boundaries imply grouping | Cards, panels, and toolbar groups use a single 1 px border or `--bg-elevated` surface to define group boundaries — never both. |
| **Doherty Threshold** — < 400 ms response keeps users engaged | Optimistic UI on all writes. Skeletons within 100 ms. Full content within 1 s on the demo path. |
| **Tesler's Law** — irreducible complexity must live somewhere | The system absorbs it (smart defaults, AI summaries, sensible empty states), not the user. |

### Accessibility stance — WCAG 2.1 AA minimum
ChiselGrid is built for engineering organizations; an inaccessible CMS is a
broken CMS. **AA is the floor, not the ceiling.**

---

## 2. Design Tokens

### 2.1 Typography

```
Font family: "IBM Plex Sans", system-ui, sans-serif        /* UI */
             "IBM Plex Mono", ui-monospace, monospace      /* Code, IDs, paths */

Type scale (px):
  11   — micro (timestamps, badges, helper text)
  12   — caption (table footers, breadcrumbs)
  13   — small (secondary body, dense tables)
  14   — body (default)
  16   — body-lg (article body, dialog text)
  18   — heading-sm (card titles, section headers)
  24   — heading-md (page sub-titles)
  32   — heading-lg (page titles, hero)

Weight:
  400 — body
  500 — label, button, emphasis
  600 — heading

Line-height:
  1.2  — heading
  1.4  — body / UI
  1.6  — long-form article body
```

**Rules**
- Never use weight 700+ — heaviness conflicts with the minimal stance.
- Never use `text-transform: uppercase` outside badges.
- Article body uses 16 / 1.6 with `max-width: 72ch` for readability.
- Code and inline `<code>` always use IBM Plex Mono.

### 2.2 Color — Dark mode (primary)

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#0F0F0F` | Page background |
| `--bg-elevated` | `#161616` | Cards, panels, sidebar |
| `--bg-surface` | `#1E1E1E` | Inputs, hover states, code blocks |
| `--border-subtle` | `#2A2A2A` | Dividers, table rows |
| `--border-default` | `#3A3A3A` | Inputs, cards, default borders |
| `--border-strong` | `#4A4A4A` | Focused inputs, emphasized borders |
| `--text-primary` | `#FFFFFF` | Headings, body |
| `--text-secondary` | `#A0A0A0` | Metadata, captions |
| `--text-tertiary` | `#606060` | Disabled, placeholders, helper text |
| `--accent` | `#C96330` | Primary CTA — Ascendion terracotta |
| `--success` | `#22C55E` | Success state, published badge |
| `--warning` | `#F59E0B` | Warning state, in-review badge |
| `--error` | `#EF4444` | Destructive action, error state |
| `--info` | `#3B82F6` | Info banners, links |

### 2.3 Color — Light mode

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#FFFFFF` | Page background |
| `--bg-elevated` | `#F8F8F8` | Cards, panels, sidebar |
| `--bg-surface` | `#F0F0F0` | Inputs, hover states, code blocks |
| `--border-subtle` | `#E5E5E5` | Dividers |
| `--border-default` | `#D0D0D0` | Inputs, cards |
| `--border-strong` | `#B0B0B0` | Focused inputs |
| `--text-primary` | `#0F0F0F` | Headings, body |
| `--text-secondary` | `#505050` | Metadata, captions |
| `--text-tertiary` | `#909090` | Disabled, placeholders |
| `--accent` | `#C96330` | Primary CTA (same — terracotta works in both) |
| `--success` / `--warning` / `--error` / `--info` | unchanged | Same as dark |

**Contrast verification (WCAG AA, 4.5:1 minimum for body text):**
- Dark `#FFFFFF` on `#0F0F0F` → 19.6:1 ✅
- Dark `#A0A0A0` on `#0F0F0F` → 8.6:1 ✅
- Light `#0F0F0F` on `#FFFFFF` → 19.6:1 ✅
- Light `#505050` on `#FFFFFF` → 8.0:1 ✅
- Accent `#C96330` on dark `#0F0F0F` → 4.7:1 ✅ (use weight 500+ for body)
- Accent `#C96330` on light `#FFFFFF` → 4.5:1 ✅ (borderline — reserve for buttons/CTAs, not body text)

### 2.4 Spacing (4 px base)

```
4   8   12   16   20   24   32   40   48   64
```

**Rules**
- Never use values outside the scale.
- Default gap between unrelated groups: 24 px.
- Default gap inside a group: 8 px or 12 px.
- Section padding (page-level): 32 px desktop, 16 px mobile.

### 2.5 Border radius

| Token | Value | Use |
|---|---|---|
| `--radius-none` | `0px` | Diagrams, code blocks, data tables |
| `--radius-sm` | `4px` | Inputs, badges, small buttons |
| `--radius-md` | `8px` | Cards, panels, dropdowns |
| `--radius-lg` | `12px` | Modals, drawers, popovers |
| `--radius-full` | `9999px` | Pills, toggles, avatars |

### 2.6 Shadows (dark mode)

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle elevation (hover on cards) |
| `--shadow-md` | `0 4px 8px rgba(0,0,0,0.5)` | Dropdowns, popovers |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.6)` | Modals, drawers |

For light mode, shadows are softer: `rgba(15,15,15,0.06 / 0.10 / 0.14)`.

**Rule:** Prefer borders over shadows. Use shadow only when an element floats
above non-related content (modals, dropdowns).

### 2.7 Z-index scale

| Token | Value | Use |
|---|---|---|
| Base | `0` | Default flow |
| Raised | `10` | Sticky toolbars, sidebar |
| Overlay | `100` | Dropdowns, popovers |
| Modal | `200` | Dialogs, drawers, modal backdrop |
| Toast | `300` | Toast notifications |
| Tooltip | `400` | Tooltips (always on top) |

Never use arbitrary z-index values. If a new layer is needed, propose an
addition to this scale.

### 2.8 Motion

```
--duration-fast:   100ms     /* state changes (hover, focus) */
--duration-base:   200ms     /* panel collapse, drawer open */
--duration-slow:   300ms     /* page transitions */
--ease-out:        cubic-bezier(0.16, 1, 0.3, 1)
```

**Rule:** Respect `prefers-reduced-motion: reduce`. All non-essential motion
must be disabled or reduced when this media query matches.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 3. Component Patterns

### 3.1 Sidebar (left navigation)

```
Width:        240px expanded, 0px collapsed
Background:   --bg-elevated
Border-right: 1px solid --border-subtle
Transition:   width 200ms ease-out
```

- **Toggle button:** 32×32 px, fixed at top-left (16 px from edge), `z-index: Raised`.
- **Toggle button is ALWAYS visible** regardless of scroll position. Never hide it.
- **Touch target:** 44×44 px minimum (use padding to expand hit area).
- **Aria:** `aria-expanded`, `aria-controls="sidebar-nav"`, label "Toggle navigation".
- **Keyboard:** Toggle on `Cmd/Ctrl + B`.

Navigation groups follow Miller's Law — max 7 top-level items.

### 3.2 Split panel (Chamber / Grid / Studio)

The three-pane layout used across the AI workspace, content editor, and Forge.

```
┌──────────┬─────────────────────────┬──────────────┐
│          │                         │              │
│ Sidebar  │   Canvas (flex-1)       │   Chat       │
│ 240px    │   (fills remaining)     │   380px      │
│          │                         │   collapsible│
└──────────┴─────────────────────────┴──────────────┘
```

- **Canvas panel:** `flex: 1`, fills remaining space.
- **Chat panel:** 380 px wide, collapsible to 0.
- **Toggle button:** fixed at vertical center of the split line.
  - Icon: `ChevronLeft` / `ChevronRight`, 24×24 px.
  - Touch target: 44×44 px minimum.
  - Background: `--bg-elevated`, border 1px `--border-default`, radius `--radius-full`.
- **Animation:** width 200 ms ease-out.
- **Keyboard:** `Cmd/Ctrl + J` toggles chat panel.

### 3.3 Toolbar (Grid Architecture, editor, etc.)

```
Height:        48px
Background:    --bg-elevated
Border-bottom: 1px solid --border-subtle
Padding:       0 16px
```

- **Groups separated by 1 px divider** (`--border-subtle`), 12 px gap each side of divider.
- **Each group max 5 items** (Hick's Law).
- **Overflow** moves into a `…` menu — never wrap onto a second row.
- **Keyboard navigable** — `Tab` cycles through items, `Arrow` keys within a group.
- **Aria:** `role="toolbar"`, `aria-orientation="horizontal"`, group labels.

### 3.4 Buttons

All buttons share these base properties:

```
min-height:    32px
padding:       8px 16px
border-radius: --radius-sm
font-weight:   500
font-size:     14px
transition:    background 100ms ease-out, border 100ms ease-out
```

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| **Primary** | `--accent` | `#FFFFFF` | none | `brightness(1.10)` |
| **Secondary** | `transparent` | `--text-primary` | `1px solid --border-default` | `bg: --bg-surface` |
| **Ghost** | `transparent` | `--text-primary` | none | `bg: --bg-surface` |
| **Danger** | `--error` | `#FFFFFF` | none | `brightness(1.10)` |

**Icon-only button:** 32×32 px visual, **44×44 px touch target via padding**.
Always include `aria-label`.

**Disabled:** `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`.

### 3.5 Inputs

```
height:         36px
padding:        0 12px
border:         1px solid --border-default
border-radius:  --radius-sm
background:     --bg-surface
color:          --text-primary
font-size:      14px
```

**Focus state (Fitts's Law + accessibility):**
```
outline:        2px solid --accent
outline-offset: 2px
border-color:   --border-strong
```

- **Placeholder:** `color: --text-tertiary`.
- **Disabled:** `opacity: 0.5`, `bg: --bg-elevated`.
- **Error:** `border: 1px solid --error`, helper text below in `--error`.
- **Required fields:** marked with `*` after label, also `aria-required="true"`.

**Textarea:** same as input but `min-height: 96px`, `resize: vertical`.

**Select / dropdown:** same as input, with chevron icon 16×16 px on the right.

### 3.6 Badges / Pills (content type tags)

```
height:        20px
padding:       0 8px
border-radius: --radius-full
font-size:     11px
font-weight:   500
text-transform: none      /* Plex's character is in lowercase */
```

| Type | Background | Text | Border |
|---|---|---|---|
| **Article** | `rgb(59 130 246 / 0.10)` | `#60A5FA` | `1px solid rgb(59 130 246 / 0.20)` |
| **ADR** | `rgb(139 92 246 / 0.10)` | `#A78BFA` | `1px solid rgb(139 92 246 / 0.20)` |
| **Diagram** | `rgb(249 115 22 / 0.10)` | `#FB923C` | `1px solid rgb(249 115 22 / 0.20)` |
| **Decision** | `rgb(34 197 94 / 0.10)` | `#4ADE80` | `1px solid rgb(34 197 94 / 0.20)` |
| **Runbook** | `rgb(234 179 8 / 0.10)` | `#FACC15` | `1px solid rgb(234 179 8 / 0.20)` |

### 3.7 Cards

```
background:    --bg-elevated
border:        1px solid --border-subtle
border-radius: --radius-md
padding:       16px (compact) | 24px (default)
```

- Hover state: `border-color: --border-default`, optional `--shadow-sm`.
- Never combine border + shadow + alternative background — pick one cue.
- Card title: 16 px / 600. Card body: 14 px / 400.

### 3.8 Tables

```
font-size:        13px
border-collapse:  collapse
```

- **Header row:** `bg: --bg-elevated`, weight 500, padding 12 px 16 px.
- **Body rows:** padding 12 px 16 px, border-bottom 1 px `--border-subtle`.
- **Hover:** `bg: --bg-surface`.
- **Sticky header** when table exceeds viewport.
- **Selected row:** left-border 2 px `--accent`.
- Numeric columns right-aligned. ID/path columns use IBM Plex Mono.

### 3.9 Toast notifications

```
position:        fixed; bottom: 16px; right: 16px;
width:           320px max
background:      --bg-elevated
border:          1px solid --border-default
border-radius:   --radius-md
box-shadow:      --shadow-md
padding:         12px 16px
z-index:         300
```

- **Auto-dismiss:** 4 s, **persists on hover** (Doherty + accessibility).
- **Stack:** max 3 visible; older toasts collapse into a counter.
- **Aria:** `role="status"` for info/success, `role="alert"` for warning/error.
- **Live region:** parent container has `aria-live="polite"`.
- **Dismiss button:** 24×24 px, `aria-label="Dismiss notification"`.

### 3.10 Modals / drawers

- **Backdrop:** `rgba(0,0,0,0.6)`, blur disabled (perf).
- **Modal:** centered, `max-width: 560px`, `border-radius: --radius-lg`, `--shadow-lg`.
- **Drawer:** right-anchored, `width: 480px`, full height.
- **Focus trap** while open. **Esc** closes.
- **Initial focus** on first interactive element (or close button if none).
- **Return focus** to triggering element on close.
- Body scroll locked while open.

### 3.11 Tooltips

- Triggered by hover (≥ 500 ms) or focus.
- 11 px text, padding 6 px 8 px, `bg: #000`, white text, `--radius-sm`.
- Positioned with 8 px offset from trigger.
- Never the only carrier of essential info — content must also exist in `aria-label` or visible text.

### 3.12 Empty states

Never show a blank canvas. Empty states must include:
1. A single sentence explaining what should be here.
2. A primary action to populate it (or an explanation if not actionable).
3. Optional muted illustration (line-only, 1 px stroke, no fill).

### 3.13 Loading states

- **Skeleton** within 100 ms for content blocks.
- **Spinner** only for sub-second actions inside buttons (replace label).
- **Aria:** `aria-busy="true"` on the loading region; `aria-live="polite"` for async updates.

---

## 4. Layout & Responsive

### 4.1 Breakpoints

```
sm:  640px
md:  768px    /* sidebar collapses by default below md */
lg:  1024px
xl:  1280px
2xl: 1536px
```

### 4.2 Container widths

- **Article body:** `max-width: 72ch` (≈ 720 px) — optimal reading measure.
- **Admin pages:** `max-width: 1280px`, padding 32 px desktop / 16 px mobile.
- **Workspace / Chamber / Forge:** full viewport, no max-width.

### 4.3 Grid

- 12-column grid for marketing pages; 16 px gutters mobile, 24 px gutters desktop.
- Admin uses CSS Grid `auto-fit, minmax(280px, 1fr)` for card lists.

---

## 5. Accessibility Requirements

This section is **mandatory** for every PR touching UI. Treat it as a checklist.

### 5.1 Color & contrast (WCAG 2.1 AA)
- ☐ Body text contrast ≥ 4.5:1.
- ☐ Large text (18 px+ or 14 px+ bold) contrast ≥ 3:1.
- ☐ UI components and graphical objects ≥ 3:1 against adjacent colors.
- ☐ Color is never the **only** indicator of state — pair with icon, text, or pattern.

### 5.2 Focus
- ☐ Every interactive element has a `:focus-visible` ring (2 px `--accent`, 2 px offset).
- ☐ No `outline: none` without an equivalent replacement.
- ☐ Focus order matches visual order.
- ☐ Skip-to-content link on every page.

### 5.3 Touch & pointer
- ☐ Touch targets ≥ 44×44 px (WCAG 2.5.5 AAA recommendation, treated as floor).
- ☐ Spacing between adjacent targets ≥ 8 px.

### 5.4 Keyboard
- ☐ Every feature reachable by keyboard alone.
- ☐ `Tab` moves forward, `Shift+Tab` backward, `Esc` closes overlays.
- ☐ Custom controls implement WAI-ARIA Authoring Practices keyboard model.
- ☐ No keyboard traps (except intentional focus traps in modals, which release on close).

### 5.5 Screen readers
- ☐ Every icon-only button has `aria-label`.
- ☐ Decorative icons have `aria-hidden="true"`.
- ☐ Form fields have associated `<label>` (or `aria-label` / `aria-labelledby`).
- ☐ Errors associated via `aria-describedby` and `aria-invalid="true"`.
- ☐ Async content uses `aria-live="polite"` (non-urgent) or `"assertive"` (urgent).
- ☐ Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` used semantically.
- ☐ Headings are sequential — no jumping h2 → h4.

### 5.6 Motion
- ☐ Honor `prefers-reduced-motion: reduce`.
- ☐ No flashing > 3 times per second.
- ☐ Auto-playing motion can be paused.

### 5.7 Loading & async
- ☐ Loading regions have `aria-busy="true"`.
- ☐ Toast notifications use appropriate `role` and `aria-live`.

### 5.8 Forms
- ☐ Required fields marked visually **and** with `aria-required="true"`.
- ☐ Inline validation on blur, not on every keystroke.
- ☐ Error summary at top of long forms with anchor links to fields.

---

## 6. CSS Custom Properties

These tokens MUST be defined in `apps/web/src/app/globals.css` and used
throughout the app. Do not hard-code colors, spacing, or radii in components —
always reference the variable.

```css
:root {
  /* Dark mode — primary */
  --bg-base:       #0F0F0F;
  --bg-elevated:   #161616;
  --bg-surface:    #1E1E1E;

  --border-subtle:  #2A2A2A;
  --border-default: #3A3A3A;
  --border-strong:  #4A4A4A;

  --text-primary:   #FFFFFF;
  --text-secondary: #A0A0A0;
  --text-tertiary:  #606060;

  --accent:   #C96330;
  --success:  #22C55E;
  --warning:  #F59E0B;
  --error:    #EF4444;
  --info:     #3B82F6;

  --radius-none: 0px;
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.6);

  --sidebar-width:     240px;
  --chat-panel-width:  380px;
  --toolbar-height:    48px;

  --duration-fast: 100ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);

  --z-base:    0;
  --z-raised:  10;
  --z-overlay: 100;
  --z-modal:   200;
  --z-toast:   300;
  --z-tooltip: 400;
}

[data-theme="light"] {
  --bg-base:       #FFFFFF;
  --bg-elevated:   #F8F8F8;
  --bg-surface:    #F0F0F0;

  --border-subtle:  #E5E5E5;
  --border-default: #D0D0D0;
  --border-strong:  #B0B0B0;

  --text-primary:   #0F0F0F;
  --text-secondary: #505050;
  --text-tertiary:  #909090;

  --shadow-sm: 0 1px 2px rgba(15, 15, 15, 0.06);
  --shadow-md: 0 4px 8px rgba(15, 15, 15, 0.10);
  --shadow-lg: 0 8px 24px rgba(15, 15, 15, 0.14);

  /* accent / status colors unchanged */
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Theme switching
- Default: dark mode.
- Toggle stored in `localStorage` under `chiselgrid-theme`.
- Applied via `data-theme="light"` on `<html>`.
- System preference (`prefers-color-scheme`) used on first visit.

---

## 7. Voice & Tone (UI copy)

- **Direct.** "Publish" not "Click here to publish".
- **Active voice.** "Your article was saved" not "The article has been saved".
- **No exclamation marks** unless conveying real urgency.
- **Sentence case** for buttons, labels, and headings — not Title Case.
- **No emoji** in UI chrome. Status icons only.
- **Errors are specific and actionable.** Not "Something went wrong" —
  "Couldn't save: Aurora connection timed out. Retry?".

---

## 8. Iconography

- **Library:** `lucide-react` (consistent stroke, neutral style).
- **Stroke width:** 1.5 px (default 2 px is too heavy for our minimal stance).
- **Sizes:** 16 px (inline), 20 px (buttons), 24 px (toolbar), 32 px (large UI).
- **Color:** inherits `currentColor` — never hard-coded.
- Decorative: `aria-hidden="true"`. Functional: paired with `aria-label`.

---

## 9. CLAUDE CODE RULE

**Before touching any UI component, read `apps/web/DESIGN-SYSTEM.md` and ensure
the change follows the tokens, patterns, and accessibility requirements above.**

This means:
1. No hard-coded colors, spacing, radii, or font sizes — use tokens.
2. No new component variants without checking §3 first.
3. No accessibility regressions — run §5 checklist on every PR.
4. No new motion without honoring `prefers-reduced-motion`.
5. No new z-index values outside the §2.7 scale.
6. When in doubt, match Claude Code, Linear, or Cursor — not Material, Bootstrap, or Tailwind defaults.

---

*Owner: Jeril Panicker*
*Last reviewed: 2026-04-25*
*Companion docs: `CLAUDE.md` (project rules), `ROADMAP.md` (milestones)*
