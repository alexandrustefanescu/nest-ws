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
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ChatSocket } from '../../core/chat/chat-socket';
import { Identity } from '../../core/identity/identity';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { ClearChatDialog } from './clear-chat-dialog';
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
    MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatMenuModule, RouterLink,
    MessageBubble, MessageComposer,
  ],
  templateUrl: './room.html',
  styleUrl: './room.css',
})
export class Room implements OnInit, OnDestroy, AfterViewChecked {
  readonly id = input.required<string>();

  readonly chat = inject(ChatSocket);
  readonly identity = inject(Identity);
  private readonly dialog = inject(MatDialog);

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

  private readonly avatarPalette = [
    '#5c7cfa', '#74c0fc', '#63e6be', '#a9e34b',
    '#ffd43b', '#ffa94d', '#ff8787', '#da77f2',
  ];

  avatarColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return this.avatarPalette[Math.abs(hash) % this.avatarPalette.length];
  }

  onClearChat(): void {
    this.dialog
      .open(ClearChatDialog, { width: '360px', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.chat.clearChat(this.roomId());
      });
  }

  private scrollToBottom(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
