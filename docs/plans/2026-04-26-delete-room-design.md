# Delete Room Feature Design

## Summary

Allow any user to delete a chat room from the sidebar. Deletion cascades to all messages in the room. All connected clients are notified via a WebSocket broadcast.

## Decisions

- **Who can delete**: anyone (no ownership/auth check)
- **Data on delete**: cascade — all messages in the room are permanently deleted
- **UI entry point**: delete icon button next to each room in the sidebar, visible on hover
- **Transport**: WebSocket event (`room:delete`) — consistent with `room:create`

## Backend

### `RoomService`
Add `deleteRoom(id: number): Promise<void>` using `roomRepository.delete({ id })`.

### Entity cascade
Add `onDelete: 'CASCADE'` to the `Message` entity's `room` foreign key relation so the DB cleans up messages automatically.

### `ChatGateway`
Add `@SubscribeMessage('room:delete')` handler:
- Receives `{ roomId: number }`
- Throws `WsException` if room not found
- Calls `roomService.deleteRoom(roomId)`
- Broadcasts fresh `rooms:list` to all clients

## Frontend

### `ChatSocketService`
Add `deleteRoom(roomId: number): void` — emits `room:delete` event. No new signal; `rooms` signal updates via existing `rooms:list` handler.

### `ShellPage`
- Delete icon button inside the `@for` room loop, shown on hover via CSS group/hover
- On click: calls `chat.deleteRoom(room.id)`
- Adds an `effect()` watching `chat.rooms()` — if the active route's room ID is gone from the list, navigates to `/`

## Data Flow

```
User clicks delete
  → chat.deleteRoom(roomId) emits room:delete
  → Gateway deletes room + cascade messages
  → Gateway broadcasts rooms:list to all clients
  → All clients' rooms signal updates
  → Any client on the deleted room's route navigates to /
```
