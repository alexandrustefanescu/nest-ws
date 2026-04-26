# Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all non-auth security issues in the NestJS backend: broken rate limiting, CORS wildcard, missing WS input validation, REST crash on missing body field, and helmet registration order.

**Architecture:** Surgical fixes only — no new modules or abstractions beyond a single `WsThrottlerGuard` file and a `CreateRoomDto`. All WS rate limiting is in-memory per-socket using a Map. HTTP rate limiting uses the already-imported `@nestjs/throttler` with `APP_GUARD`.

**Tech Stack:** NestJS 11, Fastify, `@nestjs/throttler` v6, `@fastify/helmet`, `class-validator`, `class-transformer`, Socket.IO 4.

---

### Task 1: Fix helmet registration order

**Files:**
- Modify: `backend/src/main.ts`

**Step 1: Move helmet before ScalarApiReference**

In `backend/src/main.ts`, reorder so helmet is registered first:

```ts
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { cors: false },  // disable here — we set it explicitly below
  );

  await app.register(helmet);
  await app.register(fastifyCsrf);

  // ... swagger doc setup ...

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(ScalarApiReference, { ... });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
```

Note: `cors` option is moved to explicit `enableCors()` in Task 2 — set it to `false` here.

**Step 2: Verify the app still starts**

```bash
cd backend && pnpm dev
```

Expected: `Application is running on: http://[::1]:3000` with no errors. Hit `GET /health` and confirm `x-content-type-options` header is present in the response.

**Step 3: Commit**

```bash
git add backend/src/main.ts
git commit -m "fix(backend): register helmet before api docs to apply security headers to all routes"
```

---

### Task 2: Lock down CORS origins

**Files:**
- Modify: `backend/src/main.ts`
- Modify: `backend/src/gateways/chat.gateway.ts`

**Step 1: Replace `cors: true` in main.ts**

Remove `cors: true` from `NestFactory.create` options (set to `false` as noted in Task 1).
After registrations, add explicit CORS:

```ts
app.enableCors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true,
});
```

**Step 2: Replace `origin: '*'` in chat.gateway.ts**

Change the `@WebSocketGateway` decorator:

```ts
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  },
})
```

**Step 3: Verify CORS still works in dev**

Start both backend and frontend (`pnpm dev` from root). Open `http://localhost:4200` and confirm the chat still connects and messages send.

**Step 4: Commit**

```bash
git add backend/src/main.ts backend/src/gateways/chat.gateway.ts
git commit -m "fix(backend): restrict CORS to configured origin instead of wildcard"
```

---

### Task 3: Apply ThrottlerGuard globally to HTTP endpoints

**Files:**
- Modify: `backend/src/app.module.ts`

**Step 1: Register ThrottlerGuard as APP_GUARD**

`@nestjs/throttler` is already installed and `ThrottlerModule` is already configured in `app.module.ts`. Just add the global guard:

```ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    TypeOrmModule.forFeature([Room, RoomUser, Message, TypingStatus, MessageReaction]),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 10 }],
    }),
  ],
  controllers: [AppController, WsDocsController, RoomsController],
  providers: [
    ChatGateway,
    ChatService,
    RoomService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

**Step 2: Verify the health endpoint is throttled**

Start the backend. Run:

```bash
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health; done
```

Expected: first 10 responses are `200`, last 2 are `429`.

**Step 3: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "fix(backend): apply ThrottlerGuard globally so HTTP rate limits actually take effect"
```

---

### Task 4: Create WsThrottlerGuard

**Files:**
- Create: `backend/src/guards/ws-throttler.guard.ts`

**Step 1: Create the guards directory and guard file**

```ts
// backend/src/guards/ws-throttler.guard.ts
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';

export const WS_THROTTLE_KEY = 'ws_throttle';

export interface WsThrottleOptions {
  limit: number;
  ttl: number; // milliseconds
}

export const WsThrottle = (limit: number, ttl: number) =>
  Reflect.metadata(WS_THROTTLE_KEY, { limit, ttl });

interface BucketEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class WsThrottlerGuard implements CanActivate {
  // socketId -> eventKey -> bucket
  private readonly buckets = new Map<string, Map<string, BucketEntry>>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const opts = this.reflector.get<WsThrottleOptions>(WS_THROTTLE_KEY, context.getHandler());
    if (!opts) return true;

    const client: Socket = context.switchToWs().getClient();
    const eventKey = context.getHandler().name;
    const socketId = client.id;

    const now = Date.now();
    let socketBuckets = this.buckets.get(socketId);
    if (!socketBuckets) {
      socketBuckets = new Map();
      this.buckets.set(socketId, socketBuckets);
    }

    let bucket = socketBuckets.get(eventKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + opts.ttl };
      socketBuckets.set(eventKey, bucket);
    }

    bucket.count++;
    if (bucket.count > opts.limit) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  evict(socketId: string): void {
    this.buckets.delete(socketId);
  }
}
```

