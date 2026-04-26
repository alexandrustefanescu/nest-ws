# Persistent Chat History, Message Delete & Clear Chat — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Load message history when joining a room (last 50, cursor-paginated), let authors delete their own messages (disappears for everyone), and let any user clear the entire chat for everyone.

**Architecture:** Pure WebSocket (Socket.IO) for all new events. The backend emits `messages:history` to a joining socket, serves `messages:load-more` via ack callback, and broadcasts `message:deleted` / `chat:cleared` to the room. The frontend prepends older pages on scroll-to-top and splices out deleted messages in signal state.

**Tech Stack:** NestJS 11 + TypeORM + SQLite (backend), Angular 20 + signals + Socket.IO client (frontend), pnpm workspaces + Jest.

---

## Task 1: Add new SocketEvents constants to shared-types

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Step 1: Add the six new event constants**

Open `packages/shared-types/src/index.ts` and extend `SocketEvents` with:

```ts
// inside the SocketEvents object, after REACTION_UPDATED:
MESSAGES_HISTORY: 'messages:history',
MESSAGES_LOAD_MORE: 'messages:load-more',
MESSAGE_DELETE: 'message:delete',
MESSAGE_DELETED: 'message:deleted',
CHAT_CLEAR: 'chat:clear',
CHAT_CLEARED: 'chat:cleared',
```

**Step 2: Commit**

```bash
git add packages/shared-types/src/index.ts
git commit -m "feat(shared-types): add socket event constants for history, delete, clear"
```

---

## Task 2: Add `getMessageHistory` to ChatService (TDD)

**Files:**
- Modify: `backend/src/services/chat.service.ts`
- Modify: `backend/src/services/chat.service.spec.ts`

**Step 1: Write the failing tests**

In `chat.service.spec.ts`, add to the mock setup:

```ts
// In the mockMessageRepository declaration, add:
find: jest.Mock;
```

```ts
// In beforeEach, add to mockMessageRepository:
find: jest.fn(),
```

Then add these test cases after the existing ones:

```ts
describe('getMessageHistory', () => {
  it('returns last 50 messages in ascending order when no cursor given', async () => {
    const msgs = [
      { id: 1, roomId: 1, userId: 'u1', text: 'a', createdAt: new Date() },
      { id: 2, roomId: 1, userId: 'u1', text: 'b', createdAt: new Date() },
    ];
    mockMessageRepository.find.mockResolvedValue([...msgs].reverse());

    const result = await service.getMessageHistory(1);

    expect(mockMessageRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId: 1 },
        order: { id: 'DESC' },
        take: 50,
      }),
    );
    expect(result).toEqual(msgs); // ascending
  });

  it('applies before cursor when provided', async () => {
    mockMessageRepository.find.mockResolvedValue([]);

    await service.getMessageHistory(1, 10);

    expect(mockMessageRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ roomId: 1 }),
        order: { id: 'DESC' },
        take: 50,
      }),
    );
  });
});
```

**Step 2: Run to confirm they fail**

```bash
cd backend && pnpm test --testPathPattern=chat.service --no-coverage 2>&1 | tail -20
```
Expected: FAIL — `getMessageHistory is not a function`

**Step 3: Implement `getMessageHistory` in `chat.service.ts`**

Add after `saveMessage`:

```ts
async getMessageHistory(roomId: number, before?: number, limit = 50): Promise<Message[]> {
  const where: Record<string, unknown> = { roomId };
  if (before !== undefined) {
    const { LessThan } = await import('typeorm');
    where['id'] = LessThan(before);
  }
  const messages = await this.messageRepository.find({
    where,
    order: { id: 'DESC' },
    take: limit,
  });
  return messages.reverse();
}
```

> Note: `LessThan` is a TypeORM `FindOperator`. Import it at the top of the file instead of dynamic import: add `LessThan` to the existing `typeorm` import.

The final import line should be:
```ts
import { Repository, LessThan } from 'typeorm';
```

