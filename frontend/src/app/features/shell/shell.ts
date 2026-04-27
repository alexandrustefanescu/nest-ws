import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatSocket } from '../../core/chat/chat-socket';
import { IdentityService } from '../../core/identity/identity.service';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';
import { ConnectionBanner } from './connection-banner';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, FormsModule,
    MatSidenavModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatMenuModule, MatTooltipModule,
    ConnectionBanner,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  readonly chat = inject(ChatSocket);
  readonly identity = inject(IdentityService);
  readonly theme = inject(ThemeService);

  protected readonly showNewRoom = signal(false);
  protected newRoomName = '';

  private readonly bp = inject(BreakpointObserver);
  readonly isSmallScreen = toSignal(
    this.bp.observe([Breakpoints.XSmall, Breakpoints.Small]).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const currentId = this.chat.currentRoomId();
      if (currentId === null) return;
      const exists = this.chat.rooms().some((r) => r.id === currentId);
      if (!exists) {
        this.router.navigate(['/']);
      }
    });
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
}
