# Emoji Picker + Message Reactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a lightweight emoji picker to the message composer and fixed-set emoji reactions (👍 ❤️ 😂 😮 😢 🔥) to chat messages, persisted in SQLite and broadcast over Socket.IO.

**Architecture:** New `message_reactions` DB table stores `(messageId, userId, emoji)` with a unique constraint; `ChatService.toggleReaction` upserts/deletes; `room:join` now also emits a `reactions:snapshot`; frontend tracks reactions in a new `roomReactions` signal and renders pills + picker inline on bubbles.

**Tech Stack:** NestJS + TypeORM + SQLite (backend), Angular 21 signals + Socket.IO client (frontend), no new npm dependencies.

---

### Task 1: MessageReaction entity

**Files:**
- Create: `src/entities/message-reaction.entity.ts`
- Modify: `src/app.module.ts`

**Step 1: Create the entity**

```ts
// src/entities/message-reaction.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Message } from './message.entity';

@Entity('message_reactions')
@Unique(['messageId', 'userId', 'emoji'])
export class MessageReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  messageId: number;

  @Column()
  userId: string;

  @Column()
  emoji: string;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
```

**Step 2: Register in AppModule**

In `src/app.module.ts`, add `MessageReaction` to both the `TypeOrmModule.forFeature([...])` array and the import at the top:

```ts
import { MessageReaction } from './entities/message-reaction.entity';
// ...
TypeOrmModule.forFeature([Room, RoomUser, Message, TypingStatus, MessageReaction]),
```

**Step 3: Run backend tests to confirm nothing broke**

```bash
cd /Users/alexandrustefanescu/Desktop/nest-ws && pnpm test 2>&1 | tail -15
```
Expected: all existing tests still pass.

**Step 4: Commit**

```bash
git add src/entities/message-reaction.entity.ts src/app.module.ts
git commit -m "feat: add MessageReaction entity"
```

---

### Task 2: ChatService — toggleReaction + getReactionsForRoom

**Files:**
- Modify: `src/services/chat.service.ts`
- Modify: `src/services/chat.service.spec.ts`

**Step 1: Write the failing tests**

Add this block to `src/services/chat.service.spec.ts`.

Add `MessageReaction` to imports at the top:
```ts
import { MessageReaction } from '../entities/message-reaction.entity';
```

Add `mockReactionRepository` in the `describe` block alongside the existing mocks:
```ts
let mockReactionRepository: {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
  find: jest.Mock;
};
```

In `beforeEach`, initialise it and wire it up:
```ts
mockReactionRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
};
// Add to providers array:
{ provide: getRepositoryToken(MessageReaction), useValue: mockReactionRepository },
```

Add `MessageReaction` to the `ChatService` provider declaration (constructor injection requires it). Also update the `ChatService` constructor in the test — see Step 3 for the new signature.

Add the test cases:
```ts
describe('toggleReaction', () => {
  it('should add a reaction when none exists', async () => {
    mockReactionRepository.findOne.mockResolvedValue(null);
    mockReactionRepository.create.mockReturnValue({ messageId: 1, userId: 'u1', emoji: '👍' });
    mockReactionRepository.save.mockResolvedValue({ id: 1, messageId: 1, userId: 'u1', emoji: '👍' });
    mockReactionRepository.find.mockResolvedValue([
      { messageId: 1, userId: 'u1', emoji: '👍' },
    ]);

    const result = await service.toggleReaction(1, 'u1', '👍');

    expect(mockReactionRepository.save).toHaveBeenCalled();
    expect(result).toEqual({ '👍': ['u1'] });
  });

  it('should remove a reaction when it already exists', async () => {
    mockReactionRepository.findOne.mockResolvedValue({ id: 1, messageId: 1, userId: 'u1', emoji: '👍' });
    mockReactionRepository.delete.mockResolvedValue({ affected: 1 });
    mockReactionRepository.find.mockResolvedValue([]);

    const result = await service.toggleReaction(1, 'u1', '👍');

    expect(mockReactionRepository.delete).toHaveBeenCalledWith({ messageId: 1, userId: 'u1', emoji: '👍' });
    expect(result).toEqual({});
  });
});

describe('getReactionsForRoom', () => {
  it('should return aggregated reactions keyed by messageId', async () => {
    mockReactionRepository.find.mockResolvedValue([
      { messageId: 1, userId: 'u1', emoji: '👍' },
      { messageId: 1, userId: 'u2', emoji: '👍' },
      { messageId: 2, userId: 'u1', emoji: '❤️' },
    ]);

    const result = await service.getReactionsForRoom(5);

    expect(result).toEqual({
      1: { '👍': ['u1', 'u2'] },
      2: { '❤️': ['u1'] },
    });
  });

  it('should return empty object when no reactions', async () => {
    mockReactionRepository.find.mockResolvedValue([]);
    const result = await service.getReactionsForRoom(5);
    expect(result).toEqual({});
  });
});
```