And the method becomes:
```ts
async getMessageHistory(roomId: number, before?: number, limit = 50): Promise<Message[]> {
  const where = before !== undefined
    ? { roomId, id: LessThan(before) }
    : { roomId };
  const messages = await this.messageRepository.find({
    where,
    order: { id: 'DESC' },
    take: limit,
  });
  return messages.reverse();
}
```

**Step 4: Run tests to confirm they pass**

```bash
cd backend && pnpm test --testPathPattern=chat.service --no-coverage 2>&1 | tail -20
```
Expected: PASS (all tests green)

**Step 5: Commit**

```bash
git add backend/src/services/chat.service.ts backend/src/services/chat.service.spec.ts
git commit -m "feat(backend): add getMessageHistory with cursor pagination"
```

---

## Task 3: Add `deleteMessage` to ChatService (TDD)

**Files:**
- Modify: `backend/src/services/chat.service.ts`
- Modify: `backend/src/services/chat.service.spec.ts`

**Step 1: Write the failing tests**

Add to the mock setup in `chat.service.spec.ts`:

```ts
// In the mockMessageRepository declaration, add:
findOne: jest.Mock;
```

```ts
// In beforeEach, add to mockMessageRepository:
findOne: jest.fn(),
```

Add these test cases:

```ts
describe('deleteMessage', () => {
  it('deletes the message when userId matches author', async () => {
    const msg = { id: 5, roomId: 1, userId: 'u1', text: 'hi', createdAt: new Date() };
    mockMessageRepository.findOne.mockResolvedValue(msg);
    mockMessageRepository.delete.mockResolvedValue({ affected: 1 });

    await service.deleteMessage(5, 'u1');

    expect(mockMessageRepository.delete).toHaveBeenCalledWith({ id: 5 });
  });

  it('throws WsException when message not found', async () => {
    mockMessageRepository.findOne.mockResolvedValue(null);

    await expect(service.deleteMessage(99, 'u1')).rejects.toThrow('Not found');
  });

  it('throws WsException when userId is not the author', async () => {
    const msg = { id: 5, roomId: 1, userId: 'author', text: 'hi', createdAt: new Date() };
    mockMessageRepository.findOne.mockResolvedValue(msg);

    await expect(service.deleteMessage(5, 'other-user')).rejects.toThrow('Forbidden');
  });
});
```

**Step 2: Run to confirm they fail**

```bash
cd backend && pnpm test --testPathPattern=chat.service --no-coverage 2>&1 | tail -20
```

**Step 3: Implement `deleteMessage` in `chat.service.ts`**

Add the import at the top of the file:
```ts
import { WsException } from '@nestjs/websockets';
```

Add after `getMessageHistory`:

```ts
async deleteMessage(messageId: number, userId: string): Promise<void> {
  const message = await this.messageRepository.findOne({ where: { id: messageId } });
  if (!message) {
    throw new WsException('Not found');
  }
  if (message.userId !== userId) {
    throw new WsException('Forbidden');
  }
  await this.messageRepository.delete({ id: messageId });
}
```

> Reactions cascade-delete via the `onDelete: 'CASCADE'` already on `MessageReaction.message` foreign key — no explicit reaction cleanup needed.

**Step 4: Run tests**

```bash
cd backend && pnpm test --testPathPattern=chat.service --no-coverage 2>&1 | tail -20
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/chat.service.ts backend/src/services/chat.service.spec.ts
git commit -m "feat(backend): add deleteMessage with authorship check"
```

---

## Task 4: Add `clearRoomMessages` to ChatService (TDD)

**Files:**
- Modify: `backend/src/services/chat.service.ts`
- Modify: `backend/src/services/chat.service.spec.ts`

**Step 1: Write the failing test**

