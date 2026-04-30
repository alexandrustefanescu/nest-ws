import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import type { Message, ReactionMap } from '@repo/shared-types';
import { ChatSocket } from '../../core/chat/chat-socket';
import { DeleteMessageDialog } from './delete-message-dialog';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

@Component({
  selector: 'app-message-bubble',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatChipsModule, MatCardModule],
  templateUrl: './message-bubble.html',
  host: {
    class: 'block relative',
    '[style.margin-top.px]': 'firstInGroup() ? 16 : 4',
  },
})
export class MessageBubble {
  readonly message = input.required<Message>();
  readonly currentUserId = input.required<string>();
  readonly firstInGroup = input(true);
  readonly lastInGroup = input(true);
  readonly showDate = input(false);
  readonly dateString = input<string>('');
  readonly reactions = input<ReactionMap>({});
  readonly roomId = input.required<number>();

  private readonly chat = inject(ChatSocket);
  private readonly dialog = inject(MatDialog);

  readonly reactionEmojis = REACTION_EMOJIS;
  readonly showPicker = signal(false);

  readonly isOwn = computed(() => this.message().userId === this.currentUserId());

  readonly time = computed(() =>
    new Date(this.message().createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );
  readonly hasReactions = computed(() => {
    try {
      const r = this.reactions();
      return r != null && Object.keys(r).length > 0;
    } catch {
      return false;
    }
  });
  readonly reactionEntries = computed(() => {
    try {
      const reactions = this.reactions();
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
    this.dialog
      .open(DeleteMessageDialog, { width: '360px', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.chat.deleteMessage(this.roomId(), this.message().id);
      });
  }
}
