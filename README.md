# nest-ws — Real-time Chat

Full-stack chat application: NestJS + Socket.io backend, Angular 20+ frontend, pnpm workspace.

## Features

- Real-time messaging in chat rooms (Socket.io)
- Emoji reactions per message
- Typing indicators with auto-expiry
- Message history with cursor-based pagination
- Per-user message delete, room clear
- User presence tracking per room
- HTTP rate limiting (Throttler) + per-event WS rate limits
- Swagger / Scalar API docs at `/docs`
- Docker support

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | NestJS 11 + Fastify |
| WebSockets | Socket.io |
| Database | SQLite + TypeORM |
| Validation | class-validator DTOs + global ValidationPipe |
| Frontend | Angular 20+ (standalone, signals, OnPush) |
| Shared types | Pure TypeScript interfaces (`@repo/shared-types`) |
| Package manager | pnpm workspace |
| Testing | Jest (backend unit + e2e), Vitest (frontend) |
| Container | Docker + Docker Compose |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install and run

```bash
# Install all workspace dependencies
pnpm install

# Seed initial rooms (general, random, dev)
pnpm --filter @repo/backend seed

# Backend (localhost:3000)
pnpm --filter @repo/backend start:dev

# Frontend (localhost:4200)
pnpm --filter frontend start
```

### Docker

```bash
docker-compose up
# Backend: http://localhost:3000
# Frontend: http://localhost:4200
```

### Tests

```bash
pnpm --filter @repo/backend test        # unit
pnpm --filter @repo/backend test:e2e    # e2e
pnpm --filter frontend test             # frontend unit
pnpm -r build                           # full workspace build
```

## WebSocket API

Connect via Socket.io at `ws://localhost:3000`. Interactive docs at `http://localhost:3000/docs`.

### Client → Server events

| Event | Payload | Rate limit |
|---|---|---|
| `room:join` | `{ roomId, userId }` | 10 / min |
| `room:leave` | `{ roomId, userId }` | 10 / min |
| `room:create` | `{ name }` | 5 / min |
| `room:delete` | `{ roomId }` | 5 / min |
| `message:send` | `{ roomId, userId, text }` (max 500 chars) | 20 / min |
| `message:delete` | `{ roomId, messageId, userId }` | 20 / min |
| `messages:load-more` | `{ roomId, before }` | 20 / min |
| `reaction:toggle` | `{ roomId, messageId, userId, emoji }` | 30 / min |
| `typing:start` | `{ roomId, userId }` | 60 / min |
| `typing:stop` | `{ roomId, userId }` | 60 / min |
| `chat:clear` | `{ roomId, userId }` | 10 / min |

### Server → Client events

| Event | Payload | When |
|---|---|---|
| `rooms:list` | `Room[]` | On connect, after room create/delete |
| `user:joined` | `{ userId, timestamp }` | Someone joined your room |
| `user:left` | `{ userId, timestamp }` | Someone left your room |
| `users:list` | `RoomUser[]` | After any join/leave |
| `message:new` | `{ id, roomId, userId, text, createdAt }` | New message |
| `message:deleted` | `{ roomId, messageId }` | Message deleted |
| `messages:history` | `{ roomId, messages, hasMore }` | On room join |
| `reactions:snapshot` | `Record<messageId, ReactionMap>` | On room join |
| `reaction:updated` | `{ messageId, reactions }` | Reaction toggled |
| `user:typing` | `{ userId, timestamp }` | Someone is typing |
| `user:typing-stopped` | `{ userId, timestamp }` | Stopped typing |
| `chat:cleared` | `{ roomId }` | Chat cleared |
| `error` | `{ status: 'error', message, timestamp }` | Any validation error |

### Quick example

```javascript
const socket = io('http://localhost:3000');

socket.on('rooms:list', (rooms) => console.log(rooms));

socket.emit('room:join', { roomId: 1, userId: 'alice' });
socket.on('messages:history', ({ messages }) => console.log(messages));

socket.emit('message:send', { roomId: 1, userId: 'alice', text: 'Hello!' });
socket.on('message:new', (msg) => console.log(msg));

socket.emit('reaction:toggle', { roomId: 1, messageId: 42, userId: 'alice', emoji: '👍' });
socket.on('reaction:updated', ({ messageId, reactions }) => console.log(reactions));
```

## Project Structure

```
backend/src/
├── common/          # WsExceptionFilter, LoggingInterceptor, WsThrottlerGuard
├── config/          # typed env, database config
├── health/          # GET /health
├── modules/
│   ├── rooms/       # RoomsModule — REST CRUD + RoomsService
│   ├── messaging/   # MessagingModule — MessagesService + ReactionsService
│   ├── presence/    # PresenceModule — PresenceService + TypingService
│   ├── chat/        # ChatModule — ChatGateway + ConnectionRegistry
│   └── docs/        # DocsModule — Swagger/Scalar WS docs
├── app.module.ts    # composition root (imports only)
├── main.ts
└── seed.ts

frontend/src/app/
├── core/
│   ├── chat/        # ChatSocketService (singleton, providedIn root)
│   ├── identity/    # IdentityService + identityGuard
│   └── theme/       # ThemeService
└── features/
    ├── onboarding/  # username entry page
    ├── shell/       # sidebar layout + connection banner
    ├── room/        # message list, composer, reactions
    └── rooms/       # empty state page

packages/shared-types/src/
├── entities.ts         # Room, RoomUser, Message, ReactionMap
├── events.ts           # SocketEvents const + SocketEventName type
└── contracts/
    ├── rooms.contracts.ts
    ├── messaging.contracts.ts
    └── presence.contracts.ts
```

## Notes

- No authentication — userId is a free-form string set at onboarding
- Typing status expires after 5 seconds server-side
- SQLite is fine for local dev; swap `database.config.ts` for PostgreSQL in prod
