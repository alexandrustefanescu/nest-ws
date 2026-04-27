# Backend — NestJS WebSocket Chat

NestJS 11 + Fastify + Socket.io + TypeORM/SQLite. Handles real-time chat via WebSockets and room management via REST, with interactive API documentation served by Scalar.

## Commands

Run from the workspace root (`nest-ws/`):

```bash
pnpm --filter @repo/backend dev          # dev server with file watch
pnpm --filter @repo/backend build        # compile to dist/
pnpm --filter @repo/backend start:prod   # run compiled output
pnpm --filter @repo/backend test         # Jest unit tests
pnpm --filter @repo/backend test:e2e     # end-to-end tests
pnpm --filter @repo/backend test:cov     # coverage report
pnpm --filter @repo/backend lint         # ESLint (auto-fix)
pnpm --filter @repo/backend seed         # seed 3 rooms (general, random, dev)
```

Or run directly from `backend/`:

```bash
pnpm dev
pnpm test
pnpm test:e2e
pnpm seed
```

## Architecture

```
src/
├── common/
│   ├── filters/
│   │   └── ws-exception.filter.ts      # catches WsException + BadRequestException → { status, message, timestamp }
│   ├── guards/
│   │   └── ws-throttler.guard.ts       # per-event WebSocket rate limiting
│   └── interceptors/
│       └── logging.interceptor.ts      # logs incoming WS events
├── config/
│   ├── env.ts                          # typed wrapper around process.env (PORT, DATABASE_PATH, CORS_ORIGIN, NODE_ENV)
│   └── database.config.ts             # TypeORM options (SQLite, entity glob, sync flag)
├── health/
│   ├── health.module.ts
│   └── health.controller.ts           # GET /health → { status: 'ok', timestamp }
├── modules/
│   ├── rooms/
│   │   ├── rooms.module.ts
│   │   ├── rooms.service.ts           # getAllRooms, getRoomById, createRoom, deleteRoom
│   │   ├── rooms.controller.ts        # REST: GET/POST/DELETE /api/rooms
│   │   ├── room.entity.ts
│   │   └── dto/
│   │       ├── create-room.dto.ts     # implements CreateRoomRequest
│   │       └── delete-room.dto.ts     # implements DeleteRoomRequest
│   ├── messaging/
│   │   ├── messaging.module.ts
│   │   ├── messages.service.ts        # save, history (cursor), delete, clear
│   │   ├── reactions.service.ts       # toggle, snapshot per room
│   │   ├── message.entity.ts
│   │   ├── message-reaction.entity.ts
│   │   └── dto/
│   │       ├── send-message.dto.ts    # implements SendMessageRequest
│   │       ├── delete-message.dto.ts  # implements DeleteMessageRequest
│   │       ├── load-more.dto.ts       # implements LoadMoreRequest
│   │       ├── toggle-reaction.dto.ts # implements ToggleReactionRequest (validates allowed emojis via @IsIn)
│   │       └── clear-chat.dto.ts      # implements ClearChatRequest
│   ├── presence/
│   │   ├── presence.module.ts
│   │   ├── presence.service.ts        # add/remove/list users per room, clear on startup
│   │   ├── typing.service.ts          # mark/remove/clear typing state (5s TTL in entity)
│   │   ├── room-user.entity.ts
│   │   ├── typing-status.entity.ts
│   │   └── dto/
│   │       ├── join-room.dto.ts       # implements JoinRoomRequest (also exported as LeaveRoomDto)
│   │       └── typing.dto.ts          # implements TypingRequest
│   ├── chat/
│   │   ├── chat.module.ts
│   │   ├── chat.gateway.ts            # thin WS protocol adapter — handlers, emits, no business logic
│   │   └── connection-registry.ts     # socket→user→room bookkeeping (plain class, no dependencies)
│   └── docs/
│       ├── docs.module.ts
│       ├── ws-docs.controller.ts      # fake REST endpoints that expose WS events in the OpenAPI spec
│       └── ws-events.dto.ts           # Swagger @ApiProperty shapes for server-emitted events
├── app.module.ts                       # composition root — module imports + APP_GUARD only
├── main.ts                             # bootstrap, Swagger doc build, Scalar mount, CORS, helmet
└── seed.ts                             # creates general/random/dev rooms if they don't exist
```

