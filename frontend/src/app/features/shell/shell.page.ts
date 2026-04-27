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
import { ChatSocketService } from '../../core/chat/chat-socket.service';
import { IdentityService } from '../../core/identity/identity.service';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';
import { ConnectionBannerComponent } from './connection-banner.component';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, FormsModule,
    MatSidenavModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatMenuModule, MatTooltipModule,
    ConnectionBannerComponent,
  ],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--surface-0);
    }

    .app-frame {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    @media (min-width: 1024px) {
      .app-frame {
        margin: 12px;
        border-radius: var(--radius-2xl);
        border: 1px solid var(--border-subtle);
        background: var(--surface-1b);
        overflow: hidden;
      }
    }

    .app-header {
      height: 56px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px 0 8px;
      background: var(--surface-1);
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .monogram {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--accent);
      color: var(--accent-fg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      flex-shrink: 0;
    }

    .app-name {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--text-strong);
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: var(--surface-2);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-strong);
      border: 1px solid var(--border-subtle);
    }

    .presence-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      flex-shrink: 0;
    }

    .ghost-btn {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-xs);
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
    }

    .ghost-btn:hover {
      color: var(--text-strong);
      background: var(--surface-2);
    }

    mat-sidenav {
      width: 264px;
      background: var(--surface-1);
      border-right: 1px solid var(--border-subtle) !important;
      box-shadow: none !important;
    }

    .sidenav-inner {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .rooms-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 12px 4px;
    }

    .rooms-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-faint);
    }

    .room-list {
      flex: 1;
      overflow-y: auto;
      padding: 2px 8px;
    }

    .room-item-wrap {
      position: relative;
    }

    .room-item-wrap:hover .delete-btn,
    .room-item-wrap:focus-within .delete-btn {
      opacity: 1;
    }

    .room-link {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 12px;
      border-radius: var(--radius-sm);
      text-decoration: none;
      color: var(--text-muted);
      font-size: 14px;
      transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
    }

    .room-link:hover {
      background: var(--surface-2);
      color: var(--text-strong);
    }

    .room-link.active {
      background: var(--surface-2);
      border: 1px solid var(--border-subtle);
      color: var(--text-strong);
    }

    .room-hash {
      color: var(--text-faint);
      font-size: 15px;
      font-weight: 500;
      flex-shrink: 0;
    }

    .room-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .delete-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0;
      width: 24px;
      height: 24px;
      border-radius: var(--radius-xs);
      color: var(--text-muted);
      transition: opacity var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
    }

    .delete-btn:hover {
      color: var(--danger);
      background: color-mix(in srgb, var(--danger) 10%, transparent);
    }

    .delete-btn:focus-visible {
      opacity: 1;
    }

    .sidenav-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 8px 0;
    }

    .new-room-form {
      padding: 8px;
    }

    .empty-rooms {
      padding: 16px 12px;
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
    }

    .accent-link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    .accent-link:hover {
      text-decoration: underline;
    }

    .create-room-btn {
      width: 100%;
      height: 36px;
      margin-top: 4px;
      border-radius: var(--radius-sm) !important;
      background: var(--accent) !important;
      color: var(--accent-fg) !important;
      font-weight: 600;
      font-size: 13px;
      box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.08) !important;
    }

    .create-room-btn:disabled {
      opacity: 0.45;
    }
  `],
  template: `
    <app-connection-banner [state]="chat.connectionState()" />

    <div class="app-frame">
      <header class="app-header">
        @if (isSmallScreen()) {
          <button
            class="ghost-btn"
            (click)="sidenav.toggle()"
            aria-label="Toggle rooms list"
          >
            <mat-icon style="font-size:18px;width:18px;height:18px">menu</mat-icon>
          </button>
        }
        <div class="header-brand">
          <div class="monogram" aria-hidden="true">C</div>
          <span class="app-name">Chat</span>
        </div>

        <button
          class="ghost-btn"
          [matMenuTriggerFor]="themeMenu"
          [attr.aria-label]="'Theme: ' + themeLabel()"
          [matTooltip]="'Theme: ' + themeLabel()"
        >
          <mat-icon style="font-size:18px;width:18px;height:18px">{{ themeIcon() }}</mat-icon>
        </button>

        <mat-menu #themeMenu="matMenu">
          <button mat-menu-item (click)="setTheme('light')">
            <mat-icon>light_mode</mat-icon>
            <span>Light</span>
            @if (theme.mode() === 'light') { <mat-icon class="ml-auto">check</mat-icon> }
          </button>
          <button mat-menu-item (click)="setTheme('dark')">
            <mat-icon>dark_mode</mat-icon>
            <span>Dark</span>
            @if (theme.mode() === 'dark') { <mat-icon class="ml-auto">check</mat-icon> }
          </button>
          <button mat-menu-item (click)="setTheme('system')">
            <mat-icon>desktop_windows</mat-icon>
            <span>System</span>
            @if (theme.mode() === 'system') { <mat-icon class="ml-auto">check</mat-icon> }
          </button>
        </mat-menu>

        <div class="user-pill">
          <span>{{ identity.userId() }}</span>
          <span class="presence-dot" aria-hidden="true"></span>
        </div>
      </header>

      <mat-sidenav-container style="flex:1;overflow:hidden;">
        <mat-sidenav
          #sidenav
          [mode]="isSmallScreen() ? 'over' : 'side'"
          [opened]="!isSmallScreen()"
        >
          <nav class="sidenav-inner" role="navigation" aria-label="Rooms">
            <div class="rooms-header">
              <span class="rooms-label">
                <mat-icon style="font-size:14px;width:14px;height:14px">tag</mat-icon>
                Rooms
              </span>
              <button
                class="ghost-btn"
                (click)="toggleNewRoom()"
                [attr.aria-label]="showNewRoom() ? 'Cancel new room' : 'New room'"
                style="display:flex;align-items:center;justify-content:center;"
              >
                <mat-icon style="font-size:16px;width:16px;height:16px">{{ showNewRoom() ? 'close' : 'add' }}</mat-icon>
              </button>
            </div>

            @if (showNewRoom()) {
              <div class="new-room-form">
                <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:100%">
                  <mat-label>Room name</mat-label>
                  <input
                    matInput
                    [(ngModel)]="newRoomName"
                    (keydown.enter)="submitNewRoom()"
                    (keydown.escape)="cancelNewRoom()"
                    placeholder="e.g. general"
                    autocomplete="off"
                  />
                </mat-form-field>
                <button
                  mat-flat-button
                  class="create-room-btn"
                  [disabled]="!newRoomName.trim()"
                  (click)="submitNewRoom()"
                >
                  Create room ›
                </button>
              </div>
            }

            <div class="room-list">
              @for (room of chat.rooms(); track room.id) {
                <div class="room-item-wrap">
                  <a
                    class="room-link"
                    [routerLink]="['/rooms', room.id]"
                    routerLinkActive="active"
                    [attr.aria-current]="isActiveRoom(room.id) ? 'page' : null"
                  >
                    <span class="room-hash" aria-hidden="true">#</span>
                    <span class="room-name">{{ room.name }}</span>
                  </a>
                  <button
                    class="delete-btn"
                    (click)="deleteRoom(room.id)"
                    [attr.aria-label]="'Delete ' + room.name"
                  >
                    <mat-icon style="font-size:14px;width:14px;height:14px">delete</mat-icon>
                  </button>
                </div>
              }

              @if (chat.rooms().length === 0) {
                @if (chat.connectionState() === 'connected' && !showNewRoom()) {
                  <div class="empty-rooms">
                    No rooms yet —
                    <button class="accent-link" style="background:none;border:none;cursor:pointer;padding:0;font-size:inherit;" (click)="toggleNewRoom()">create one</button>
                  </div>
                } @else if (chat.connectionState() !== 'connected') {
                  <div class="empty-rooms">
                    Connecting…
                  </div>
                }
              }
            </div>

            <div class="sidenav-divider"></div>
          </nav>
        </mat-sidenav>

        <mat-sidenav-content style="display:flex;flex-direction:column;overflow:hidden;">
          <router-outlet />
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
})
export class ShellPage {
  readonly chat = inject(ChatSocketService);
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
