# Frontend UI Refresh + Dark Mode — Design

**Date:** 2026-04-26
**Scope:** Visual refresh of the Angular chat frontend (`/frontend`) with full dark/light mode support. Same information architecture as today; new design tokens, restyled components, theme service, accessibility hardening. Removes the leftover Angular boilerplate in `app.html`.

## Goal

Replace the generic-Material look with a calm, minimal, modern aesthetic that holds up in both color schemes. Improve legibility (the message stream is the product), restraint (one accent, sparse motion), and depth (token-driven surface hierarchy, no drop shadows). Keep Angular Material for component behavior + a11y; restyle through tokens.

## Personality

- Calm minimal (Linear / Notion / Vercel territory). Quiet chrome, confident type, single accent.
- Inspired by — not a copy of — the Taskplus reference shared in brainstorming: app-in-a-card frame, darker surfaces at edges with lighter inward, grayscale chrome, accent reserved for own-message bubbles + primary CTAs + focus.

## Decisions

1. **Implementation approach: Layered tokens.** `mat.theme()` configured with our indigo palette and Inter; on top of it, semantic CSS variables (`--surface-0..2`, `--text-strong/muted/faint`, `--border-subtle/strong`, `--accent`, `--accent-fg`, `--danger`, `--success`) defined in `:root` and overridden under `:where(html.dark)`. Tailwind v4 `@theme inline` exposes these as utilities (`bg-surface-1`, `text-strong`, etc.). Material components inherit from system tokens; our components consume the semantic tokens.
2. **Theme mode: 3-way (light / dark / system).** Default to system on first visit. Persisted to `localStorage`. `system` mode follows OS via `matchMedia('(prefers-color-scheme: dark)')`.
3. **Toggle UI:** `mat-icon-button` in toolbar opens a `mat-menu` with three checked options (Light / Dark / System). Icons: `light_mode`, `dark_mode`, `desktop_windows`.
4. **Typography:** Inter, swapping out the current Roboto. Loaded from Google Fonts in `index.html`. Display 32/38 weight 700 -0.03em; Title 18/24 600 -0.01em; Body 14/20 400; Small 12/16 500. Inter feature flags `cv11 ss01 ss03`.
5. **Accent:** indigo. Light `oklch(55% 0.18 270)`, dark `oklch(68% 0.16 270)` (lifted for AA on dark surfaces).
6. **No shadows.** Depth comes from surface variation + 1px borders. Exception: floating sidenav on small screens (Material default kept).
7. **Motion budget:** sparse. 120/200ms easing `cubic-bezier(.2,.8,.2,1)`. Honors `prefers-reduced-motion`.

## Tokens

### Color (semantic; values flip on `.dark`)

| Token | Light | Dark |
|---|---|---|
| `--surface-0` (page outer) | `oklch(96% 0.003 270)` | `oklch(8% 0.005 270)` |
| `--surface-1` (sidebar) | `oklch(99% 0 0)` | `oklch(12% 0.005 270)` |
| `--surface-1b` (main content) | `oklch(100% 0 0)` | `oklch(15% 0.008 270)` |
| `--surface-2` (cards, received bubbles) | `oklch(98% 0.003 270)` | `oklch(19% 0.01 270)` |
| `--border-subtle` | `oklch(94% 0.005 270)` | `oklch(22% 0.01 270)` |
| `--border-strong` | `oklch(85% 0.008 270)` | `oklch(32% 0.012 270)` |
| `--text-strong` | `oklch(18% 0.01 270)` | `oklch(96% 0.005 270)` |
| `--text-muted` | `oklch(48% 0.012 270)` | `oklch(65% 0.012 270)` |
| `--text-faint` | `oklch(62% 0.01 270)` | `oklch(48% 0.012 270)` |
| `--accent` | `oklch(55% 0.18 270)` | `oklch(68% 0.16 270)` |
| `--accent-fg` | `oklch(99% 0 0)` | `oklch(12% 0.01 270)` |
| `--danger` | `oklch(56% 0.2 25)` | `oklch(68% 0.18 25)` |
| `--success` | `oklch(58% 0.15 155)` | `oklch(70% 0.14 155)` |

### Radii / spacing / motion