**Step 2: Run tests — expect failures**

```bash
pnpm test 2>&1 | grep -E "FAIL|PASS|toggleReaction|getReactionsForRoom"
```
Expected: new tests fail with "not a function" or "undefined".

**Step 3: Implement in ChatService**

Add to `src/services/chat.service.ts`:

```ts
import { MessageReaction } from '../entities/message-reaction.entity';

// In constructor, add:
@InjectRepository(MessageReaction)
private reactionRepository: Repository<MessageReaction>,

// New methods:
async toggleReaction(
  messageId: number,
  userId: string,
  emoji: string,
): Promise<Record<string, string[]>> {
  const existing = await this.reactionRepository.findOne({
    where: { messageId, userId, emoji },
  });
  if (existing) {
    await this.reactionRepository.delete({ messageId, userId, emoji });
  } else {
    const reaction = this.reactionRepository.create({ messageId, userId, emoji });
    await this.reactionRepository.save(reaction);
  }
  return this.aggregateReactions(
    await this.reactionRepository.find({ where: { messageId } }),
  );
}

async getReactionsForRoom(roomId: number): Promise<Record<number, Record<string, string[]>>> {
  const reactions = await this.reactionRepository
    .createQueryBuilder('r')
    .innerJoin('r.message', 'm')
    .where('m.roomId = :roomId', { roomId })
    .getMany();

  const result: Record<number, Record<string, string[]>> = {};
  for (const r of reactions) {
    if (!result[r.messageId]) result[r.messageId] = {};
    if (!result[r.messageId][r.emoji]) result[r.messageId][r.emoji] = [];
    result[r.messageId][r.emoji].push(r.userId);
  }
  return result;
}

private aggregateReactions(reactions: MessageReaction[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const r of reactions) {
    if (!result[r.emoji]) result[r.emoji] = [];
    result[r.emoji].push(r.userId);
  }
  return result;
}
```

Also add `MessageReaction` to the `clearRoomData` method — reactions cascade-delete via the FK, so no explicit delete needed there.

**Step 4: Run tests — expect pass**

```bash
pnpm test 2>&1 | tail -10
```
Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/services/chat.service.ts src/services/chat.service.spec.ts
git commit -m "feat: add toggleReaction and getReactionsForRoom to ChatService"
```

---

### Task 3: ChatGateway — reaction:toggle handler + snapshot on join

**Files:**
- Modify: `src/gateways/chat.gateway.ts`
- Modify: `src/gateways/chat.gateway.spec.ts`

**Step 1: Write failing gateway tests**

In `chat.gateway.spec.ts`, add `toggleReaction` and `getReactionsForRoom` to `mockChatService`:
```ts
mockChatService = {
  // ...existing,
  toggleReaction: jest.fn(),
  getReactionsForRoom: jest.fn().mockResolvedValue({}),
};
```

Add test cases:
```ts
it('should emit reactions:snapshot on room join', async () => {
  const room = { id: 1, name: 'general', createdAt: new Date() };
  mockRoomService.getRoomById.mockResolvedValue(room);
  mockChatService.addUserToRoom.mockResolvedValue({});
  mockChatService.getUsersInRoom.mockResolvedValue([]);
  mockChatService.getReactionsForRoom.mockResolvedValue({ 1: { '👍': ['u1'] } });

  await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'user1' });

  expect(mockSocket.emit).toHaveBeenCalledWith('reactions:snapshot', { 1: { '👍': ['u1'] } });
});

