import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [MatIconModule],
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.css',
  host: {
    '[style.margin-top.px]': 'firstInGroup() ? 16 : 4',
  },
})
export class MessageBubble {
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
  readonly hasReactions = computed(() => {
    try {
      const r = this.reactions() as Record<string, string[]> | null | undefined;
      return r != null && Object.keys(r).length > 0;
    } catch {
      return false;
    }
  });
  readonly reactionEntries = computed(() => {
    try {
      const reactions = this.reactions() as Record<string, string[]> | null | undefined;
      if (!reactions) return [];
      return Object.entries(reactions).map(([emoji, users]) => ({
        emoji,
        count: users.length,
        isMine: users.includes(this.currentUserId()),
      }));
    } catch {
      return [];
    }
  });

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
