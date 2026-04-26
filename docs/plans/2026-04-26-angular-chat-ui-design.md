# Angular 21 Chat UI — Design

**Date:** 2026-04-26
**Scope:** Angular 21 frontend (Material + Tailwind) connecting to the existing NestJS Socket.IO chat API at `ws://localhost:3000`.

## Context

- Backend is a Socket.IO chat server with rooms, messages, typing indicators, and presence. No auth, no message history replay on join. Events documented in `src/dto/ws-events.dto.ts` and `src/controllers/ws-docs.controller.ts`.
- Frontend is a fresh Angular 21 standalone-components app with Material 3 (azure palette), Tailwind v4, Vitest, SSR, and the project's AGENTS.md conventions (signals, OnPush, native control flow, lazy loading).

## Decisions

1. **Identity** — simple name prompt on first visit, persisted in `localStorage` as `userId`. No login screen.
2. **Layout** — routed per-room (`/rooms/:id` lazy-loaded), collapsible Material sidenav.
3. **WebSocket client** — single `ChatSocketService` (`providedIn: 'root'`) wrapping `socket.io-client`, exposing signals.
4. **Message history** — none (matches API). Messages appear from join forward.
5. **Connection UX** — full-width banner on disconnect/reconnect; composer disables when offline.

## Architecture

```
app.ts (root)
└── ShellPage (route: '', identityGuard)
    ├── mat-toolbar (title, connection dot, current user)
    ├── connection-banner (when state ≠ connected)
    └── mat-sidenav-container
        ├── mat-sidenav: rooms list (mat-nav-list)
        └── <router-outlet/>
            ├── EmptyRoomPage   (path: '')
            └── RoomPage        (path: 'rooms/:id', lazy)

OnboardingPage (route: 'onboarding')
```

## Services

### ChatSocketService (providedIn: 'root')

Owns the Socket.IO connection. State:

```ts
connectionState: signal<'connecting' | 'connected' | 'disconnected'>
rooms: signal<Room[]>
currentRoomId: signal<number | null>
roomUsers: signal<Record<number, RoomUser[]>>
roomMessages: signal<Record<number, Message[]>>
typingUsers: signal<Record<number, Set<string>>>
```

Methods: `joinRoom(id)`, `leaveRoom(id)`, `sendMessage(id, text)`, `typingStart(id)`, `typingStop(id)`.

Wiring:
- Constructs `io(environment.wsUrl, { autoConnect: true })`.
- Listens to `connect`, `disconnect`, `reconnect_attempt` → updates `connectionState`.
- Listens to `rooms:list`, `users:list`, `message:new`, `user:typing`, `user:typing-stopped`, `user:joined`, `user:left` → updates keyed signals.
- Pulls `userId` from `IdentityService` at emit time.
- Typing debounce: emits `typingStart` only on transition; auto-fires `typingStop` after 3s of inactivity (safely under backend 5s expiry).
- Does not clear messages/rooms on disconnect — keeps last-known state visible.
- On reconnect, re-issues `joinRoom(currentRoomId)` if set.

### IdentityService (providedIn: 'root')

`userId: signal<string>` backed by localStorage. Methods: `setUserId(name)`, `clear()`.

### identityGuard

Functional `CanActivateFn`. If `IdentityService.userId()` is empty, returns `router.parseUrl('/onboarding')`; else `true`.

## Routes

```ts
const routes: Routes = [
  { path: 'onboarding', loadComponent: () => import('./features/onboarding/onboarding.page').then(m => m.OnboardingPage) },
  {
    path: '',
    canActivate: [identityGuard],
    loadComponent: () => import('./features/shell/shell.page').then(m => m.ShellPage),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./features/rooms/empty-room.page').then(m => m.EmptyRoomPage) },
      { path: 'rooms/:id', loadComponent: () => import('./features/room/room.page').then(m => m.RoomPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
```

`provideRouter(routes, withComponentInputBinding())` so `:id` becomes a component `input()`.

## Components

- **OnboardingPage** — centered Material card, single reactive-form `mat-form-field`, "Enter chat" button. Tailwind centering.
- **ShellPage** — toolbar, sidenav (`mode="side"` ≥md, `mode="over"` <md via `BreakpointObserver`), connection banner, rooms `mat-nav-list` with `routerLinkActive`.
- **EmptyRoomPage** — small placeholder, inline template.
- **RoomPage** — header (room name + presence count + end-sidenav of users), scrollable messages list (auto-scroll on new), typing footer, composer.
- **MessageBubble** — presentation-only; `input()` for `message` and `currentUserId`. Right-aligned primary-tinted bubble for own messages; left-aligned neutral otherwise.
- **MessageComposer** — textarea, send button. Enter sends, Shift+Enter newline. Disabled when offline. Keystrokes fire `typingStart`; cleared after 3s.

All components: `ChangeDetectionStrategy.OnPush`, `inject()`, `input()`/`output()`, `@if`/`@for`, reactive forms, no `ngClass`/`ngStyle`.

## Error handling and edge cases

- **Disconnect** — banner + composer disabled; messages/rooms remain visible.
- **Send while offline** — prevented at UI level.
- **Empty messages** — composer trims; empty input doesn't emit.
- **Unknown room id** — if rooms loaded and id missing, "Room not found" with link to `/`. If still connecting, `mat-spinner`.
- **Reconnect** — re-fires `joinRoom(currentRoomId)` so users:list flows again.
- **Same user in two tabs** — accepted; backend treats as one user.
- **Typing stuck** — cleared by `user:typing-stopped`, by 3s client timer, and by 5s backend expiry.

## Testing (Vitest)

- `ChatSocketService` — mock `socket.io-client`; signals update per event; emit payloads correct; typing debounce uses fake timers.
- `IdentityService` — localStorage round-trip + clear.
- `identityGuard` — true with name, `UrlTree('/onboarding')` without.
- `MessageBubble` — render tests for own vs other styling.
- `OnboardingPage` — form validity + navigation on submit.
- `RoomPage` — join on enter, leave on destroy, send empties input, typing fires/stops.

No e2e in scope.

## Out of scope

Auth, message history/pagination, file uploads, message edit/delete, read receipts, dark mode toggle, i18n, PWA.

## Dependencies to add

- `socket.io-client` in `frontend/` via `pnpm add socket.io-client`.
