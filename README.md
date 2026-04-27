# WebSocket Chat Prototype

A real-time chat backend built with NestJS, Socket.io, Fastify, and SQLite. Learning prototype for WebSocket fundamentals.

## Features

- Real-time messaging in chat rooms
- User presence tracking (user lists per room)
- Typing indicators
- Message persistence with SQLite
- WebSocket exception handling and validation
- Event logging via interceptors
- Docker support

## Tech Stack

- **Framework:** NestJS 11 with Fastify adapter
- **WebSockets:** Socket.io (`@nestjs/platform-socket.io`)
- **Database:** SQLite with TypeORM
- **Validation:** NestJS Pipes (`WsException`)
- **Middleware:** Interceptors, Exception Filters
- **Testing:** Jest (unit + E2E)
- **Container:** Docker + Docker Compose

## Key Learning Concepts

| Concept | Where |
|---|---|
| **Gateways** | `src/gateways/chat.gateway.ts` |
| **Pipes** | `src/pipes/` — applied via `@MessageBody(new Pipe())` |
| **Interceptors** | `src/interceptors/logging.interceptor.ts` |
| **Exception Filters** | `src/filters/ws-exception.filter.ts` |
| **Socket.io rooms** | `client.join('room-{id}')` / `server.to('room-{id}').emit(...)` |
| **Services** | `src/services/` — ChatService, RoomService |
| **Entities** | `src/entities/` — Room, RoomUser, Message, TypingStatus |

### Important: Pipe Placement in WebSocket Handlers

Pipes **must** be applied to `@MessageBody()` directly, not at method level:

```typescript
// Correct — pipe runs only on the message body
async handleJoinRoom(
  @ConnectedSocket() client: Socket,
  @MessageBody(new JoinRoomPipe()) data: { roomId: number; userId: string },
)

// Wrong — @UsePipes applies to ALL parameters including @ConnectedSocket()
@UsePipes(new JoinRoomPipe())
async handleJoinRoom(client: Socket, data: { roomId: number; userId: string })
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Docker (optional)

### Installation

```bash
# Install dependencies
pnpm install

# Seed initial rooms (general, random, dev)
pnpm run seed

# Start development server
pnpm run start:dev
```

Server starts on `http://localhost:3000`. WebSocket connects on the same port.

### Running Tests

```bash
# Unit tests
pnpm run test

# Unit tests in watch mode
pnpm run test:watch

# E2E tests
pnpm run test:e2e
```

### Docker

```bash
# Build and run
docker-compose up

# Available at http://localhost:3000
```

## WebSocket API

### Server → Client Events

| Event | Payload | When |
|---|---|---|
| `rooms:list` | `Room[]` | On connect |
| `user:joined` | `{ userId, timestamp }` | Someone joined your room |
| `user:left` | `{ userId, timestamp }` | Someone left your room |
| `users:list` | `RoomUser[]` | After join/leave |
| `message:new` | `{ id, roomId, userId, text, createdAt }` | New message in room |
| `user:typing` | `{ userId, timestamp }` | Someone is typing |
| `user:typing-stopped` | `{ userId, timestamp }` | Someone stopped typing |
| `error` | `{ status: 'error', message, timestamp }` | Validation or business error |

### Client → Server Events

| Event | Payload |
|---|---|
| `room:join` | `{ roomId: number, userId: string }` |
| `room:leave` | `{ roomId: number, userId: string }` |
| `message:send` | `{ roomId: number, userId: string, text: string }` |
| `typing:start` | `{ roomId: number, userId: string }` |
| `typing:stop` | `{ roomId: number, userId: string }` |

### Example (Socket.io client)

```javascript
const socket = io('http://localhost:3000');

socket.on('rooms:list', (rooms) => console.log(rooms));

socket.emit('room:join', { roomId: 1, userId: 'alice' });
socket.on('user:joined', (data) => console.log(`${data.userId} joined`));

socket.emit('message:send', { roomId: 1, userId: 'alice', text: 'Hello!' });
socket.on('message:new', (msg) => console.log(msg));
```

## Project Structure

```
backend/src/
├── common/          # filters, interceptors, guards
├── config/          # env, database
├── health/          # GET /health
├── modules/
│   ├── rooms/       # Room CRUD + REST controller + RoomsService
│   ├── messaging/   # messages + reactions (MessagesService, ReactionsService)
│   ├── presence/    # room users + typing (PresenceService, TypingService)
│   ├── chat/        # ChatGateway + ConnectionRegistry
│   └── docs/        # WS Swagger documentation
├── app.module.ts    # composition root
├── main.ts
└── seed.ts

frontend/src/app/
├── core/            # singleton infra (chat socket, identity, theme)
└── features/        # onboarding, shell, room, rooms

packages/shared-types/src/
├── entities.ts      # wire-format entity shapes
├── events.ts        # event-name constants
└── contracts/       # per-domain request/response interfaces
```

WS event validation uses class-validator DTOs (one per event) that `implements` the
shared-types contract interface. The global `WsExceptionFilter` formats all validation
errors into the existing `{ status, message, timestamp }` envelope.

## Notes

- No authentication (guards are out of scope — next step)
- SQLite suitable for development; use PostgreSQL for production
- Typing status expires after 5 seconds (ephemeral)
- Messages persist indefinitely

## Next Steps

- Authentication with JWT guards
- Message history pagination
- Angular frontend
- Redis adapter for horizontal scaling