```ts
it('clearRoomMessages deletes only messages and reactions, not users', async () => {
  mockMessageRepository.delete.mockResolvedValue({ affected: 5 });

  await service.clearRoomMessages(1);

  expect(mockMessageRepository.delete).toHaveBeenCalledWith({ roomId: 1 });
  // should NOT touch roomUserRepository
  expect(mockRoomUserRepository.delete).not.toHaveBeenCalled();
});
```

**Step 2: Run to confirm it fails**

```bash
cd backend && pnpm test --testPathPattern=chat.service --no-coverage 2>&1 | tail -20
```

**Step 3: Implement `clearRoomMessages` in `chat.service.ts`**

Add after `deleteMessage`:

```ts
async clearRoomMessages(roomId: number): Promise<void> {
  await this.messageRepository.delete({ roomId });
}
```

> Reactions cascade-delete with messages via the FK — no explicit deletion needed.

**Step 4: Run tests**

```bash
cd backend && pnpm test --testPathPattern=chat.service --no-coverage 2>&1 | tail -20
```
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/chat.service.ts backend/src/services/chat.service.spec.ts
git commit -m "feat(backend): add clearRoomMessages"
```

---

## Task 5: Wire history into `room:join` and add new gateway handlers (TDD)

**Files:**
- Modify: `backend/src/gateways/chat.gateway.ts`
- Modify: `backend/src/gateways/chat.gateway.spec.ts`

**Step 1: Update mock in `chat.gateway.spec.ts`**

Add to `mockChatService` declaration and `beforeEach` initialisation:

```ts
// declaration
getMessageHistory: jest.Mock;
deleteMessage: jest.Mock;
clearRoomMessages: jest.Mock;

// beforeEach
getMessageHistory: jest.fn().mockResolvedValue([]),
deleteMessage: jest.fn(),
clearRoomMessages: jest.fn(),
```

**Step 2: Write failing tests**

```ts
it('emits messages:history to joining socket on room:join', async () => {
  const room = { id: 1, name: 'general', createdAt: new Date() };
  const history = [{ id: 1, roomId: 1, userId: 'u1', text: 'hi', createdAt: new Date() }];
  mockRoomService.getRoomById.mockResolvedValue(room);
  mockChatService.addUserToRoom.mockResolvedValue({});
  mockChatService.getUsersInRoom.mockResolvedValue([]);
  mockChatService.getReactionsForRoom.mockResolvedValue({});
  mockChatService.getMessageHistory.mockResolvedValue(history);

  await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'u1' });

  expect(mockChatService.getMessageHistory).toHaveBeenCalledWith(1);
  expect(mockSocket.emit).toHaveBeenCalledWith(
    'messages:history',
    { roomId: 1, messages: history, hasMore: false },
  );
});

it('hasMore is true when history returns exactly 50 messages', async () => {
  const room = { id: 1, name: 'general', createdAt: new Date() };
  const history = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1, roomId: 1, userId: 'u1', text: `msg${i}`, createdAt: new Date(),
  }));
  mockRoomService.getRoomById.mockResolvedValue(room);
  mockChatService.addUserToRoom.mockResolvedValue({});
  mockChatService.getUsersInRoom.mockResolvedValue([]);
  mockChatService.getReactionsForRoom.mockResolvedValue({});
  mockChatService.getMessageHistory.mockResolvedValue(history);

  await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'u1' });

  expect(mockSocket.emit).toHaveBeenCalledWith(
    'messages:history',
    expect.objectContaining({ hasMore: true }),
  );
});

it('handleLoadMore returns paginated messages via ack', async () => {
  const history = [{ id: 5, roomId: 1, userId: 'u1', text: 'old', createdAt: new Date() }];
  mockChatService.getMessageHistory.mockResolvedValue(history);

  const result = await gateway.handleLoadMore({ roomId: 1, before: 10 });

  expect(mockChatService.getMessageHistory).toHaveBeenCalledWith(1, 10);
  expect(result).toEqual({ messages: history, hasMore: false });
});

