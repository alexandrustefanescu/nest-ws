import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Message, ReactionMap } from '@repo/shared-types';
import { ChatSocketService } from '../../core/chat/chat-socket.service';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function userHue(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = (h * 33) ^ id.charCodeAt(i);
  return Math.abs(h) % 360;
}

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
      color: oklch(38% 0.14 var(--user-hue));
      margin-bottom: 2px; padding-left: 4px;
    }
    :where(.dark, .dark *) .author-label {
      color: oklch(72% 0.14 var(--user-hue));
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
      background: oklch(88% 0.07 var(--user-hue));
      color: var(--text-strong);
      border-bottom-left-radius: 4px;
    }
    :where(.dark, .dark *) .bubble.other {
      background: oklch(28% 0.09 var(--user-hue));
    }

    .bubble-text { margin: 0; }

    .timestamp {
      font-size: 11px; line-height: 16px; margin-top: 2px; text-align: right;
    }
    .bubble.own .timestamp { color: oklch(from var(--accent-fg) l c h / 0.55); }
    .bubble.other .timestamp { color: var(--text-faint); }
    .timestamp.hidden { visibility: hidden; height: 0; margin: 0; overflow: hidden; }

    .msg-actions {
      position: absolute; top: -18px;
      display: flex; align-items: center; gap: 2px;
      padding: 2px 4px;
      background: var(--surface-1);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      box-shadow: 0 2px 8px oklch(0% 0 0 / 0.10);
      opacity: 0; pointer-events: none;
      transition: opacity var(--dur-fast) var(--ease-out);
      z-index: 10;
    }
    .bubble-row.own .msg-actions { right: 0; }
    .bubble-row.other .msg-actions { left: 0; }
    .bubble-row:hover .msg-actions,
    .bubble-row:focus-within .msg-actions { opacity: 1; pointer-events: auto; }

    .action-btn {
      width: 28px; height: 28px; border-radius: var(--radius-xs);
      border: none; background: none; cursor: pointer; font-size: 15px;
      display: flex; align-items: center; justify-content: center;
      padding: 0; color: var(--text-muted);
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
    }
    .action-btn:hover { background: var(--surface-2); color: var(--text-strong); }
    .action-btn.danger:hover { background: oklch(95% 0.04 25); color: oklch(45% 0.18 25); }
    :where(.dark, .dark *) .action-btn.danger:hover { background: oklch(22% 0.06 25); color: oklch(70% 0.18 25); }

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
    .reactions-row.own { justify-content: flex-end; }

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
      <p class="author-label" [style]="authorStyle()">{{ message().userId }}</p>
    }

    <div class="bubble-row" [class]="isOwn() ? 'own' : 'other'">
      <article
        class="bubble"
        [class]="isOwn() ? 'own' : 'other'"
        [style]="otherBubbleStyle()"
        [attr.aria-label]="message().userId + ' at ' + time() + ': ' + message().text"
      >
        <p class="bubble-text">{{ message().text }}</p>
        <p class="timestamp" [class.hidden]="!lastInGroup()">{{ time() }}</p>
      </article>

      <div class="msg-actions">
        @if (!isOwn()) {
          <button
            class="action-btn"
            (click)="togglePicker()"
            aria-label="Add reaction"
            [attr.aria-expanded]="showPicker()"
          >😊</button>
        }
        @if (isOwn()) {
          <button
            class="action-btn danger"
            (click)="deleteMsg()"
            aria-label="Delete message"
          >🗑️</button>
        }
      </div>

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
      <div class="reactions-row" [class.own]="isOwn()">
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

  private readonly hue = computed(() => userHue(this.message().userId));
  readonly authorStyle = computed(() => `--user-hue:${this.hue()}`);
  readonly otherBubbleStyle = computed(() => this.isOwn() ? null : `--user-hue:${this.hue()}`);
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

  deleteMsg(): void {
    this.chat.deleteMessage(this.roomId(), this.message().id);
  }
}
