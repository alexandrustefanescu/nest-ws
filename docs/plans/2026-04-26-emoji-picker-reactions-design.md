# Emoji Picker + Message Reactions — Design

**Date:** 2026-04-26
**Scope:** (1) Native emoji picker in the message composer; (2) fixed-set emoji reactions on messages, persisted in DB, broadcast via Socket.IO.

---

## Feature 1 — Emoji Picker in Composer

A `😊` ghost icon button sits to the left of the send button in `MessageComposerComponent`. Clicking it triggers the OS-native emoji picker via a hidden `<input type="text">` with `showPicker()`. The selected emoji is inserted at the current cursor position in the textarea.

**No new dependencies.** `showPicker()` is available in all modern browsers (Chrome 99+, Firefox 122+, Safari 15.4+).

---

## Feature 2 — Message Reactions

### Decisions

- **Fixed emoji set:** `👍 ❤️ 😂 😮 😢 🔥`
- **Model:** any number of distinct emoji per message; one entry per `(messageId, userId, emoji)` tuple
- **Toggle:** clicking an emoji you already reacted with removes your reaction
- **Persistence:** stored in DB, survives server restarts; sent to late-joining users on `room:join`

---

## Backend

### New entity: `message_reactions`

```
id          PK (auto-increment)
messageId   FK → messages.id  (ON DELETE CASCADE)
userId      string
emoji       string  (one of the 6 fixed values)
UNIQUE (messageId, userId, emoji)
```

### New `ChatService` methods

```ts
toggleReaction(messageId: number, userId: string, emoji: string): Promise<Record<string, string[]>>
// Inserts if not exists, deletes if exists. Returns updated aggregate for that message.

getReactionsForRoom(roomId: number): Promise<Record<number, Record<string, string[]>>>
// Returns { [messageId]: { [emoji]: userId[] } } for all messages in the room.
```

### New socket events

| Direction | Event | Payload |
|---|---|---|
| client → server | `reaction:toggle` | `{ messageId: number, userId: string, emoji: string }` |
| server → room | `reaction:updated` | `{ messageId: number, reactions: Record<string, string[]> }` |
| server → joining client | `reactions:snapshot` | `Record<number, Record<string, string[]>>` |

`reactions` value is `{ [emoji]: userId[] }` — client derives count from `.length` and highlights from `userId[].includes(currentUserId)`.

### Gateway handler

```
reaction:toggle
  1. Validate emoji is in the allowed set
  2. Call chatService.toggleReaction(messageId, userId, emoji)
  3. Broadcast reaction:updated to room-{roomId}
```

`room:join` already sends message history; extend it to also emit `reactions:snapshot` for the room.

---

## Frontend

### `ChatSocketService` additions

```ts
readonly roomReactions = signal<Record<number, Record<string, string[]>>>({});
// keyed [messageId][emoji] → userId[]
```

- `reactions:snapshot` → `roomReactions.set(snapshot)`
- `reaction:updated` → merge single message update into signal
- `toggleReaction(messageId, roomId, emoji)` → emit `reaction:toggle`

### `MessageBubbleComponent` changes

- New input: `reactions = input<Record<string, string[]>>({})` and `currentUserId`
- **Reaction picker trigger:** ghost smiley button (`😊`, 24×24) appears on bubble hover/focus. Positioned to the right of own bubbles, left of others.
- Clicking trigger opens an inline floating row of 6 emoji buttons (not a dropdown — just an absolutely-positioned `div` that dismisses on outside click or second press).
- **Reaction pills:** rendered below the bubble when any reactions exist. Each pill: `[emoji] [count]` — `bg-accent text-accent-fg` if current user reacted, `bg-surface-2 text-text-strong` otherwise. Clicking a pill calls `toggleReaction`.

### `RoomPage` changes

- Pass `reactions` from `chat.roomReactions()[msg.id] ?? {}` to each `MessageBubbleComponent`.
- Pass `toggleReaction` callback down or have bubble call `ChatSocketService` directly via `inject()`.

---

## Accessibility

- Emoji picker trigger: `aria-label="Add reaction"`, `aria-expanded`
- Each emoji button in the picker: `aria-label` = emoji name (e.g. "thumbs up")
- Reaction pills: `aria-label="{emoji} {count} reaction{s}, {pressed/not pressed}"`
- Picker panel: `role="dialog" aria-label="Pick a reaction"`, closes on `Escape`

---

## Out of scope

- Reactions on historical messages loaded before joining (snapshot covers this)
- Animated reaction burst on add
- Reaction detail tooltip (who reacted)