it('handleDeleteMessage broadcasts message:deleted to room', async () => {
  mockChatService.deleteMessage.mockResolvedValue(undefined);

  await gateway.handleDeleteMessage(mockSocket, { roomId: 1, messageId: 42, userId: 'u1' });

  expect(mockChatService.deleteMessage).toHaveBeenCalledWith(42, 'u1');
  expect(mockServer.to).toHaveBeenCalledWith('room-1');
  expect(mockTo.emit).toHaveBeenCalledWith('message:deleted', { roomId: 1, messageId: 42 });
});

it('handleClearChat broadcasts chat:cleared to room', async () => {
  mockChatService.clearRoomMessages.mockResolvedValue(undefined);

  await gateway.handleClearChat(mockSocket, { roomId: 1, userId: 'u1' });

  expect(mockChatService.clearRoomMessages).toHaveBeenCalledWith(1);
  expect(mockServer.to).toHaveBeenCalledWith('room-1');
  expect(mockTo.emit).toHaveBeenCalledWith('chat:cleared', { roomId: 1 });
});
```

**Step 3: Run to confirm they fail**

```bash
cd backend && pnpm test --testPathPattern=chat.gateway --no-coverage 2>&1 | tail -30
```

**Step 4: Implement changes in `chat.gateway.ts`**

1. In `handleJoinRoom`, after emitting `reactions:snapshot`, add:

```ts
const history = await this.chatService.getMessageHistory(roomId);
client.emit('messages:history', {
  roomId,
  messages: history,
  hasMore: history.length === 50,
});
```

2. Add new handler methods:

```ts
@SubscribeMessage('messages:load-more')
async handleLoadMore(
  @MessageBody() data: { roomId: number; before: number },
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const { roomId, before } = data ?? {};
  if (!roomId || !before) return { messages: [], hasMore: false };
  const messages = await this.chatService.getMessageHistory(roomId, before);
  return { messages, hasMore: messages.length === 50 };
}

@SubscribeMessage('message:delete')
async handleDeleteMessage(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: number; messageId: number; userId: string },
): Promise<void> {
  const { roomId, messageId, userId } = data ?? {};
  await this.chatService.deleteMessage(messageId, userId);
  this.server.to(`room-${roomId}`).emit('message:deleted', { roomId, messageId });
}

@SubscribeMessage('chat:clear')
async handleClearChat(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: number; userId: string },
): Promise<void> {
  const { roomId } = data ?? {};
  await this.chatService.clearRoomMessages(roomId);
  this.server.to(`room-${roomId}`).emit('chat:cleared', { roomId });
}
```

Also add `Message` to the imports at the top — it's already imported from `'../entities/message.entity'`, that's fine.

**Step 5: Run tests**

```bash
cd backend && pnpm test --no-coverage 2>&1 | tail -30
```
Expected: all tests PASS

**Step 6: Commit**

```bash
git add backend/src/gateways/chat.gateway.ts backend/src/gateways/chat.gateway.spec.ts
git commit -m "feat(backend): wire history, load-more, delete, clear-chat gateway handlers"
```

---

## Task 6: Update `ChatSocketService` — handle new events and add emit methods

**Files:**
- Modify: `frontend/src/app/chat/chat-socket.service.ts`

**Step 1: Add new signals**

In `ChatSocketService`, after the existing signals, add:

```ts
readonly roomHasMore = signal<Record<number, boolean>>({});
readonly isLoadingMore = signal(false);
```

**Step 2: Register `messages:history` handler**

In the `connect()` method, after the `reaction:updated` handler, add:

```ts
this.socket.on('messages:history', (data: { roomId: number; messages: Message[]; hasMore: boolean }) => {
  this.roomMessages.update((prev) => ({ ...prev, [data.roomId]: data.messages }));
  this.roomHasMore.update((prev) => ({ ...prev, [data.roomId]: data.hasMore }));
});

