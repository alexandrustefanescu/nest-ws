import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChatSocketService } from '../../chat/chat-socket.service';
import { IdentityService } from '../../chat/identity.service';
import { ConnectionBannerComponent } from './connection-banner.component';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, FormsModule,
    MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    ConnectionBannerComponent,
  ],
  template: `
    <div class="flex flex-col h-screen">
      <app-connection-banner [state]="chat.connectionState()" />

      <mat-toolbar color="primary" class="shrink-0">
        <button mat-icon-button (click)="sidenav.toggle()" aria-label="Toggle rooms list">
          <mat-icon>menu</mat-icon>
        </button>
        <span class="flex-1 ml-2">Chat</span>
        <span class="text-sm opacity-80">{{ identity.userId() }}</span>
        <span
          class="ml-2 w-2 h-2 rounded-full inline-block"
          [class]="chat.connectionState() === 'connected' ? 'bg-green-400' : 'bg-red-400'"
          [title]="chat.connectionState()"
        ></span>
      </mat-toolbar>

      <mat-sidenav-container class="flex-1 overflow-hidden">
        <mat-sidenav
          #sidenav
          [mode]="isSmallScreen() ? 'over' : 'side'"
          [opened]="!isSmallScreen()"
          class="w-56"
        >
          <div class="flex flex-col h-full">
            <mat-nav-list class="flex-1">
              <div mat-subheader class="flex items-center justify-between pr-2">
                <span>Rooms</span>
                <button
                  mat-icon-button
                  class="h-7! w-7!"
                  (click)="toggleNewRoom()"
                  [attr.aria-label]="showNewRoom() ? 'Cancel' : 'New room'"
                  [title]="showNewRoom() ? 'Cancel' : 'New room'"
                >
                  <mat-icon class="text-base">{{ showNewRoom() ? 'close' : 'add' }}</mat-icon>
                </button>
              </div>

              @if (showNewRoom()) {
                <div class="px-3 pb-2">
                  <mat-form-field class="w-full" subscriptSizing="dynamic">
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
                    class="w-full mt-1"
                    [disabled]="!newRoomName.trim()"
                    (click)="submitNewRoom()"
                  >
                    Create
                  </button>
                </div>
              }

              @for (room of chat.rooms(); track room.id) {
                <div class="group relative flex items-center">
                  <a
                    mat-list-item
                    [routerLink]="['/rooms', room.id]"
                    routerLinkActive="bg-[var(--mat-sys-secondary-container)]"
                    class="flex-1"
                  >
                    <mat-icon matListItemIcon>tag</mat-icon>
                    <span matListItemTitle>{{ room.name }}</span>
                  </a>
                  <button
                    mat-icon-button
                    class="absolute right-1 h-7! w-7! opacity-0 group-hover:opacity-100 transition-opacity"
                    (click)="deleteRoom(room.id)"
                    [attr.aria-label]="'Delete ' + room.name"
                    [title]="'Delete ' + room.name"
                  >
                    <mat-icon class="text-base text-(--mat-sys-error)">delete</mat-icon>
                  </button>
                </div>
              }

              @if (chat.rooms().length === 0 && !showNewRoom()) {
                <p class="text-xs text-center text-(--mat-sys-on-surface-variant) px-3 py-4">
                  No rooms yet — create one!
                </p>
              }
            </mat-nav-list>
          </div>
        </mat-sidenav>

        <mat-sidenav-content class="flex flex-col overflow-hidden">
          <router-outlet />
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
})
export class ShellPage {
  readonly chat = inject(ChatSocketService);
  readonly identity = inject(IdentityService);

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