it('should toggle reaction and broadcast reaction:updated', async () => {
  mockChatService.toggleReaction.mockResolvedValue({ '👍': ['u1'] });

  await gateway.handleToggleReaction(mockSocket, {
    roomId: 1,
    messageId: 42,
    userId: 'u1',
    emoji: '👍',
  });

  expect(mockChatService.toggleReaction).toHaveBeenCalledWith(42, 'u1', '👍');
  expect(mockServer.to).toHaveBeenCalledWith('room-1');
  expect(mockTo.emit).toHaveBeenCalledWith('reaction:updated', {
    messageId: 42,
    reactions: { '👍': ['u1'] },
  });
});

it('should throw WsException for invalid emoji', async () => {
  await expect(
    gateway.handleToggleReaction(mockSocket, {
      roomId: 1,
      messageId: 1,
      userId: 'u1',
      emoji: '💀',
    }),
  ).rejects.toThrow(WsException);
});
```

**Step 2: Run tests — expect failures**

```bash
pnpm test 2>&1 | grep -E "FAIL|PASS|snapshot|reaction"
```

**Step 3: Implement in ChatGateway**

Add to `src/gateways/chat.gateway.ts`:

```ts
const ALLOWED_REACTIONS = new Set(['👍', '❤️', '😂', '😮', '😢', '🔥']);

// In handleJoinRoom, after emitting users:list, add:
const snapshot = await this.chatService.getReactionsForRoom(roomId);
client.emit('reactions:snapshot', snapshot);

// New handler:
@SubscribeMessage('reaction:toggle')
async handleToggleReaction(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { roomId: number; messageId: number; userId: string; emoji: string },
) {
  const { roomId, messageId, userId, emoji } = data ?? {};
  if (!ALLOWED_REACTIONS.has(emoji)) {
    throw new WsException('Invalid emoji');
  }
  const reactions = await this.chatService.toggleReaction(messageId, userId, emoji);
  this.server.to(`room-${roomId}`).emit('reaction:updated', { messageId, reactions });
}
```

**Step 4: Run all backend tests**

```bash
pnpm test 2>&1 | tail -10
```
Expected: all pass.

**Step 5: Commit**

```bash
git add src/gateways/chat.gateway.ts src/gateways/chat.gateway.spec.ts
git commit -m "feat: add reaction:toggle gateway handler and reactions:snapshot on join"
```

---

### Task 4: Frontend models + ChatSocketService

**Files:**
- Modify: `frontend/src/app/chat/chat.models.ts`
- Modify: `frontend/src/app/chat/chat-socket.service.ts`

**Step 1: Extend chat.models.ts**

Add the reaction map type:
```ts
export type ReactionMap = Record<string, string[]>; // { [emoji]: userId[] }
```

**Step 2: Extend ChatSocketService**

Add signal and socket wiring to `frontend/src/app/chat/chat-socket.service.ts`:

```ts
// New signal (alongside existing ones):
readonly roomReactions = signal<Record<number, ReactionMap>>({});
// keyed [messageId] → { [emoji]: userId[] }
```

In `connect()`, add two new socket listeners:

```ts
this.socket.on('reactions:snapshot', (snapshot: Record<number, ReactionMap>) => {
  this.roomReactions.set(snapshot);
});

