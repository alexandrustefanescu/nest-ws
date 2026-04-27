# nest-ws — Real-time Chat

Full-stack chat application built as a learning prototype for WebSocket fundamentals.

**Backend:** NestJS 11 + Fastify + Socket.io + SQLite  
**Frontend:** Angular 20+ (standalone components, signals, SSR)  
**Shared:** Pure TypeScript contract interfaces in `@repo/shared-types`

## Features

- Real-time messaging in chat rooms
- Emoji reactions per message (👍 ❤️ 😂 😮 😢 🔥)
- Typing indicators with 5-second server-side expiry
- Message history with cursor-based pagination (load more)
- Per-user message delete, full room clear
- User presence tracking per room
- HTTP rate limiting + per-event WebSocket rate limits
- Interactive API docs powered by **OpenAPI + Scalar** at `/docs`
- Docker support

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | NestJS 11 + Fastify adapter |
| WebSockets | Socket.io via `@nestjs/platform-socket.io` |
| Database | SQLite + TypeORM |
| Validation | class-validator DTOs + global ValidationPipe |
| API docs | `@nestjs/swagger` (OpenAPI 3) + Scalar API Reference |
| Frontend | Angular 20+ (standalone, signals, OnPush, SSR) |
| Shared types | `@repo/shared-types` — pure TypeScript interfaces |
| Package manager | pnpm workspace |
| Testing | Jest (backend unit + e2e) |

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

# Backend dev server — http://localhost:3000
pnpm --filter @repo/backend dev

# Frontend dev server — http://localhost:4200
pnpm --filter @repo/frontend start
```

### Docker

#### Development with local builds

```bash
# Start development containers (builds images locally)
docker-compose up

# Backend:  http://localhost:3000
# Frontend: http://localhost:4200

# Rebuild images after code changes
docker-compose build --no-cache
docker-compose up
```

#### Production with pre-built images

Pre-built multi-architecture images (linux/amd64, linux/arm64) are available on Docker Hub:

- **Backend:** [`alexandrustefanescu/chat-backend:latest`](https://hub.docker.com/r/alexandrustefanescu/chat-backend)
- **Frontend:** [`alexandrustefanescu/chat-frontend:latest`](https://hub.docker.com/r/alexandrustefanescu/chat-frontend)

```bash
# Pull and run production images from Docker Hub
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop containers
docker-compose -f docker-compose.prod.yml down
```

#### Building and pushing new images

After code changes, rebuild and push multi-architecture images to Docker Hub:

```bash
# Log in to Docker Hub (first time only)
docker login

# Build and push backend image for linux/amd64 and linux/arm64
docker buildx build -t alexandrustefanescu/chat-backend:latest --platform linux/amd64,linux/arm64 -f backend/Dockerfile --push .

# Build and push frontend image for linux/amd64 and linux/arm64
docker buildx build -t alexandrustefanescu/chat-frontend:latest --platform linux/amd64,linux/arm64 -f frontend/Dockerfile --push .
```

### Tests

```bash
pnpm --filter @repo/backend test        # unit tests
pnpm --filter @repo/backend test:e2e    # e2e tests
pnpm -r build                           # full workspace build
```

## API Docs

The backend exposes interactive API documentation at **`http://localhost:3000/docs`**.

