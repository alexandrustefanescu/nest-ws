# Frontend — Angular Chat

Angular 20+ standalone application for the nest-ws real-time chat. Communicates with the backend over Socket.io (WebSocket) and REST.

## Commands

Run from the workspace root (`nest-ws/`):

```bash
pnpm --filter @repo/frontend start       # dev server — http://localhost:4200
pnpm --filter @repo/frontend build       # production build → dist/frontend/
pnpm --filter @repo/frontend test        # unit tests
pnpm --filter @repo/frontend watch       # build in watch mode
```

Or run directly from `frontend/`:

```bash
pnpm start        # ng serve
pnpm build        # ng build
pnpm test         # ng test
```

The dev server proxies nothing — the backend URL is configured in `src/environments/environment.ts`.

## Architecture

```
src/app/
├── core/                          # Singleton services (providedIn: root)
│   ├── chat/
│   │   └── chat-socket.service.ts # Socket.io connection, all WS event handling, signal state
│   ├── identity/
│   │   ├── identity.service.ts    # stores and persists the user's chosen username
│   │   └── identity.guard.ts      # redirects to /onboarding if no username is set
│   └── theme/
│       └── theme.service.ts       # light/dark/system theme toggle, persisted to localStorage
│
├── features/                      # Lazy-loaded page components
│   ├── onboarding/
│   │   └── onboarding.page.ts     # username entry form; redirects to / on submit
│   ├── shell/
│   │   ├── shell.page.ts          # sidebar layout: room list, create/delete, theme toggle
│   │   └── connection-banner.component.ts  # top bar shown when WS is connecting/disconnected
│   ├── room/
│   │   ├── room.page.ts           # message list, scroll-to-bottom, load-more trigger
│   │   ├── message-bubble.component.ts     # single message with reactions and delete button
│   │   └── message-composer.component.ts  # text input with typing indicator integration
│   └── rooms/
│       └── empty-room.page.ts     # placeholder shown when no room is selected
│
├── app.routes.ts                  # route definitions (lazy-loaded, identityGuard on /)
├── app.config.ts                  # root providers: router, animations, hydration, HttpClient
└── app.ts                         # root component (just <router-outlet>)
```

## State management

All application state lives in signals on `ChatSocketService`. There is no external state library.

| Signal | Type | Description |
|---|---|---|
| `connectionState` | `'connecting' \| 'connected' \| 'disconnected'` | current WS connection status |
| `rooms` | `Room[]` | all available rooms, hydrated from localStorage on first load |
| `currentRoomId` | `number \| null` | the room the user is currently viewing |
| `roomUsers` | `Record<number, RoomUser[]>` | users per room |
| `roomMessages` | `Record<number, Message[]>` | messages per room |
| `roomReactions` | `Record<number, ReactionMap>` | emoji reactions keyed by messageId |
| `roomHasMore` | `Record<number, boolean>` | whether older messages are available |
| `typingUsers` | `Record<number, Set<string>>` | who is currently typing per room |
| `isLoadingMore` | `boolean` | pagination in-flight guard |

## Routing

| Path | Component | Guard |
|---|---|---|
| `/onboarding` | `OnboardingPage` | — |
| `/` | `ShellPage` | `identityGuard` |
| `/rooms/:id` | `RoomPage` (child of Shell) | `identityGuard` |

The `identityGuard` redirects to `/onboarding` if no username has been stored yet.

## Angular patterns used

- **Standalone components** — no NgModules anywhere
- **Signals** — `signal()`, `computed()` for all reactive state
- **`input()` / `output()`** — no `@Input` / `@Output` decorators
- **`inject()`** — no constructor injection
- **`OnPush` change detection** — on every component
- **Native control flow** — `@if`, `@for`, `@switch` (no `*ngIf` / `*ngFor`)
- **SSR-safe** — `isPlatformBrowser` guards all Socket.io and localStorage access

## Environment

`src/environments/environment.ts` configures the backend URLs:

```typescript
export const environment = {
  production: false,
  wsUrl: 'http://localhost:3000',   // Socket.io connection
  apiUrl: 'http://localhost:3000',  // REST API base
};
```

Update these for production or if you change the backend port.

## Shared types

Wire-format types (`Room`, `RoomUser`, `Message`, `ReactionMap`) come from the workspace package `@repo/shared-types` — they are never redefined in the frontend. The `ConnectionState` type alias is the only frontend-specific type and is co-located in `chat-socket.service.ts`.