## Module dependency graph

```
AppModule
├── HealthModule       (self-contained)
├── DocsModule         (self-contained)
├── RoomsModule     ──→ MessagingModule, PresenceModule
├── MessagingModule    (self-contained)
├── PresenceModule     (self-contained)
└── ChatModule      ──→ RoomsModule, MessagingModule, PresenceModule
```

`AppModule` registers `ThrottlerGuard` via `APP_GUARD` and `TypeOrmModule.forRoot`. All other providers live inside their feature module.

## API Docs (OpenAPI + Scalar)

The backend generates an [OpenAPI 3](https://swagger.io/specification/) document at startup using [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) and serves it through [**Scalar API Reference**](https://scalar.com) (`@scalar/fastify-api-reference`).

**URL:** `http://localhost:3000/docs`

```typescript
// main.ts — how the spec is built and mounted
const config = new DocumentBuilder()
  .setTitle('nest-ws Chat API')
  .setDescription('REST and WebSocket API for real-time chat rooms')
  .setVersion('1.0')
  .addTag('health', 'Service health checks')
  .addTag('websocket-events', 'Socket.IO events — connect via ws://localhost:3000')
  .build();

const document = SwaggerModule.createDocument(app, config);

await fastify.register(ScalarApiReference, {
  routePrefix: '/docs',
  configuration: { content: document, title: 'nest-ws API Reference' },
});
```

### How WebSocket events are documented

Socket.io operates over a persistent connection — it has no HTTP verbs. To include WS events in the OpenAPI spec, `WsDocsController` (`modules/docs/`) exposes each event as a fake REST endpoint decorated with `@ApiBody` and `@ApiResponse`. The controller methods just return a note directing developers to Socket.io; they are never called in production use.

This gives you:
- Request payload schemas (from the DTO class used by the real handler)
- Server-emitted response shapes (from `ws-events.dto.ts`)
- Descriptions and tags alongside the real REST endpoints

The Scalar interface renders these under the `websocket-events` tag with full interactive schema exploration.

## Validation

Every WS event has a dedicated DTO in its feature module's `dto/` folder:

```typescript
// modules/presence/dto/join-room.dto.ts
export class JoinRoomDto implements JoinRoomRequest {
  @ApiProperty({ example: 1 })
  @IsInt() @IsPositive()
  roomId!: number;

  @ApiProperty({ example: 'user-123' })
  @IsString() @IsNotEmpty() @MaxLength(64)
  userId!: string;
}
```

Key design decisions:
- `@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))` is on the `ChatGateway` class — applies to all WS handlers, including in the e2e test context.
- `@UseFilters(new WsExceptionFilter())` is also on the class — catches both `WsException` (thrown by handlers) and `BadRequestException` (thrown by ValidationPipe) and formats both as `{ status: 'error', message, timestamp }`.
- Every DTO `implements` the corresponding interface from `@repo/shared-types`. Type drift between the DTO and the shared contract breaks the build.

## REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | `{ status: 'ok', timestamp }` |
| `GET` | `/api/rooms` | List all rooms |
| `POST` | `/api/rooms` | Create room — body: `{ name: string }` |
| `DELETE` | `/api/rooms/:id` | Delete room by id |
| `GET` | `/docs` | Scalar interactive API reference |

## Environment Variables

All variables are read through `src/config/env.ts`. No raw `process.env` is used anywhere else.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP + WS listen port |
| `DATABASE_PATH` | `chat.db` | SQLite file path |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed CORS origin |
| `NODE_ENV` | `development` | `production` disables DB auto-sync and verbose logging |

## Testing

Unit tests are co-located next to their source file (`*.spec.ts`). E2E tests live in `test/chat.e2e-spec.ts` and spin up a full NestJS application on port 3099.

```bash
# Run a single spec file
pnpm --filter @repo/backend test -- --testPathPattern messages.service

# Run with coverage
pnpm --filter @repo/backend test:cov
```

Mocks use plain Jest objects assigned to typed `let` variables — no `jest.mock()` factory functions.
