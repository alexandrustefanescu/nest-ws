import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { ChatSocket } from '../../core/chat/chat-socket';
import { NotificationsService } from '../../core/notifications/notifications.service';
import { Identity } from '../../core/identity/identity';
import { Theme, ThemeMode } from '../../core/theme/theme';
import { ConnectionBanner } from './connection-banner';
import { ShellUiService } from './shell-ui.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  activeRoute: string;
}

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, FormsModule,
    MatDialogModule, MatDividerModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatMenuModule, MatTooltipModule,
    MatToolbarModule, MatListModule, MatBadgeModule,
    ConnectionBanner,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  host: {
    class: 'block h-[100dvh]',
    '(document:keydown.escape)': 'closeSidenav()',
  },
})
export class Shell {
  readonly chat = inject(ChatSocket);
  readonly identity = inject(Identity);
  readonly theme = inject(Theme);
  protected readonly notifications = inject(NotificationsService);

  protected readonly showNewRoom = signal(false);
  protected readonly sidenavOpen = signal(false);
  protected newRoomName = '';

  protected readonly navItems: NavItem[] = [
    { label: 'Home', icon: 'home', route: '/', activeRoute: '/' },
    { label: 'Notifications', icon: 'notifications', route: '/notifications', activeRoute: '/notifications' },
    { label: 'Chat', icon: 'chat', route: '/chat', activeRoute: '/chat' },
    { label: 'Bookmarks', icon: 'bookmark', route: '/bookmarks', activeRoute: '/bookmarks' },
    { label: 'Rooms', icon: 'group_work', route: '/rooms', activeRoute: '/rooms' },
    { label: 'Profile', icon: 'person', route: '/profile', activeRoute: '/profile' },
  ];

  private readonly router = inject(Router);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly aboutTpl = viewChild<TemplateRef<unknown>>('aboutDialog');

  constructor() {
    effect(() => {
      const currentId = this.chat.currentRoomId();
      if (currentId === null) return;
      const rooms = this.chat.rooms();
      if (rooms.length === 0) return;
      if (!rooms.some((r) => r.id === currentId)) {
        this.router.navigate(['/']);
      }
    });

    this.shellUi.toggleSidenav$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sidenavOpen.update((v) => !v));
  }

  closeSidenav(): void {
    this.sidenavOpen.set(false);
  }

  themeIcon(): string {
    const m = this.theme.mode();
    if (m === 'light') return 'light_mode';
    if (m === 'dark') return 'dark_mode';
    return 'desktop_windows';
  }

  themeLabel(): string {
    const m = this.theme.mode();
    if (m === 'light') return 'Light';
    if (m === 'dark') return 'Dark';
    return 'System';
  }

  setTheme(m: ThemeMode): void {
    this.theme.setMode(m);
  }

  onAbout(): void {
    const tpl = this.aboutTpl();
    if (!tpl) return;
    this.dialog.open(tpl, { width: '420px' });
  }

  isActiveRoom(id: number): boolean {
    return this.chat.currentRoomId() === id;
  }

  toggleNewRoom(): void {
    this.showNewRoom.update((v) => !v);
    if (!this.showNewRoom()) this.newRoomName = '';
  }

  cancelNewRoom(): void {
    this.showNewRoom.set(false);
    this.newRoomName = '';
  }

  submitNewRoom(): void {
    if (!this.newRoomName.trim()) return;
    this.chat.createRoom(this.newRoomName);
    this.cancelNewRoom();
  }

  deleteRoom(roomId: number): void {
    this.chat.deleteRoom(roomId);
  }

  onDeleteRoom(event: MouseEvent, roomId: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.deleteRoom(roomId);
  }
}