- Built with [`@nestjs/swagger`](https://docs.nestjs.com/openapi/introduction) — generates an OpenAPI 3 spec from decorators on controllers and DTOs.
- Rendered by [**Scalar**](https://scalar.com) (`@scalar/fastify-api-reference`) — a modern, interactive alternative to Swagger UI.
- The `websocket-events` tag documents Socket.io events as fake REST endpoints so they appear in the spec with full request/response shapes.

The raw OpenAPI JSON is also available via the Scalar interface if you need it for code generation or import into tools like Postman or Insomnia.

## WebSocket API

Connect via Socket.io at `ws://localhost:3000`.  
All events and their schemas are also visible in the interactive docs at `/docs`.

### Client → Server events

| Event | Payload | Rate limit |
|---|---|---|
| `room:join` | `{ roomId: number, userId: string }` | 10 / min |
| `room:leave` | `{ roomId: number, userId: string }` | 10 / min |
| `room:create` | `{ name: string }` | 5 / min |
| `room:delete` | `{ roomId: number }` | 5 / min |
| `message:send` | `{ roomId, userId, text }` (max 500 chars) | 20 / min |
| `message:delete` | `{ roomId, messageId, userId }` | 20 / min |
| `messages:load-more` | `{ roomId, before: number }` | 20 / min |
| `reaction:toggle` | `{ roomId, messageId, userId, emoji }` | 30 / min |
| `typing:start` | `{ roomId, userId }` | 60 / min |
| `typing:stop` | `{ roomId, userId }` | 60 / min |
| `chat:clear` | `{ roomId, userId }` | 10 / min |

### Server → Client events

| Event | Payload | When |
|---|---|---|
| `rooms:list` | `Room[]` | On connect; after room create/delete |
| `user:joined` | `{ userId, timestamp }` | Someone joined your room |
| `user:left` | `{ userId, timestamp }` | Someone left your room |
| `users:list` | `RoomUser[]` | After any join or leave |
| `message:new` | `{ id, roomId, userId, text, createdAt }` | New message in room |
| `message:deleted` | `{ roomId, messageId }` | Message deleted |
| `messages:history` | `{ roomId, messages, hasMore }` | On room join |
| `reactions:snapshot` | `Record<messageId, ReactionMap>` | On room join |
| `reaction:updated` | `{ messageId, reactions }` | Reaction toggled |
| `user:typing` | `{ userId, timestamp }` | Someone started typing |
| `user:typing-stopped` | `{ userId, timestamp }` | Someone stopped typing |
| `chat:cleared` | `{ roomId }` | Room chat cleared |
| `error` | `{ status: 'error', message, timestamp }` | Validation or business error |

### Quick example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Receive initial room list on connect
socket.on('rooms:list', (rooms) => console.log(rooms));

// Join a room and receive history
socket.emit('room:join', { roomId: 1, userId: 'alice' });
socket.on('messages:history', ({ messages, hasMore }) => console.log(messages));

// Send a message
socket.emit('message:send', { roomId: 1, userId: 'alice', text: 'Hello!' });
socket.on('message:new', (msg) => console.log(msg));

// React to a message
socket.emit('reaction:toggle', { roomId: 1, messageId: 42, userId: 'alice', emoji: '👍' });
socket.on('reaction:updated', ({ messageId, reactions }) => console.log(reactions));
```

## REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/rooms` | List all rooms |
| `POST` | `/api/rooms` | Create a room (`{ name }`) |
| `DELETE` | `/api/rooms/:id` | Delete a room |
| `GET` | `/docs` | Scalar interactive API reference |

## Project Structure

```
nest-ws/
├── backend/            # NestJS application — see [backend/README.md](backend/README.md)
│   └── Dockerfile      # Backend Docker image definition
├── frontend/           # Angular application — see [frontend/README.md](frontend/README.md)
│   └── Dockerfile      # Frontend Docker image definition
├── packages/
│   └── shared-types/   # Pure TypeScript interfaces shared across both ends
│       └── src/
│           ├── entities.ts         # Room, RoomUser, Message, ReactionMap
│           ├── events.ts           # SocketEvents const + SocketEventName type
│           └── contracts/          # per-domain request/response interfaces
├── docker-compose.yml      # Development compose — builds images locally
├── docker-compose.prod.yml # Production compose — uses pre-built images from Docker Hub
└── pnpm-workspace.yaml
```

## Notes

- No authentication — `userId` is a free-form string entered at onboarding
- Typing indicators expire automatically after 5 seconds server-side
- SQLite is fine for local dev; swap `database.config.ts` for PostgreSQL in prod
- The Scalar `/docs` page documents WebSocket events as REST endpoints — this is a documentation pattern, not the actual transport