this.socket.on('reaction:updated', (data: { messageId: number; reactions: ReactionMap }) => {
  this.roomReactions.update((prev) => ({
    ...prev,
    [data.messageId]: data.reactions,
  }));
});
```

Add the emit method:

```ts
toggleReaction(roomId: number, messageId: number, emoji: string): void {
  this.socket?.emit('reaction:toggle', {
    roomId,
    messageId,
    userId: this.identity.userId(),
    emoji,
  });
}
```

**Step 3: Build to confirm no type errors**

```bash
cd /Users/alexandrustefanescu/Desktop/nest-ws/frontend && pnpm build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add frontend/src/app/chat/chat.models.ts frontend/src/app/chat/chat-socket.service.ts
git commit -m "feat: add roomReactions signal and toggleReaction to ChatSocketService"
```

---

### Task 5: MessageBubbleComponent — reactions UI

**Files:**
- Modify: `frontend/src/app/features/room/message-bubble.component.ts`

**Step 1: Add new inputs and inject ChatSocketService**

The component needs:
- `reactions = input<ReactionMap>({})` 
- `roomId = input.required<number>()`
- Inject `ChatSocketService` and `IdentityService`
- A `showPicker = signal(false)` for the inline reaction picker
- A `computed` for the allowed emoji set

**Step 2: Replace the full component**

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Message } from '../../chat/chat.models';
import type { ReactionMap } from '../../chat/chat.models';
import { ChatSocketService } from '../../chat/chat-socket.service';
import { IdentityService } from '../../chat/identity.service';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

@Component({
  selector: 'app-message-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.margin-top.px]': 'firstInGroup() ? 16 : 4',
  },
  styles: [`
    :host { display: block; }

    .author-label {
      font-size: 12px; line-height: 16px; font-weight: 500;
      color: var(--text-muted); margin-bottom: 2px; padding-left: 4px;
    }

    .bubble-row { display: flex; position: relative; }
    .bubble-row.own { justify-content: flex-end; }
    .bubble-row.other { justify-content: flex-start; }

    .bubble {
      position: relative; max-width: 65ch;
      padding: 8px 12px; border-radius: var(--radius-bubble);
      font-size: 14px; line-height: 20px; word-break: break-words;
      white-space: pre-wrap; animation: message-in 180ms var(--ease-out) both;
    }
    .bubble.own {
      background: var(--accent); color: var(--accent-fg);
      border-bottom-right-radius: 4px;
    }
    .bubble.other {
      background: var(--surface-2); color: var(--text-strong);
      border-bottom-left-radius: 4px;
    }

    .bubble-text { margin: 0; }

    .timestamp {
      font-size: 11px; line-height: 16px; margin-top: 2px; text-align: right;
    }
    .bubble.own .timestamp { color: oklch(from var(--accent-fg) l c h / 0.55); }
    .bubble.other .timestamp { color: var(--text-faint); }
    .timestamp.hidden { visibility: hidden; height: 0; margin: 0; overflow: hidden; }

    .reaction-trigger {
      position: absolute; top: 4px;
      width: 24px; height: 24px; border-radius: 50%;
      border: 1px solid var(--border-subtle);
      background: var(--surface-1);
      font-size: 13px; cursor: pointer;
      display: none; align-items: center; justify-content: center;
      transition: background var(--dur-fast) var(--ease-out);
      padding: 0;
    }
    .reaction-trigger:hover { background: var(--surface-2); }
    .bubble-row:hover .reaction-trigger,
    .bubble-row:focus-within .reaction-trigger { display: flex; }
    .bubble-row.own .reaction-trigger { left: -30px; }
    .bubble-row.other .reaction-trigger { right: -30px; }

    .reaction-picker {
      position: absolute; top: -4px; z-index: 50;
      display: flex; gap: 4px;
      background: var(--surface-1);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 6px 8px;
      box-shadow: 0 4px 16px oklch(0% 0 0 / 0.12);
    }
    .bubble-row.own .reaction-picker { right: -4px; }
    .bubble-row.other .reaction-picker { left: -4px; }

    .picker-emoji-btn {
      width: 32px; height: 32px; border-radius: var(--radius-xs);
      border: none; background: none; cursor: pointer; font-size: 18px;
      transition: background var(--dur-fast) var(--ease-out);
      display: flex; align-items: center; justify-content: center;
      padding: 0;
    }
    .picker-emoji-btn:hover { background: var(--surface-2); }

    .reactions-row {
      display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
    }
    .bubble-row.own .reactions-row { justify-content: flex-end; }

    .reaction-pill {
      display: flex; align-items: center; gap: 3px;
      padding: 2px 7px; border-radius: 999px;
      font-size: 12px; font-weight: 500; cursor: pointer;
      border: 1px solid transparent;
      transition: background var(--dur-fast) var(--ease-out);
    }
    .reaction-pill.mine {
      background: var(--accent); color: var(--accent-fg);
      border-color: var(--accent);
    }
    .reaction-pill.others {
      background: var(--surface-2); color: var(--text-strong);
      border-color: var(--border-subtle);
    }
    .reaction-pill:hover { opacity: 0.8; }
  `],
  template: `
    @if (!isOwn() && firstInGroup()) {
      <p class="author-label">{{ message().userId }}</p>
    }

    <div class="bubble-row" [class]="isOwn() ? 'own' : 'other'">
      <article
        class="bubble"
        [class]="isOwn() ? 'own' : 'other'"
        [attr.aria-label]="message().userId + ' at ' + time() + ': ' + message().text"
      >
        <p class="bubble-text">{{ message().text }}</p>
        <p class="timestamp" [class.hidden]="!lastInGroup()">{{ time() }}</p>
      </article>

      <button
        class="reaction-trigger"
        (click)="togglePicker()"
        aria-label="Add reaction"
        [attr.aria-expanded]="showPicker()"
      >😊</button>

      @if (showPicker()) {
        <div
          class="reaction-picker"
          role="dialog"
          aria-label="Pick a reaction"
        >
          @for (emoji of reactionEmojis; track emoji) {
            <button
              class="picker-emoji-btn"
              (click)="react(emoji)"
              [attr.aria-label]="emoji"
            >{{ emoji }}</button>
          }
        </div>
      }
    </div>

    @if (hasReactions()) {
      <div class="reactions-row" [class]="isOwn() ? 'own' : ''">
        @for (entry of reactionEntries(); track entry.emoji) {
          <button
            class="reaction-pill"
            [class.mine]="entry.isMine"
            [class.others]="!entry.isMine"
            (click)="react(entry.emoji)"
            [attr.aria-label]="entry.emoji + ' ' + entry.count + (entry.count === 1 ? ' reaction' : ' reactions') + (entry.isMine ? ', active' : '')"
            [attr.aria-pressed]="entry.isMine"
          >
            <span>{{ entry.emoji }}</span>
            <span>{{ entry.count }}</span>
          </button>
        }
      </div>
    }
  `,
})
export class MessageBubbleComponent {
  readonly message = input.required<Message>();
  readonly currentUserId = input.required<string>();
  readonly firstInGroup = input(true);
  readonly lastInGroup = input(true);
  readonly reactions = input<ReactionMap>({});
  readonly roomId = input.required<number>();

  private readonly chat = inject(ChatSocketService);

  readonly reactionEmojis = REACTION_EMOJIS;
  readonly showPicker = signal(false);

  readonly isOwn = computed(() => this.message().userId === this.currentUserId());
  readonly time = computed(() =>
    new Date(this.message().createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );
  readonly hasReactions = computed(() => Object.keys(this.reactions()).length > 0);
  readonly reactionEntries = computed(() =>
    Object.entries(this.reactions()).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      isMine: users.includes(this.currentUserId()),
    })),
  );

  togglePicker(): void {
    this.showPicker.update((v) => !v);
  }

  react(emoji: string): void {
    this.chat.toggleReaction(this.roomId(), this.message().id, emoji);
    this.showPicker.set(false);
  }
}
```

