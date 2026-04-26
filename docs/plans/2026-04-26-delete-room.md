# Delete Room Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow any user to delete a chat room from the sidebar, permanently removing it and all its messages from every connected client's view.

**Architecture:** A new `room:delete` WebSocket event flows from the frontend through the NestJS gateway, which clears all room data via `ChatService` and removes the room via `RoomService`, then broadcasts a fresh `rooms:list` to all clients. Any client currently viewing the deleted room is redirected to `/` via an Angular `effect()`.

**Tech Stack:** NestJS WebSockets (Socket.IO), TypeORM (SQLite), Angular 21 signals, Angular Material, Tailwind CSS

---

### Task 1: Add `clearRoomData` to ChatService

Deletes all messages, room-users, and typing statuses for a room. Needs to run before the room row is deleted to avoid FK constraint issues with SQLite.

**Files:**
- Modify: `src/services/chat.service.ts`
- Modify: `src/services/chat.service.spec.ts`

**Step 1: Add failing test to `chat.service.spec.ts`**

In the `describe('ChatService')` block, first add `delete: jest.fn()` to ALL three mock repositories (`mockMessageRepository`, `mockRoomUserRepository`, `mockTypingStatusRepository`). Then add:

```typescript
it('should clear all room data', async () => {
  mockMessageRepository.delete.mockResolvedValue({ affected: 3 });
  mockRoomUserRepository.delete.mockResolvedValue({ affected: 2 });
  mockTypingStatusRepository.delete.mockResolvedValue({ affected: 1 });

  await service.clearRoomData(1);

  expect(mockMessageRepository.delete).toHaveBeenCalledWith({ roomId: 1 });
  expect(mockRoomUserRepository.delete).toHaveBeenCalledWith({ roomId: 1 });
  expect(mockTypingStatusRepository.delete).toHaveBeenCalledWith({ roomId: 1 });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=chat.service
```
Expected: FAIL — `service.clearRoomData is not a function`

**Step 3: Implement `clearRoomData` in `chat.service.ts`**

Add after `getTypingUsersInRoom`:

```typescript
async clearRoomData(roomId: number): Promise<void> {
  await this.messageRepository.delete({ roomId });
  await this.roomUserRepository.delete({ roomId });
  await this.typingStatusRepository.delete({ roomId });
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=chat.service
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/services/chat.service.ts src/services/chat.service.spec.ts
git commit -m "feat: add clearRoomData to ChatService"
```

---

### Task 2: Add `deleteRoom` to RoomService

**Files:**
- Modify: `src/services/room.service.ts`
- Modify: `src/services/room.service.spec.ts`

**Step 1: Add failing test to `room.service.spec.ts`**

First add `delete: jest.fn()` to the `mockRoomRepository` object. Then add the test:

```typescript
it('should delete a room', async () => {
  mockRoomRepository.delete.mockResolvedValue({ affected: 1 });

  await service.deleteRoom(1);

  expect(mockRoomRepository.delete).toHaveBeenCalledWith({ id: 1 });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern=room.service
```
Expected: FAIL — `service.deleteRoom is not a function`

**Step 3: Implement `deleteRoom` in `room.service.ts`**

Add after `createRoom`:

```typescript
async deleteRoom(id: number): Promise<void> {
  await this.roomRepository.delete({ id });
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test -- --testPathPattern=room.service
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/services/room.service.ts src/services/room.service.spec.ts
git commit -m "feat: add deleteRoom to RoomService"
```

---

### Task 3: Add `room:delete` handler to ChatGateway

**Files:**
- Modify: `src/gateways/chat.gateway.ts`
- Modify: `src/gateways/chat.gateway.spec.ts`

**Step 1: Add failing test to `chat.gateway.spec.ts`**

First add `deleteRoom: jest.fn()` and `clearRoomData: jest.fn()` to the respective mocks at the top of the describe block. Then add two tests:

```typescript
it('should throw WsException when deleting non-existent room', async () => {
  mockRoomService.getRoomById.mockResolvedValue(null);

  await expect(
    gateway.handleDeleteRoom(mockSocket, { roomId: 99 }),
  ).rejects.toThrow(WsException);
});

it('should delete room, clear data and broadcast rooms list', async () => {
  const room = { id: 1, name: 'general', createdAt: new Date() };
  mockRoomService.getRoomById.mockResolvedValue(room);
  mockChatService.clearRoomData.mockResolvedValue(undefined);
  mockRoomService.deleteRoom.mockResolvedValue(undefined);
  mockRoomService.getAllRooms.mockResolvedValue([]);

  await gateway.handleDeleteRoom(mockSocket, { roomId: 1 });

  expect(mockChatService.clearRoomData).toHaveBeenCalledWith(1);
  expect(mockRoomService.deleteRoom).toHaveBeenCalledWith(1);
  expect(mockServer.emit).toHaveBeenCalledWith('rooms:list', []);
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test -- --testPathPattern=chat.gateway
```
Expected: FAIL — `gateway.handleDeleteRoom is not a function`

