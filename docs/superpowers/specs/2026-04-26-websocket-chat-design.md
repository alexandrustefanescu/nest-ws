# WebSocket Chat Prototype Design

**Date:** 2026-04-26  
**Goal:** Build a real-time chat backend prototype to learn WebSocket/Socket.io fundamentals in NestJS ecosystem.  
**Scope:** Backend only (Angular frontend will be built separately)

## Overview

A real-time chat application with rooms, presence tracking (user lists), and typing indicators. No authentication required. Data persists to SQLite. Focuses on learning gateways, pipes, interceptors, exception filters, and Socket.io adapters.

## Architecture

### Core Components

**ChatGateway** — Main WebSocket entry point
- Handles 6 core events: `connect`, `join-room`, `send-message`, `typing-start`, `typing-stop`, `disconnect`
- Uses Socket.io rooms for broadcasting to subsets of clients
- Integrates pipes for validation, interceptors for logging, exception filter for error handling
- Built on Fastify adapter for high-performance WebSocket handling

**ChatService** — Business logic for messaging and presence
- `saveMessage(roomId, userId, text)` → saves to DB, returns Message entity
- `getUsersInRoom(roomId)` → fetches active users with timestamps
- `getRoomList()` → fetches all rooms with member counts
- `markUserTyping(roomId, userId)` → ephemeral typing status
- `removeUserFromRoom(roomId, userId)` → cleanup on disconnect

**RoomService** — Room management
- `getAllRooms()` → list all chat rooms
- `createRoom(name)` → create new room (optional)
- `getUsersInRoom(roomId)` → active user list

**DatabaseLayer** — SQLite ORM (TypeORM or similar)
- Tables: `rooms`, `room_users`, `messages`, `typing_status`

### Event Flow

1. **Connect** — Client connects → Gateway returns available rooms list
2. **Join Room** — Client emits `join-room` → validate room exists → add to `room_users` → broadcast `user:joined` to room
3. **Send Message** — Client emits `send-message` → pipe validates length (1-500 chars) → ChatService saves to DB → broadcast `message:new` to room members
4. **Typing Indicators** — Client emits `typing-start` → broadcast `user:typing` to room (no DB save) → Client emits `typing-stop` → broadcast `user:typing-stopped`
5. **Disconnect** — Remove user from all rooms → broadcast `user:left` to affected rooms → cleanup `room_users` and `typing_status` entries

## Data Persistence

**SQLite Schema:**

```sql
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_users (
  id INTEGER PRIMARY KEY,
  room_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(room_id) REFERENCES rooms(id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  room_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(room_id) REFERENCES rooms(id)
);

CREATE TABLE typing_status (
  id INTEGER PRIMARY KEY,
  room_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMP,
  FOREIGN KEY(room_id) REFERENCES rooms(id)
);
```

**Persistence Rules:**
- Rooms and messages persist permanently
- `room_users` entries are created on join, deleted on leave/disconnect
- `typing_status` entries auto-expire on disconnect
- No message history deletion (for prototype)

## Middleware & Cross-Cutting Concerns

### Validation Pipes
- `JoinRoomPipe` — validate `room_id` and `user_id` are provided and room exists
- `SendMessagePipe` — validate message length (1-500 chars), non-empty text, room_id exists
- `TypingPipe` — validate `room_id` provided

### Interceptors
- Log all WebSocket events (connect, join, message sent, disconnect)
- Track message count per room (for future rate-limiting learning)
- Measure event processing latency
- Track active user count in real-time

### Exception Filter
- Catch validation errors from pipes → emit `error:validation` with details
- Catch business logic errors (room not found, user already in room) → emit `error:business`
- Catch unexpected errors → emit `error:server` with safe message (no internal details)
- Log all errors to console

## Docker Setup

**Dockerfile:**
- Node 20+ base image
- Install dependencies, build TypeScript
- Expose WebSocket port (default 3000)
- Uses Fastify as HTTP adapter for NestJS

**Main Application Setup:**
- Replace default Express with Fastify adapter in `main.ts`
- Configure Socket.io on top of Fastify for WebSocket support

**docker-compose.yml:**
- Backend service with SQLite volume mount
- Environment variables for DB path, port, logging level
- Health check on WebSocket endpoint

**Development:**
- Local SQLite file mounted as volume
- Auto-reload on code changes (`start:dev`)
- Logs visible in container output

## Success Criteria

- ✅ Multiple clients can connect simultaneously
- ✅ Users can join/leave rooms
- ✅ Messages broadcast to room members in real-time
- ✅ User list updates when users join/leave
- ✅ Typing indicators show who's typing
- ✅ Data persists to SQLite (survives server restart)
- ✅ Errors broadcast to clients with structured format
- ✅ Docker container runs locally without manual setup
- ✅ Code demonstrates understanding of gateways, pipes, interceptors, filters, adapters

## Learning Outcomes

By completing this prototype, you will understand:
- How NestJS gateways handle WebSocket connections
- How Socket.io rooms enable broadcasting to subsets of clients
- How pipes validate incoming WebSocket events
- How interceptors implement cross-cutting concerns (logging, tracking)
- How exception filters handle and format errors for WebSocket clients
- How to persist WebSocket state to a database
- Basic Docker setup for development

## Future Extensions (Out of Scope)

- Authentication/authorization (guards)
- Message history pagination
- Rate limiting
- Multiple adapters (Redis for scaling)
- Angular frontend
