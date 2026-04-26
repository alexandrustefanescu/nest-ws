# Security Hardening Design — 2026-04-27

## Scope

Fix all non-auth security issues identified in the backend audit. No new packages required.
Auth is explicitly out of scope.

## Issues and Fixes

### 1. Rate Limiting (Broken — ThrottlerGuard never applied)

**Fix:** A custom `WsThrottlerGuard` implemented inline in `chat.gateway.ts` (or a small
`guards/ws-throttler.guard.ts` file). Uses an in-memory `Map<socketId, Map<event, {count, resetAt}>>`.
Applied per-handler via `@UseGuards`. Cleans up stored state on disconnect.

Per-event limits:
- `message:send`: 20/min
- `reaction:toggle`: 30/min
- `typing:start`, `typing:stop`: 60/min
- `room:create`, `room:delete`: 5/min
- `room:join`, `room:leave`, `chat:clear`: 10/min
- `messages:load-more`, `message:delete`: 20/min

The existing `ThrottlerModule` in `app.module.ts` will also get `ThrottlerGuard` applied globally
via `APP_GUARD` so HTTP endpoints are covered.

### 2. CORS (Wildcard)

**Fix:** Replace `cors: true` in `main.ts` and `origin: '*'` in `@WebSocketGateway` with:
- `origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200'`

Both HTTP and WS origins locked to the same env-configurable value.

### 3. Input Validation on WS Events (Missing)

Handlers currently missing validation:
- `reaction:toggle`: validate `roomId`, `messageId` are positive integers; `userId` is non-empty string; `emoji` already validated
- `message:delete`: validate `roomId`, `messageId` are positive integers; `userId` is non-empty string
- `chat:clear`: validate `roomId` is a positive integer
- `messages:load-more`: validate `roomId` and `before` are positive integers
- `room:create`: already has name presence check; add max length 100 chars

Approach: inline validation guards at the top of each handler (matching existing style in `room:delete`).
No new pipes needed — the pattern is already established for simple cases.

### 4. REST Controller Validation (Crash on missing name)

**Fix:** Add `@UsePipes(new ValidationPipe({ whitelist: true }))` + a `CreateRoomDto` with
`@IsString()` and `@IsNotEmpty()` from `class-validator`. Accept the body as the DTO rather than
`@Body('name')`.

Since `class-validator` and `class-transformer` are standard NestJS deps, check if they are already
present; add if not.

### 5. Helmet Registration Order

**Fix:** Move `await app.register(helmet)` to before `await fastify.register(ScalarApiReference, ...)`.

## Files Changed

- `backend/src/main.ts` — CORS origin, helmet order, global ThrottlerGuard
- `backend/src/app.module.ts` — APP_GUARD for ThrottlerGuard on HTTP
- `backend/src/gateways/chat.gateway.ts` — WS rate limiting guard + per-handler validation
- `backend/src/guards/ws-throttler.guard.ts` — new file, WsThrottlerGuard
- `backend/src/controllers/rooms.controller.ts` — CreateRoomDto + ValidationPipe
- `backend/src/dto/create-room.dto.ts` — new file

## Non-Goals

- Authentication / authorization
- Persistent rate limit state (in-memory is fine for this stage)
- Redis-backed distributed rate limiting