- `--radius-xs: 6px`, `--radius-sm: 10px`, `--radius-md: 14px`, `--radius-lg: 18px`, `--radius-2xl: 22px` (app-frame), `--radius-bubble: 18px`.
- Spacing: standardize on 4 / 8 / 12 / 16 / 24 / 32 px Tailwind units. No arbitrary values.
- `--ease-out: cubic-bezier(.2,.8,.2,1)`; `--dur-fast: 120ms`; `--dur-base: 200ms`.

## Architecture

### `ThemeService` (`/frontend/src/app/theme/theme.service.ts`, root-provided)

```ts
type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

readonly mode: WritableSignal<ThemeMode>;
readonly resolved: Signal<ResolvedTheme>; // computed from mode + system
setMode(m: ThemeMode): void;
```

- SSR-safe: guards `localStorage` and `matchMedia` with `isPlatformBrowser`.
- Effects: (1) toggle `html.dark` class + `style.colorScheme`; (2) persist to `localStorage`.
- `mql.addEventListener('change', ...)` updates a `systemPrefersDark` signal.

### FOUC prevention

Inline script in `index.html` `<head>` (sync, ~10 lines): reads `localStorage['theme-mode']`, falls back to system, sets `html.dark` + `colorScheme` before stylesheets paint.

### Tailwind v4 config (in `styles.css`)

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
@theme inline {
  --color-surface-0: var(--surface-0);
  /* ...etc for each token */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --radius-bubble: var(--radius-bubble);
}
```

### Material theming (in `material-theme.scss`)

- Single `mat.theme()` call with a custom indigo palette + Inter typography.
- Under `:where(html.dark)` re-apply with M3 dark color overrides so `--mat-sys-*` tokens flip.
- Our semantic tokens are defined at `:root` with `.dark` override block (separate from Material's, but kept consistent).

## Page-by-page changes

### Onboarding (`/onboarding`)
- Centered minimal panel, not `mat-card`: `bg-surface-1` `border border-subtle` `rounded-lg` `p-8`, max-width 400px, no shadow.
- Above form: 40×40 monogram square (`bg-accent text-accent-fg rounded-md`).
- Heading: "Welcome to Chat 👋" (display, 32/38, weight 700, -0.03em).
- Sub-copy: "Pick a display name to get started" in `text-muted`.
- Single `mat-form-field` outline; helper text "This is how others will see you."
- Submit: full-width primary, 44px tall, `rounded-md`, label "Enter chat ›".
- Entrance: 300ms `opacity 0→1 + translateY 4px→0`.

### Shell (`/`)
- **App-in-a-card frame** on desktop: outer body `bg-surface-0`, inner shell `m-3 rounded-2xl border border-subtle overflow-hidden bg-surface-1b`. Mobile: full-bleed.
- **Header (56px):** custom, replaces `mat-toolbar color="primary"`. `bg-surface-1 border-b border-subtle`. Left: monogram + app name in title weight. Right: theme-mode menu trigger, user pill (`bg-surface-2` with name + 6px presence dot), hamburger on small screens only.
- **Sidenav (264px):** `bg-surface-1 border-r border-subtle`, no shadow on desktop.
  - "Rooms" header (small `tag` icon + label in title weight) + ghost `+` button (28×28, `text-muted` → `text-strong` on hover, no fill).
  - Room items 40px tall, `rounded-md`, `px-3`. Hover `bg-surface-2`. Active `bg-surface-2 + border-subtle + text-strong + aria-current="page"` (no accent — restraint).
  - `#` glyph in `text-faint` precedes name.
  - Delete button reveals on hover OR focus-visible (keyboard a11y).
  - 1px `border-subtle` divider below room list — establishes architecture for a future bottom-group slot.
- **New-room inline form:** `mat-form-field` outline restyled to our tokens. "Create room ›" primary button.
- **Empty rooms state:** `text-muted` copy + accent link.

### Room (`/rooms/:id`)
- **Header (56px):** small `chat_bubble_outline` icon + room name in title weight. Right side: "{n} online" `text-muted` + 6px green presence dot. `border-b border-subtle`.
- **Message list:**
  - Vertical rhythm: 4px between same-author messages, 16px between groups.
  - **Group collapse:** only the first message of a sender group shows the author label (above bubble) and timestamp; subsequent messages hide both.
  - `role="log" aria-live="polite" aria-relevant="additions"`.