**Step 2: Verify the file compiles**

```bash
cd backend && pnpm build
```

Expected: build completes with no TypeScript errors.

**Step 3: Commit**

```bash
git add backend/src/guards/ws-throttler.guard.ts
git commit -m "feat(backend): add WsThrottlerGuard for per-event WebSocket rate limiting"
```

---

### Task 5: Apply WsThrottlerGuard to all WS handlers + evict on disconnect

**Files:**
- Modify: `backend/src/gateways/chat.gateway.ts`

**Step 1: Wire up the guard and decorators**

At the top of `chat.gateway.ts` add the imports:

```ts
import { UseGuards } from '@nestjs/common';
import { WsThrottlerGuard, WsThrottle } from '../guards/ws-throttler.guard';
```

Inject the guard in the constructor and add it to the class-level `@UseGuards`:

```ts
@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200', credentials: true } })
@UseFilters(new WsExceptionFilter())
@UseInterceptors(new LoggingInterceptor())
export class ChatGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly clientRooms = new Map<string, ClientRooms>();
  private readonly roomUserSockets = new Map<number, RoomUserSockets>();

  constructor(
    private readonly chatService: ChatService,
    private readonly roomService: RoomService,
    private readonly wsThrottlerGuard: WsThrottlerGuard,
  ) {}
```

**Step 2: Evict socket bucket on disconnect**

In `handleDisconnect`, call evict after the existing cleanup:

```ts
async handleDisconnect(@ConnectedSocket() client: Socket) {
  // ... existing cleanup code ...
  this.wsThrottlerGuard.evict(client.id);
}
```

**Step 3: Decorate each handler with its limit**

Add `@WsThrottle(limit, ttl)` and `@UseGuards(WsThrottlerGuard)` above each `@SubscribeMessage` handler. TTL is always `60000` (1 minute). Use these limits:

```ts
@WsThrottle(20, 60000)   // message:send
@WsThrottle(60, 60000)   // typing:start
@WsThrottle(60, 60000)   // typing:stop
@WsThrottle(5, 60000)    // room:create
@WsThrottle(5, 60000)    // room:delete
@WsThrottle(10, 60000)   // room:join
@WsThrottle(10, 60000)   // room:leave
@WsThrottle(30, 60000)   // reaction:toggle
@WsThrottle(20, 60000)   // messages:load-more
@WsThrottle(20, 60000)   // message:delete
@WsThrottle(10, 60000)   // chat:clear
```

Each handler looks like:

```ts
@SubscribeMessage('message:send')
@WsThrottle(20, 60000)
@UseGuards(WsThrottlerGuard)
async handleSendMessage(...) { ... }
```

**Step 4: Register WsThrottlerGuard as a provider**

In `app.module.ts`, add `WsThrottlerGuard` and `Reflector` to the providers array:

```ts
import { Reflector } from '@nestjs/core';
import { WsThrottlerGuard } from './guards/ws-throttler.guard';

providers: [
  ChatGateway,
  ChatService,
  RoomService,
  Reflector,
  WsThrottlerGuard,
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```

**Step 5: Verify the backend compiles and starts**

```bash
cd backend && pnpm build && pnpm dev
```

Expected: no errors, app starts on port 3000.

**Step 6: Commit**

```bash
git add backend/src/gateways/chat.gateway.ts backend/src/app.module.ts
git commit -m "feat(backend): apply per-event WS rate limiting to all socket handlers"
```

---

### Task 6: Add missing input validation to WS handlers

**Files:**
- Modify: `backend/src/gateways/chat.gateway.ts`

Add inline validation at the top of each handler that currently lacks it. Follow the same style used in `room:delete` (lines 175-179 of the existing gateway).

**Step 1: `reaction:toggle`**

Replace the destructuring at the top of `handleToggleReaction`:

