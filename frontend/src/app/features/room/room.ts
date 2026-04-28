import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { ShellUiService } from '../shell/shell-ui.service';
import { ChatSocket } from '../../core/chat/chat-socket';
import { Identity } from '../../core/identity/identity';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { ClearChatDialog } from './clear-chat-dialog';
import { UsersSidebar } from './users-sidebar';
import type { Message } from '@repo/shared-types';

interface GroupedMessage {
  msg: Message;
  firstInGroup: boolean;
  lastInGroup: boolean;
  showDate: boolean;
  dateString: string;
}

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 overflow-hidden h-full' },
  imports: [
    MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatSidenavModule, MatToolbarModule, MatChipsModule, RouterLink,
    UsersSidebar, MessageBubble, MessageComposer,
  ],
  templateUrl: './room.html',
})
export class Room implements AfterViewChecked {
  readonly id = input.required<string>();

  readonly chat = inject(ChatSocket);
  readonly identity = inject(Identity);
  private readonly dialog = inject(MatDialog);
  private readonly shellUi = inject(ShellUiService);

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
    return msgs.map((msg, i) => {
      const nextMsg = i < msgs.length - 1 ? msgs[i + 1] : null;
      const msgDate = new Date(msg.createdAt);
      const nextDate = nextMsg ? new Date(nextMsg.createdAt) : null;
      const isEndOfDay = !nextDate || nextDate.toDateString() !== msgDate.toDateString();

      return {
        msg,
        firstInGroup: i === 0 || msgs[i - 1].userId !== msg.userId,
        lastInGroup: i === msgs.length - 1 || msgs[i + 1].userId !== msg.userId,
        showDate: isEndOfDay,
        dateString: msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      };
    });
  });

  readonly hasMore = computed(() => this.chat.roomHasMore()[this.roomId()] ?? false);
  readonly isLoadingMore = this.chat.isLoadingMore;

  private readonly breakpointObserver = inject(BreakpointObserver);
  readonly isDesktop = toSignal(
    this.breakpointObserver.observe('(min-width: 768px)').pipe(map((r) => r.matches)),
    { initialValue: true },
  );
  readonly showUsersSidebar = signal(this.isDesktop());

  constructor() {
    effect((onCleanup) => {
      const id = this.roomId();
      this.chat.joinRoom(id);
      onCleanup(() => this.chat.leaveRoom(id));
    });
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

  toggleUsersSidebar(): void {
    this.showUsersSidebar.update((v) => !v);
  }

  toggleShellSidenav(): void {
    this.shellUi.toggleSidenav();
  }

  private scrollToBottom(): void {
    const el = this.messageList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