**Step 3: Build to confirm no errors**

```bash
cd /Users/alexandrustefanescu/Desktop/nest-ws/frontend && pnpm build 2>&1 | grep -E "error|warning|complete"
```

**Step 4: Commit**

```bash
git add frontend/src/app/features/room/message-bubble.component.ts
git commit -m "feat: add emoji reactions UI to MessageBubbleComponent"
```

---

### Task 6: RoomPage — wire reactions to bubbles

**Files:**
- Modify: `frontend/src/app/features/room/room.page.ts`

**Step 1: Pass reactions and roomId to each bubble**

In `room.page.ts`, update the `@for` loop inside the message list to pass two new bindings:

```html
<app-message-bubble
  [message]="item.msg"
  [currentUserId]="identity.userId()"
  [firstInGroup]="item.firstInGroup"
  [lastInGroup]="item.lastInGroup"
  [reactions]="chat.roomReactions()[item.msg.id] ?? {}"
  [roomId]="roomId()"
/>
```

**Step 2: Build**

```bash
pnpm build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add frontend/src/app/features/room/room.page.ts
git commit -m "feat: wire roomReactions into message bubbles"
```

---

### Task 7: MessageComposerComponent — emoji picker button

**Files:**
- Modify: `frontend/src/app/features/room/message-composer.component.ts`

