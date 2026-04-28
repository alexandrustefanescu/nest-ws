# Discord-style Layout Design

## Goal

Reorganise the chat app shell and room layout to match Discord's structure while keeping default Angular Material styling throughout.

## Current Problems

- Two stacked `mat-toolbar` components (global app bar + room bar) waste vertical space and look nothing like a chat app.
- User identity and theme toggle live in the global top bar rather than a contextual sidebar zone.
- The members sidebar uses a manual fixed-overlay approach instead of a proper Material drawer.

## Layout Overview

```
┌─────────────────────────────────────────────────┐
│  Sidenav (260px)  │  Room content area           │
│ ─────────────────  │ ─────────────────────────── │
│  [App toolbar]    │  [Room toolbar]               │
│                   │                               │
│  Rooms label + +  │  Messages (scrollable)        │
│  ─ general        │                               │
│  ─ random         │  Typing indicator             │
│  ─ …              │  Composer                     │
│                   ├───────────────────────────────┤
│  [User panel]     │  Members drawer (end, 280px)  │
└─────────────────────────────────────────────────┘
```

## Shell (`shell.html` / `shell.ts`)

- **Remove** the global `mat-toolbar` at the top of the shell.
- `mat-sidenav-container` becomes the root element, filling `100dvh`.
- The `mat-sidenav` (left, `260px`, `mode="side"` on desktop / `mode="over"` on mobile) contains three zones:
  1. **Top** — `mat-toolbar` with `mat-icon` (chat) + app name "Chat Prototype".
  2. **Middle** — row with "Rooms" label + add `mat-icon-button`; `mat-nav-list` of rooms (flex-1, overflow-y-auto); new-room `mat-form-field` + create button when expanded.
  3. **Bottom** — `mat-divider` + a `mat-list-item` showing: avatar initial div, username `matListItemTitle`, theme `mat-icon-button` as `matListItemMeta`.
- `mat-sidenav-content` holds `<router-outlet>`.
- The hamburger menu button (mobile only) moves to the **room toolbar**, not the shell toolbar.

## Room (`room.html` / `room.ts`)

- Room host becomes a full-height `mat-drawer-container` (replacing the raw flex div).
- `mat-drawer` at `position="end"`, `mode="side"` on desktop / `mode="over"` on mobile, default open on desktop — replaces the current fixed-overlay members panel.
- `mat-drawer-content` is a flex column:
  1. `mat-toolbar` — hamburger (mobile only, toggles the shell sidenav via an `@Input` or service), `#room-name`, online chip, members-toggle `mat-icon-button`, more-vert menu.
  2. Scrollable message list (flex-1).
  3. Typing indicator.
  4. Composer.
- `UsersSidebar` component renders inside the `mat-drawer` directly (no backdrop overlay div needed — the drawer handles it).

## Members Sidebar (`users-sidebar.html` / `users-sidebar.ts`)

- Remove the manual backdrop `<div>` and fixed positioning — the `mat-drawer` handles this.
- Keep `mat-toolbar` header + `mat-list` of users unchanged.
- Remove `closeRequested` output (drawer close is handled by the parent room via `MatDrawer` reference).

## Shell ↔ Room communication (mobile hamburger)

The room toolbar needs to toggle the shell's sidenav on mobile. Two options:
- **Preferred**: expose `sidenav` as a signal/service from `Shell`, inject in `Room`. Simpler: pass an `@Output` up through the router — too complex.
- **Actual approach**: use a shared `ChatSocket`-adjacent `UiStateService` with a `toggleSidenav()` call, OR emit via a simple `Subject` in a `ShellUiService`. The shell listens and calls `sidenav.toggle()`.

## Files Changed

| File | Change |
|------|--------|
| `shell.html` | Remove top toolbar; restructure sidenav with 3 zones |
| `shell.ts` | Remove toolbar imports; add hamburger toggle logic |
| `room.html` | Wrap in `mat-drawer-container`; move hamburger here |
| `room.ts` | Add `MatDrawerModule`; wire members drawer |
| `users-sidebar.html` | Remove backdrop div and fixed positioning |
| `users-sidebar.ts` | Remove `closeRequested` output |
| New: `shell-ui.service.ts` | Tiny service for sidenav toggle signal |