- **Bubbles:**
  - Own: `bg-accent text-accent-fg` `rounded-bubble` `rounded-br-sm`. Right-aligned.
  - Others: `bg-surface-2 text-strong` `rounded-bubble` `rounded-bl-sm`. Left-aligned.
  - Author name (others, first-in-group only): 12/16 weight 500 `text-muted`, sits *above* the bubble.
  - Timestamp: hover-shown for non-last, always shown for last-in-group, 11px `text-faint`.
  - Max-width 65ch.
- **Composer:** single rounded surface (`bg-surface-1 border border-subtle rounded-lg`), focus ring `--accent`. Textarea autosize 1–5 rows. Send button: filled accent circle 36×36, only enabled with text. Composer wrapper has `border-t border-subtle`.
- **Typing indicator:** three CSS-animated dots + names in `text-muted`. Above composer. Reduced-motion: replaced with static "…".

### Empty room state
- Drop the 💬. Replace with `chat_bubble_outline` 32px in `text-faint`, copy "Pick a room to start chatting" in `text-muted`, accent link below: "or create a new one →".

### Connection banner
- Re-architected as a top-center toast pill (not a full-width strip): 36px tall, `bg-surface-1 border border-subtle rounded-full px-4`, colored dot (amber `--success`/`--danger`-tinted) + text. 200ms slide-down + fade. Doesn't push content. `role="status" aria-live="polite"`.

## Buttons (signature)

- **Primary:** `bg-accent text-accent-fg rounded-md`, 44px tall, weight 600. Subtle inset top highlight `box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.08)`. Trailing chevron `›` for forward CTAs (Enter chat, Create room, Send).
- **Ghost icon:** 28×28 or 36×36, `text-muted` → `text-strong` on hover, `bg-surface-2` on hover, `rounded-sm`.
- **Danger ghost (delete room):** `text-muted` → `text-danger` on hover.

## Motion

- Theme swap: 200ms `background-color`/`color` transition on `body` only.
- New incoming messages: 180ms fade + translateY 4px.
- Sidenav hover: 120ms `bg`.
- Connection toast: 200ms slide+fade.
- Typing dots: 1.4s staggered loop.
- Global `prefers-reduced-motion: reduce` rule kills non-essential transitions.

## Accessibility

- WCAG AA contrast on every text/bg pair (palette tuned for this).
- Focus-visible: 2px `--accent` outline, 2px offset, on every interactive element. Material's where present, explicit on custom.
- Theme menu: full keyboard nav via `mat-menu`. Trigger `aria-label="Theme: {current}"`.
- Live regions: connection banner (`role="status"`), typing indicator (`aria-live="polite"`, debounced), message list (`role="log" aria-relevant="additions"`).
- Skip-link "Skip to messages" appears on focus.
- Sidebar: `role="navigation" aria-label="Rooms"`, active item `aria-current="page"`.
- Each message bubble `<article>` with `aria-label="{user} at {time}: {text}"`.
- `forced-colors` mode: don't rely solely on background color for state — borders + text reinforce.

## Out of scope

- Avatars (no avatar service / generation strategy yet).
- Message reactions, threads.
- Settings page beyond the theme toggle.
- Notification sounds, desktop notifications.
- Internationalization.

## Verification (before claiming done)

- `pnpm --filter frontend build` — clean, no new warnings.
- `pnpm --filter frontend test` — clean.
- Manual smoke in browser, both modes, both screen sizes (≥1024 desktop, ≤640 mobile):
  - onboarding → enter name → shell loads
  - create room → switch rooms → send/receive → typing indicator → delete room → redirect
  - cycle theme through Light / Dark / System; reload preserves; OS-level toggle flips when in System
  - keyboard tab through every screen; focus ring visible; menus open via keyboard
  - throttle network to verify connection toast
  - DevTools `prefers-reduced-motion: reduce` → animations disabled
- axe DevTools scan: 0 serious/critical violations.
- Manual contrast spot-check on accent-on-surface and `text-muted`-on-surface for both modes.