**Step 1: Add emoji picker panel**

The composer gets a `😊` ghost button to the left of the send button. Clicking it toggles a small inline panel with ~40 common emoji grouped by category. Selecting one inserts it at the textarea cursor.

Replace `message-composer.component.ts` with:

```ts
import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatIconModule } from '@angular/material/icon';

const COMMON_EMOJI = [
  '😀','😂','😍','🥰','😎','🤔','😅','😭','🥹','😤',
  '👍','👎','❤️','🔥','✨','🎉','👏','🙏','💯','🤝',
  '😊','🤣','😇','🥳','😢','😡','🤯','😴','🫡','💀',
  '🐶','🐱','🦊','🍕','🍔','☕','🎮','🏆','💡','🌙',
];

@Component({
  selector: 'app-message-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TextFieldModule, MatIconModule],
  styles: [`
    .composer-wrap {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border-subtle);
      background: var(--surface-1b);
      position: relative;
    }

    .composer-field {
      flex: 1; display: flex; align-items: flex-end;
      background: var(--surface-1); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md); padding: 10px 14px;
      transition: border-color var(--dur-fast) var(--ease-out);
    }
    .composer-field:focus-within { border-color: var(--accent); }

    textarea {
      flex: 1; resize: none; border: none; outline: none;
      background: transparent; font-family: inherit;
      font-size: 14px; line-height: 20px; color: var(--text-strong); width: 100%;
    }
    textarea::placeholder { color: var(--text-faint); }
    textarea:disabled { opacity: 0.5; cursor: not-allowed; }

    .emoji-btn, .send-btn {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; padding: 0;
      transition: opacity var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
    }

    .emoji-btn {
      background: var(--surface-2); font-size: 18px;
      border: 1px solid var(--border-subtle);
    }
    .emoji-btn:hover { background: var(--surface-1); }

    .send-btn {
      background: var(--accent); color: var(--accent-fg);
      box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.1);
    }
    .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .send-btn:not(:disabled):hover { opacity: 0.85; }

    .emoji-panel {
      position: absolute; bottom: calc(100% + 8px); left: 16px;
      background: var(--surface-1); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md); padding: 8px;
      display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px;
      box-shadow: 0 4px 16px oklch(0% 0 0 / 0.12); z-index: 50;
    }

    .ep-btn {
      width: 32px; height: 32px; border: none; background: none;
      cursor: pointer; font-size: 18px; border-radius: var(--radius-xs);
      display: flex; align-items: center; justify-content: center; padding: 0;
      transition: background var(--dur-fast) var(--ease-out);
    }
    .ep-btn:hover { background: var(--surface-2); }
  `],
  template: `
    @if (showEmojiPanel()) {
      <div class="emoji-panel" role="dialog" aria-label="Emoji picker">
        @for (emoji of commonEmoji; track emoji) {
          <button class="ep-btn" (click)="insertEmoji(emoji)" [attr.aria-label]="emoji">{{ emoji }}</button>
        }
      </div>
    }

    <div class="composer-wrap">
      <button
        class="emoji-btn"
        type="button"
        (click)="toggleEmojiPanel()"
        [attr.aria-expanded]="showEmojiPanel()"
        aria-label="Emoji picker"
      >😊</button>

      <div class="composer-field">
        <textarea
          #textarea
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
          [disabled]="disabled()"
          cdkTextareaAutosize
          cdkAutosizeMinRows="1"
          cdkAutosizeMaxRows="5"
          (keydown.enter)="onEnter($event)"
          (input)="onInput()"
          placeholder="Type a message…"
          aria-label="Message"
        ></textarea>
      </div>

      <button
        class="send-btn"
        [disabled]="disabled() || !text().trim()"
        (click)="send()"
        aria-label="Send message"
      >
        <mat-icon style="font-size:18px;width:18px;height:18px">send</mat-icon>
      </button>
    </div>
  `,
})
export class MessageComposerComponent {
  readonly disabled = input(false);
  readonly messageSent = output<string>();
  readonly typingChanged = output<boolean>();

  protected text = signal('');
  protected showEmojiPanel = signal(false);
  protected commonEmoji = COMMON_EMOJI;

  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  toggleEmojiPanel(): void {
    this.showEmojiPanel.update((v) => !v);
  }

  insertEmoji(emoji: string): void {
    const el = this.textareaRef()?.nativeElement;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const current = this.text();
      this.text.set(current.slice(0, start) + emoji + current.slice(end));
      // restore cursor after inserted emoji
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + [...emoji].length;
        el.focus();
      });
    } else {
      this.text.update((v) => v + emoji);
    }
    this.showEmojiPanel.set(false);
    this.typingChanged.emit(true);
  }

  onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.send();
  }

  onInput(): void {
    this.typingChanged.emit(this.text().length > 0);
  }

  send(): void {
    const trimmed = this.text().trim();
    if (!trimmed || this.disabled()) return;
    this.messageSent.emit(trimmed);
    this.text.set('');
    this.typingChanged.emit(false);
  }
}
```