```ts
const { roomId, messageId, userId, emoji } = data ?? {};
if (
  typeof roomId !== 'number' || !Number.isInteger(roomId) || roomId <= 0 ||
  typeof messageId !== 'number' || !Number.isInteger(messageId) || messageId <= 0 ||
  typeof userId !== 'string' || userId.trim().length === 0
) {
  throw new WsException('Invalid payload');
}
if (!ALLOWED_REACTIONS.has(emoji)) {
  throw new WsException('Invalid emoji');
}
```

**Step 2: `message:delete`**

Add at the top of `handleDeleteMessage`:

```ts
const { roomId, messageId, userId } = data ?? {};
if (
  typeof roomId !== 'number' || !Number.isInteger(roomId) || roomId <= 0 ||
  typeof messageId !== 'number' || !Number.isInteger(messageId) || messageId <= 0 ||
  typeof userId !== 'string' || userId.trim().length === 0
) {
  throw new WsException('Invalid payload');
}
```

**Step 3: `chat:clear`**

Add at the top of `handleClearChat`:

```ts
const { roomId } = data ?? {};
if (typeof roomId !== 'number' || !Number.isInteger(roomId) || roomId <= 0) {
  throw new WsException('roomId must be a positive integer');
}
```

**Step 4: `messages:load-more`**

Replace the existing truthy check at the top of `handleLoadMore`:

```ts
const { roomId, before } = data ?? {};
if (
  typeof roomId !== 'number' || !Number.isInteger(roomId) || roomId <= 0 ||
  typeof before !== 'number' || !Number.isInteger(before) || before <= 0
) {
  return { messages: [], hasMore: false };
}
```

**Step 5: `room:create` — add name length cap**

Extend the existing name check in `handleCreateRoom`:

```ts
const name = (data?.name ?? '').trim();
if (!name) {
  throw new WsException('Room name is required');
}
if (name.length > 100) {
  throw new WsException('Room name must be 100 characters or fewer');
}
```

**Step 6: Verify app still compiles**

```bash
cd backend && pnpm build
```

**Step 7: Commit**

```bash
git add backend/src/gateways/chat.gateway.ts
git commit -m "fix(backend): add input validation to reaction:toggle, message:delete, chat:clear, messages:load-more, room:create"
```

---

### Task 7: Fix REST controller crash + add DTO validation

**Files:**
- Create: `backend/src/dto/create-room.dto.ts`
- Modify: `backend/src/controllers/rooms.controller.ts`
- Modify: `backend/package.json` (add class-validator + class-transformer)

**Step 1: Install class-validator and class-transformer**

```bash
cd backend && pnpm add class-validator class-transformer
```

**Step 2: Enable global ValidationPipe in main.ts**

In `bootstrap()`, after `app` is created:

```ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```

**Step 3: Create the DTO**

```ts
// backend/src/dto/create-room.dto.ts
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ example: 'general', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
```

**Step 4: Update the controller**

In `rooms.controller.ts`, replace `@Body('name') name: string` with the DTO:

```ts
import { CreateRoomDto } from '../dto/create-room.dto';

@Post()
@ApiOperation({ summary: 'Create a new room' })
@ApiResponse({ status: 201, type: Room, description: 'Room created' })
async createRoom(@Body() dto: CreateRoomDto): Promise<Room> {
  return this.roomService.createRoom(dto.name.trim());
}
```

**Step 5: Test the crash is fixed**

```bash
curl -s -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: `400 Bad Request` with validation errors, not a 500 crash.

```bash
curl -s -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "test-room"}'
```

Expected: `201 Created` with the new room JSON.

**Step 6: Commit**

```bash
git add backend/src/dto/create-room.dto.ts backend/src/controllers/rooms.controller.ts backend/src/main.ts backend/package.json pnpm-lock.yaml
git commit -m "fix(backend): add CreateRoomDto with ValidationPipe to prevent crash on missing body field"
```

---

## Verification Checklist

After all tasks complete, run through:

- [ ] `pnpm build` in `backend/` passes with no errors
- [ ] `pnpm dev` starts without errors
- [ ] `GET /health` response includes `x-content-type-options` header (helmet applied)
- [ ] 11th `GET /health` request returns `429` (ThrottlerGuard active)
- [ ] `POST /api/rooms` with empty body returns `400` (not 500)
- [ ] WS connects from `localhost:4200` (CORS)
- [ ] WS connect attempt from `localhost:9999` is rejected (CORS enforcement)
- [ ] Chat UI works end-to-end (messages, reactions, typing)