**Step 3: Implement the handler in `chat.gateway.ts`**

Add after `handleCreateRoom`:

```typescript
@SubscribeMessage('room:delete')
async handleDeleteRoom(
  @ConnectedSocket() _client: Socket,
  @MessageBody() data: { roomId: number },
) {
  const roomId = Number(data?.roomId);
  if (!roomId) {
    throw new WsException('roomId is required');
  }
  const room = await this.roomService.getRoomById(roomId);
  if (!room) {
    throw new WsException('Room not found');
  }
  await this.chatService.clearRoomData(roomId);
  await this.roomService.deleteRoom(roomId);
  const allRooms = await this.roomService.getAllRooms();
  this.server.emit('rooms:list', allRooms);
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=chat.gateway
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/gateways/chat.gateway.ts src/gateways/chat.gateway.spec.ts
git commit -m "feat: add room:delete WebSocket handler"
```

---

### Task 4: Add `deleteRoom` to frontend ChatSocketService

**Files:**
- Modify: `frontend/src/app/chat/chat-socket.service.ts`

**Step 1: Add `deleteRoom` method**

Add after `createRoom`:

```typescript
deleteRoom(roomId: number): void {
  this.socket?.emit('room:delete', { roomId });
}
```

No new signal needed. When the server responds it will broadcast `rooms:list`, which the existing handler already processes to update the `rooms` signal.

**Step 2: Verify TypeScript compiles**

```bash
cd frontend && pnpm run build 2>&1 | head -30
```
Expected: No type errors related to the new method.

**Step 3: Commit**

```bash
git add frontend/src/app/chat/chat-socket.service.ts
git commit -m "feat: add deleteRoom to ChatSocketService"
```

---

### Task 5: Add delete button to sidebar + navigation guard

**Files:**
- Modify: `frontend/src/app/features/shell/shell.page.ts`

**Step 1: Add `Router` injection and `effect()` for redirect**

Import `Router` from `@angular/router` and `effect` from `@angular/core`. Then add to the class body (after `isSmallScreen`):

```typescript
private readonly router = inject(Router);

constructor() {
  effect(() => {
    const currentId = this.chat.currentRoomId();
    if (currentId === null) return;
    const exists = this.chat.rooms().some((r) => r.id === currentId);
    if (!exists) {
      this.router.navigate(['/']);
    }
  });
}
```

**Step 2: Add delete button to the room list item**

Replace the existing `@for` room loop:

```html
@for (room of chat.rooms(); track room.id) {
  <div class="group relative flex items-center">
    <a
      mat-list-item
      [routerLink]="['/rooms', room.id]"
      routerLinkActive="bg-[var(--mat-sys-secondary-container)]"
      class="flex-1"
    >
      <mat-icon matListItemIcon>tag</mat-icon>
      <span matListItemTitle>{{ room.name }}</span>
    </a>
    <button
      mat-icon-button
      class="absolute right-1 h-7! w-7! opacity-0 group-hover:opacity-100 transition-opacity"
      (click)="deleteRoom(room.id)"
      [attr.aria-label]="'Delete ' + room.name"
      [title]="'Delete ' + room.name"
    >
      <mat-icon class="text-base text-(--mat-sys-error)">delete</mat-icon>
    </button>
  </div>
}
```

**Step 3: Add `deleteRoom` method to `ShellPage` class**

```typescript
deleteRoom(roomId: number): void {
  this.chat.deleteRoom(roomId);
}
```

**Step 4: Verify TypeScript compiles**

```bash
cd frontend && pnpm run build 2>&1 | head -30
```
Expected: No type errors.

**Step 5: Commit**

```bash
git add frontend/src/app/features/shell/shell.page.ts
git commit -m "feat: add delete room button to sidebar with redirect on active room delete"
```

---

### Task 6: Manual smoke test

Start both servers and verify the feature end-to-end:

```bash
# Terminal 1 — backend
pnpm start:dev

# Terminal 2 — frontend
cd frontend && pnpm start
```

Check:
1. Create a room — delete button appears on hover in the sidebar
2. Delete a room you are NOT currently in — it disappears from the list
3. Delete the room you ARE currently in — you are redirected to `/`
4. Open two browser tabs, delete a room from one — it disappears from the other tab's sidebar too
5. Run all backend tests one final time: `pnpm test`