**Step 2: Build and confirm clean**

```bash
pnpm build 2>&1 | tail -5
```
Expected: `Application bundle generation complete.` with no errors.

**Step 3: Commit**

```bash
git add frontend/src/app/features/room/message-composer.component.ts
git commit -m "feat: add emoji picker panel to message composer"
```

---

### Task 8: Final verification

**Step 1: Run all backend tests**

```bash
cd /Users/alexandrustefanescu/Desktop/nest-ws && pnpm test 2>&1 | tail -10
```
Expected: all pass.

**Step 2: Run frontend build**

```bash
cd /Users/alexandrustefanescu/Desktop/nest-ws/frontend && pnpm build 2>&1 | tail -5
```
Expected: clean build.

**Step 3: Run frontend tests**

```bash
pnpm test 2>&1 | tail -10
```
Expected: 1 passed.

**Step 4: Manual smoke test checklist**

Start backend: `cd /Users/alexandrustefanescu/Desktop/nest-ws && pnpm start:dev`
Start frontend: `cd frontend && pnpm start`

- [ ] Open two browser tabs, enter different names on each
- [ ] Join the same room in both tabs
- [ ] Send a message; hover it — `😊` trigger appears
- [ ] Click trigger → 6-emoji picker appears; pick one → pill appears below bubble
- [ ] In the other tab, same pill appears with count 1; click it to add your own → count becomes 2, pill is highlighted for you
- [ ] Click your highlighted pill → count back to 1 (toggle off)
- [ ] Click `😊` button in composer → emoji panel opens; click emoji → inserted at cursor
- [ ] Reload tab → reactions still shown (DB persisted)
