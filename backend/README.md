# Backend — NestJS WebSocket Chat

NestJS 11 + Fastify + Socket.io + TypeORM/SQLite. Handles real-time chat via WebSockets and room management via REST.

## Architecture

```
src/
├── common/
│   ├── filters/ws-exception.filter.ts     # formats WsException + BadRequestException → { status, message, timestamp }
│   ├── guards/ws-throttler.guard.ts       # per-event WebSocket rate limiting
│   └── interceptors/logging.interceptor.ts
├── config/
│   ├── env.ts                             # typed process.env wrapper
│   └── database.config.ts
├── health/
│   └── health.controller.ts              # GET /health
├── modules/
│   ├── rooms/
│   │   ├── rooms.module.ts
│   │   ├── rooms.service.ts              # CRUD for Room entity
│   │   ├── rooms.controller.ts           # REST: GET/POST/DELETE /api/rooms
│   │   ├── room.entity.ts
│   │   └── dto/                          # CreateRoomDto, DeleteRoomDto
│   ├── messaging/
│   │   ├── messaging.module.ts
│   │   ├── messages.service.ts           # save, history, delete, clear
│   │   ├── reactions.service.ts          # toggle, snapshot per room
│   │   ├── message.entity.ts
│   │   ├── message-reaction.entity.ts
│   │   └── dto/                          # SendMessageDto, DeleteMessageDto, LoadMoreDto, ToggleReactionDto, ClearChatDto
│   ├── presence/
│   │   ├── presence.module.ts
│   │   ├── presence.service.ts           # add/remove/list users per room
│   │   ├── typing.service.ts             # mark/remove/clear typing state
│   │   ├── room-user.entity.ts
│   │   ├── typing-status.entity.ts
│   │   └── dto/                          # JoinRoomDto, TypingDto
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.gateway.ts               # thin WS protocol adapter — handlers, emits, no business logic
│   │   └── connection-registry.ts        # socket→user→room bookkeeping (dependency-free)
│   └── docs/
│       ├── docs.module.ts
│       ├── ws-docs.controller.ts         # fake REST endpoints for Swagger WS docs
│       └── ws-events.dto.ts              # Swagger-only response shapes
├── app.module.ts                          # composition root — imports only
├── main.ts
└── seed.ts
```

## Module dependency graph

```
AppModule
├── HealthModule
├── DocsModule
├── RoomsModule      → MessagingModule, PresenceModule
├── MessagingModule  (self-contained)
├── PresenceModule   (self-contained)
└── ChatModule       → RoomsModule, MessagingModule, PresenceModule
```

`AppModule` wires the global `ThrottlerGuard` via `APP_GUARD`. All other providers live inside their feature module.

## Validation

Every WS event has a dedicated DTO class in its feature module's `dto/` folder:

```typescript
// modules/presence/dto/join-room.dto.ts
export class JoinRoomDto implements JoinRoomRequest {
  @IsInt() @IsPositive() roomId!: number;
  @IsString() @IsNotEmpty() @MaxLength(64) userId!: string;
}
```

- `@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))` on `ChatGateway` class applies to all WS handlers.
- `@UseFilters(new WsExceptionFilter())` on `ChatGateway` class catches both `WsException` and `BadRequestException` (from the pipe) and formats them into `{ status: 'error', message, timestamp }`.
- All DTO classes `implements` the corresponding interface from `@repo/shared-types` — mismatches break the build.

## REST endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/rooms` | List all rooms |
| `POST` | `/api/rooms` | Create a room (`{ name }`) |
| `DELETE` | `/api/rooms/:id` | Delete a room |
| `GET` | `/docs` | Scalar interactive API docs |

## Commands

Run from the workspace root (`nest-ws/`):

```bash
pnpm --filter @repo/backend start:dev   # dev server with watch
pnpm --filter @repo/backend start:prod  # production
pnpm --filter @repo/backend build       # compile
pnpm --filter @repo/backend test        # unit tests (Jest)
pnpm --filter @repo/backend test:e2e    # end-to-end tests
pnpm --filter @repo/backend lint        # ESLint
```

Or run directly from `backend/`:

```bash
pnpm start:dev
pnpm test
pnpm test:e2e
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP + WS port |
| `DATABASE_PATH` | `chat.db` | SQLite file path |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed CORS origin |
| `NODE_ENV` | `development` | `production` disables DB sync and verbose logging |

All variables are accessed through `src/config/env.ts` — no raw `process.env` elsewhere.

## Testing

- Unit tests are co-located next to the file under test (`*.spec.ts`).
- E2E tests live in `test/chat.e2e-spec.ts` and spin up a real NestJS app on port 3099.
- Mocks use plain Jest objects — no `jest.mock()` factory pattern.

```bash
# Run a single test file
pnpm --filter @repo/backend test -- --testPathPattern messages.service
```

## Seeding

```bash
pnpm --filter @repo/backend seed
# Creates three rooms: general, random, dev
```
