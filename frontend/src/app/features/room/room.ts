import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ChatSocketService } from '../../core/chat/chat-socket.service';
import { IdentityService } from '../../core/identity/identity.service';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import type { Message } from '@repo/shared-types';

export interface GroupedMessage {
  msg: Message;
  firstInGroup: boolean;
  lastInGroup: boolean;
}

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 overflow-hidden min-h-0' },
  imports: [
    MatProgressSpinnerModule, MatIconModule, RouterLink,
    MessageBubble, MessageComposer,
  ],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room implements OnInit, OnDestroy, AfterViewChecked {
  readonly id = input.required<string>();

  readonly chat = inject(ChatSocketService);
  readonly identity = inject(IdentityService);

  @ViewChild('messageList') private messageList!: ElementRef<HTMLElement>;
  private lastMessageCount = 0;

  readonly roomId = computed(() => Number(this.id()));
  readonly room = computed(() => this.chat.rooms().find((r) => r.id === this.roomId()));
  readonly messages = computed(() => this.chat.roomMessages()[this.roomId()] ?? []);
  readonly users = computed(() => this.chat.roomUsers()[this.roomId()] ?? []);
  readonly typingList = computed(() =>
    [...(this.chat.typingUsers()[this.roomId()] ?? new Set<string>())].filter(
      (u) => u !== this.identity.userId(),
    ),
  );

  readonly enrichedMessages = computed<GroupedMessage[]>(() => {
    const msgs = this.messages();
    return msgs.map((msg, i) => ({
      msg,
      firstInGroup: i === 0 || msgs[i - 1].userId !== msg.userId,
      lastInGroup: i === msgs.length - 1 || msgs[i + 1].userId !== msg.userId,
    }));
  });

  readonly hasMore = computed(() => this.chat.roomHasMore()[this.roomId()] ?? false);
  readonly isLoadingMore = this.chat.isLoadingMore;

  ngOnInit(): void {
    this.chat.joinRoom(this.roomId());
  }

  ngOnDestroy(): void {
    this.chat.leaveRoom(this.roomId());
  }

  ngAfterViewChecked(): void {
    const count = this.messages().length;
    if (count !== this.lastMessageCount) {
      this.lastMessageCount = count;
      this.scrollToBottom();
    }
  }

  onSend(text: string): void {
    this.chat.sendMessage(this.roomId(), text);
  }

  onTypingChanged(active: boolean): void {
    if (active) {
      this.chat.typingStart(this.roomId());
    } else {
      this.chat.typingStop(this.roomId());
    }
  }

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

  private scrollToBottom(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