this.socket.on('message:deleted', (data: { roomId: number; messageId: number }) => {
  this.roomMessages.update((prev) => ({
    ...prev,
    [data.roomId]: (prev[data.roomId] ?? []).filter((m) => m.id !== data.messageId),
  }));
  this.roomReactions.update((prev) => {
    const next = { ...prev };
    delete next[data.messageId];
    return next;
  });
});

this.socket.on('chat:cleared', (data: { roomId: number }) => {
  this.roomMessages.update((prev) => ({ ...prev, [data.roomId]: [] }));
  this.roomReactions.set({});
});
```

**Step 3: Add emit methods**

At the end of the class, before the private helpers, add:

```ts
loadMoreMessages(roomId: number, before: number): void {
  if (this.isLoadingMore()) return;
  this.isLoadingMore.set(true);
  this.socket?.emit(
    'messages:load-more',
    { roomId, before },
    (res: { messages: Message[]; hasMore: boolean }) => {
      this.roomMessages.update((prev) => ({
        ...prev,
        [roomId]: [...res.messages, ...(prev[roomId] ?? [])],
      }));
      this.roomHasMore.update((prev) => ({ ...prev, [roomId]: res.hasMore }));
      this.isLoadingMore.set(false);
    },
  );
}

deleteMessage(roomId: number, messageId: number): void {
  this.socket?.emit('message:delete', { roomId, messageId, userId: this.identity.userId() });
}

clearChat(roomId: number): void {
  this.socket?.emit('chat:clear', { roomId, userId: this.identity.userId() });
}
```

**Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors

**Step 5: Commit**

```bash
git add frontend/src/app/chat/chat-socket.service.ts
git commit -m "feat(frontend): handle history/deleted/cleared events, add load-more/delete/clear methods"
```

---

## Task 7: Add scroll-to-top pagination and clear-chat button to `RoomPage`

**Files:**
- Modify: `frontend/src/app/features/room/room.page.ts`

**Step 1: Add computed signals and scroll handler**

In `RoomPage`, add after the existing `computed` signals:

```ts
readonly hasMore = computed(() => this.chat.roomHasMore()[this.roomId()] ?? false);
readonly isLoadingMore = this.chat.isLoadingMore;
```

**Step 2: Add scroll handler method**

Add after `onTypingChanged`:

```ts
onScroll(event: Event): void {
  const el = event.target as HTMLElement;
  if (el.scrollTop === 0 && this.hasMore() && !this.isLoadingMore()) {
    const msgs = this.messages();
    if (msgs.length > 0) {
      this.chat.loadMoreMessages(this.roomId(), msgs[0].id);
    }
  }
}

onClearChat(): void {
  if (confirm('Clear all messages for everyone? This cannot be undone.')) {
    this.chat.clearChat(this.roomId());
  }
}
```

**Step 3: Update the template**

1. Add `(scroll)="onScroll($event)"` to the `<div #messageList>` element.

2. Add a load-more spinner above the messages:
```html
@if (isLoadingMore()) {
  <div style="display:flex;justify-content:center;padding:8px">
    <mat-spinner diameter="20" />
  </div>
}
```
Place this just inside the `<div #messageList>` as its first child.

3. Add a clear-chat button in the room header, after the online indicator:
```html
<button
  (click)="onClearChat()"
  style="background:none;border:none;cursor:pointer;color:var(--text-faint);display:flex;align-items:center;padding:4px"
  aria-label="Clear chat"
  title="Clear chat"
>
  <mat-icon style="font-size:18px;width:18px;height:18px">delete_sweep</mat-icon>
</button>
```

**Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add frontend/src/app/features/room/room.page.ts
git commit -m "feat(frontend): add scroll-to-top pagination and clear-chat button to RoomPage"
```

---

## Task 8: Add delete button to `MessageBubbleComponent`

**Files:**
- Modify: `frontend/src/app/features/room/message-bubble.component.ts`

**Step 1: Add delete button styles**

In the `styles` array, add:

```css
.delete-btn {
  width: 24px; height: 24px; border-radius: 50%;
  border: 1px solid var(--border-subtle);
  background: var(--surface-1);
  font-size: 13px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; align-self: center;
  transition: background var(--dur-fast) var(--ease-out), opacity var(--dur-fast) var(--ease-out);
  padding: 0; color: var(--text-faint);
  opacity: 0; pointer-events: none;
}
.delete-btn:hover { background: var(--surface-2); color: var(--text-strong); }
.bubble-row:hover .delete-btn,
.bubble-row:focus-within .delete-btn { opacity: 1; pointer-events: auto; }
.bubble-row.own .delete-btn { order: -2; margin-right: 4px; }
```

**Step 2: Add delete button to template**

Inside `.bubble-row`, right before the closing `</div>`, add — but only for own messages:

```html
@if (isOwn()) {
  <button
    class="delete-btn"
    (click)="deleteMsg()"
    aria-label="Delete message"
  >×</button>
}
```

**Step 3: Add `deleteMsg` method to the class**

```ts
deleteMsg(): void {
  this.chat.deleteMessage(this.roomId(), this.message().id);
}
```

**Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

**Step 5: Commit**

```bash
git add frontend/src/app/features/room/message-bubble.component.ts
git commit -m "feat(frontend): add hover-reveal delete button to own messages"
```

---

## Task 9: Add DTOs for new events (Swagger docs)

**Files:**
- Modify: `backend/src/dto/ws-events.dto.ts`

**Step 1: Add DTOs**

Append to `ws-events.dto.ts`:

```ts
export class MessagesHistoryEventDto {
  @ApiProperty({ example: 1, description: 'Emitted as: messages:history — sent to joining socket only' })
  roomId: number;

  @ApiProperty({ type: [MessageNewEventDto] })
  messages: MessageNewEventDto[];

  @ApiProperty({ example: true })
  hasMore: boolean;
}

export class MessageDeletedEventDto {
  @ApiProperty({ example: 1, description: 'Emitted as: message:deleted — broadcast to the room' })
  roomId: number;

  @ApiProperty({ example: 42 })
  messageId: number;
}

export class ChatClearedEventDto {
  @ApiProperty({ example: 1, description: 'Emitted as: chat:cleared — broadcast to the room' })
  roomId: number;
}

export class LoadMoreDto {
  @ApiProperty({ example: 1, description: 'Client → server: messages:load-more' })
  roomId: number;

  @ApiProperty({ example: 100, description: 'Fetch messages with id < before' })
  before: number;
}

export class DeleteMessageDto {
  @ApiProperty({ example: 1, description: 'Client → server: message:delete' })
  roomId: number;

  @ApiProperty({ example: 42 })
  messageId: number;

  @ApiProperty({ example: 'user-123' })
  userId: string;
}

export class ClearChatDto {
  @ApiProperty({ example: 1, description: 'Client → server: chat:clear' })
  roomId: number;

  @ApiProperty({ example: 'user-123' })
  userId: string;
}
```

**Step 2: Commit**

```bash
git add backend/src/dto/ws-events.dto.ts
git commit -m "docs(backend): add DTOs for history, delete, and clear-chat events"
```

---

## Task 10: Final verification

**Step 1: Run all backend tests**

```bash
cd backend && pnpm test --no-coverage 2>&1 | tail -20
```
Expected: all suites PASS, no failures.

**Step 2: Run frontend type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```
Expected: no errors.

**Step 3: Manual smoke test**

1. Start backend: `cd backend && pnpm dev`
2. Start frontend: `cd frontend && pnpm dev` (or `pnpm start`)
3. Open two browser tabs, join the same room as different users.
4. Send a few messages — verify they appear in both tabs.
5. **Reload one tab** — verify history loads (messages visible before connecting).
6. Send 50+ messages, reload — verify the "scroll to top" loads older page.
7. Hover own message — verify delete `×` appears; click it — verify disappears in both tabs.
8. Click the trash (clear chat) button in the header — confirm dialog — verify both tabs clear.
