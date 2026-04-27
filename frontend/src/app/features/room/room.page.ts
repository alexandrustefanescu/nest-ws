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
import { MessageBubbleComponent } from './message-bubble.component';
import { MessageComposerComponent } from './message-composer.component';
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
    MessageBubbleComponent, MessageComposerComponent,
  ],
  styles: [`
    .room-header {
      height: 56px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 16px;
      background: var(--surface-1b);
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }

    .room-name {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text-strong);
      flex: 1;
    }

    .online-indicator {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .presence-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
    }

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
    }

    .typing-area {
      padding: 4px 16px 4px;
      min-height: 24px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .typing-names {
      font-size: 12px;
      color: var(--text-muted);
    }

    .empty-messages {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      color: var(--text-muted);
    }
  `],
  template: `
    @if (chat.connectionState() === 'connecting' && room() === undefined) {
      <div class="flex items-center justify-center h-full">
        <mat-spinner diameter="36" />
      </div>
    } @else if (room() === undefined) {
      <div class="flex flex-col items-center justify-center h-full gap-3">
        <mat-icon style="color:var(--text-faint);font-size:32px">error_outline</mat-icon>
        <p style="color:var(--text-muted);font-size:14px">Room not found.</p>
        <a routerLink="/" style="color:var(--accent);font-size:13px;text-decoration:none;font-weight:500;">← Back to rooms</a>
      </div>
    } @else {
      <header class="room-header">
        <mat-icon style="color:var(--text-faint);font-size:18px;width:18px;height:18px">chat_bubble_outline</mat-icon>
        <span class="room-name">{{ room()!.name }}</span>
        <div class="online-indicator">
          <span class="presence-dot" aria-hidden="true"></span>
          {{ users().length }} online
        </div>
        <button
          (click)="onClearChat()"
          style="background:none;border:none;cursor:pointer;color:var(--text-faint);display:flex;align-items:center;padding:4px"
          aria-label="Clear chat"
          title="Clear chat"
        >
          <mat-icon style="font-size:18px;width:18px;height:18px">delete_sweep</mat-icon>
        </button>
      </header>

      <div
        #messageList
        id="main-messages"
        class="message-list"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Messages"
        (scroll)="onScroll($event)"
      >
        @if (isLoadingMore()) {
          <div style="display:flex;justify-content:center;padding:8px">
            <mat-spinner diameter="20" />
          </div>
        }
        @if (enrichedMessages().length === 0) {
          <div class="empty-messages">No messages yet — say hi!</div>
        }
        @for (item of enrichedMessages(); track item.msg.id) {
          <app-message-bubble
            [message]="item.msg"
            [currentUserId]="identity.userId()"
            [firstInGroup]="item.firstInGroup"
            [lastInGroup]="item.lastInGroup"
            [reactions]="chat.roomReactions()[item.msg.id]"
            [roomId]="roomId()"
          />
        }
      </div>

      @if (typingList().length > 0) {
        <div class="typing-area" aria-live="polite">
          <span class="typing-dot" aria-hidden="true"></span>
          <span class="typing-dot" aria-hidden="true"></span>
          <span class="typing-dot" aria-hidden="true"></span>
          <span class="typing-names">
            {{ typingList().join(', ') }} {{ typingList().length === 1 ? 'is' : 'are' }} typing
          </span>
        </div>
      } @else {
        <div class="typing-area" aria-hidden="true"></div>
      }

      <app-message-composer
        [disabled]="chat.connectionState() !== 'connected'"
        (messageSent)="onSend($event)"
        (typingChanged)="onTypingChanged($event)"
        class="shrink-0"
      />
    }
  `,
})
export class RoomPage implements OnInit, OnDestroy, AfterViewChecked {
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
