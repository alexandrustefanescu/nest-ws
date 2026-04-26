# Persistent Chat History, Message Delete & Clear Chat

## Overview

Messages are already persisted in SQLite but the backend never sends history on room join — the frontend only sees messages that arrived while connected. This design adds history loading on join with cursor pagination, author-only message deletion (disappears for everyone), and a clear-chat action that wipes all messages for all users.

## Decisions

- **Transport:** Pure WebSocket (Socket.IO) for all new events — consistent with the existing architecture.
- **Pagination:** Cursor-based (`before: messageId`), not offset — correct for live chat where new messages arrive during pagination.
- **Page size:** 50 messages.
- **Delete permission:** Author only; validated server-side. No soft-delete — message disappears for everyone.
- **Clear chat:** Deletes all messages and their reactions for the room; broadcast to all room members.

## New Socket Events

| Event | Direction | Payload |
|---|---|---|
| `messages:history` | server → client | `{ roomId, messages: Message[], hasMore: boolean }` |
| `messages:load-more` | client → server (ack) | req: `{ roomId, before: number }` · res: `{ messages: Message[], hasMore: boolean }` |
| `message:delete` | client → server | `{ roomId, messageId, userId }` |
| `message:deleted` | server → room | `{ roomId, messageId }` |
| `chat:clear` | client → server | `{ roomId, userId }` |
| `chat:cleared` | server → room | `{ roomId }` |

## Backend

### `ChatService` additions

- `getMessageHistory(roomId, before?, limit=50)` — queries `WHERE id < before ORDER BY id DESC LIMIT 50`, returns results in ascending order. If `before` is omitted, returns the newest 50.
- `deleteMessage(messageId, userId)` — finds message, asserts `message.userId === userId` (throws `WsException('Forbidden')` otherwise), hard-deletes message and its reactions.
- `clearRoomMessages(roomId)` — deletes all messages and reactions for the room. Distinct from `clearRoomData` (used on room delete) which also removes users.

### `ChatGateway` changes

- **`room:join` handler** — after existing join logic, call `getMessageHistory(roomId)` and emit `messages:history` to the joining socket only.
- **`messages:load-more`** — new `@SubscribeMessage` handler, accepts `{ roomId, before }`, returns result via Socket.IO ack callback.
- **`message:delete`** — new handler, calls `deleteMessage`, then broadcasts `message:deleted` to `room-${roomId}`.
- **`chat:clear`** — new handler, calls `clearRoomMessages`, then broadcasts `chat:cleared` to `room-${roomId}`.

### `shared-types` additions

New constants in `SocketEvents`:

```
MESSAGES_HISTORY: 'messages:history'
MESSAGES_LOAD_MORE: 'messages:load-more'
MESSAGE_DELETE: 'message:delete'
MESSAGE_DELETED: 'message:deleted'
CHAT_CLEAR: 'chat:clear'
CHAT_CLEARED: 'chat:cleared'
```

## Frontend

### `ChatSocketService` changes

**New signals:**
- `roomHasMore = signal<Record<number, boolean>>({})` — tracks whether older messages exist per room.
- `isLoadingMore = signal<boolean>(false)` — global loading flag for pagination.

**New event handlers:**
- `messages:history` → set `roomMessages[roomId]` to received batch; set `roomHasMore[roomId]`.
- `message:deleted` → filter message out of `roomMessages[roomId]`; delete `roomReactions[messageId]`.
- `chat:cleared` → set `roomMessages[roomId]` to `[]`; clear all reactions for that room.

**New emit methods:**
- `loadMoreMessages(roomId, before)` — emits `messages:load-more` with ack, prepends results to `roomMessages[roomId]`, updates `roomHasMore[roomId]`.
- `deleteMessage(roomId, messageId)` — emits `message:delete`.
- `clearChat(roomId)` — emits `chat:clear`.

### `RoomPage` changes

- Add scroll listener on `#main-messages`; when `scrollTop === 0` and `hasMore` and not `isLoadingMore`, call `loadMoreMessages`.
- Show a subtle spinner at the top of the message list while `isLoadingMore` is true.
- Add a trash icon button in the room header; on click, show a browser `confirm()` dialog before calling `chat.clearChat(roomId)`.

### `MessageBubbleComponent` changes

- For own messages, render a delete button beside the existing reaction trigger (same hover-reveal pattern, `opacity: 0` → `opacity: 1` on `.bubble-row:hover`).
- Delete button calls `chat.deleteMessage(roomId, message.id)` directly — no confirmation.

## Error Handling

- `message:delete` on a message the user didn't author → `WsException('Forbidden')`, caught by existing `WsExceptionFilter`, no broadcast.
- `messages:load-more` with invalid `roomId` or `before` → returns empty result with `hasMore: false`.
