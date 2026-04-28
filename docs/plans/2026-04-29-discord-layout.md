# Discord-style Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganise the chat shell and room into a Discord-style layout — full-height left sidenav (app brand top, rooms list middle, user profile bottom), single room toolbar, members as a proper `mat-drawer` end panel.

**Architecture:** Remove the global top `mat-toolbar` from Shell. The sidenav becomes a three-zone left column. A tiny `ShellUiService` carries a `Subject<void>` so the Room toolbar can trigger the Shell's sidenav toggle on mobile without prop-drilling through the router. The Room wraps its content in `mat-drawer-container` to get a proper Material end-drawer for members.

**Tech Stack:** Angular 21, Angular Material 21 (`mat-sidenav`, `mat-drawer`, `mat-toolbar`, `mat-list`, `mat-divider`), Tailwind v4 for layout utilities, CDK BreakpointObserver.

---

### Task 1: Create ShellUiService

**Files:**
- Create: `frontend/src/app/features/shell/shell-ui.service.ts`

**Step 1: Create the service**

```ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ShellUiService {
  private readonly toggleSidenavSource = new Subject<void>();
  readonly toggleSidenav$ = this.toggleSidenavSource.asObservable();

  toggleSidenav(): void {
    this.toggleSidenavSource.next();
  }
}
```

**Step 2: Build to verify no errors**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|complete"
```
Expected: `Application bundle generation complete.`

**Step 3: Commit**

```bash
git add frontend/src/app/features/shell/shell-ui.service.ts
git commit -m "feat: add ShellUiService for cross-component sidenav toggle"
```

---

### Task 2: Refactor Shell template — remove global toolbar, add 3-zone sidenav

**Files:**
- Modify: `frontend/src/app/features/shell/shell.html`

Replace the entire file with:

```html
<app-connection-banner [state]="chat.connectionState()" />

<mat-sidenav-container class="h-full">
  <mat-sidenav
    #sidenav
    [mode]="isSmallScreen() ? 'over' : 'side'"
    [opened]="!isSmallScreen()"
  >
    <div class="flex flex-col h-full">

      <!-- Top: app brand -->
      <mat-toolbar>
        <mat-icon>chat</mat-icon>
        <span class="ml-2">Chat Prototype</span>
      </mat-toolbar>

      <!-- Middle: rooms list -->
      <div class="flex items-center justify-between px-4 py-2">
        <h2 class="text-sm font-medium m-0">Rooms</h2>
        <button
          mat-icon-button
          (click)="toggleNewRoom()"
          [attr.aria-label]="showNewRoom() ? 'Cancel new room' : 'New room'"
        >
          <mat-icon>{{ showNewRoom() ? 'close' : 'add' }}</mat-icon>
        </button>
      </div>

      @if (showNewRoom()) {
        <div class="px-4 pb-2 flex flex-col gap-2">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
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
          <button mat-flat-button [disabled]="!newRoomName.trim()" (click)="submitNewRoom()">
            Create room
          </button>
        </div>
      }

      <mat-nav-list class="flex-1 overflow-y-auto" role="navigation" aria-label="Rooms">
        @for (room of chat.rooms(); track room.id) {
          <a
            mat-list-item
            [routerLink]="['/rooms', room.id]"
            routerLinkActive="active-room"
            [activated]="isActiveRoom(room.id)"
            [attr.aria-current]="isActiveRoom(room.id) ? 'page' : null"
          >
            <mat-icon matListItemIcon>tag</mat-icon>
            <span matListItemTitle>{{ room.name }}</span>
            <button
              mat-icon-button
              matListItemMeta
              (click)="$event.preventDefault(); $event.stopPropagation(); deleteRoom(room.id)"
              [attr.aria-label]="'Delete ' + room.name"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </a>
        }

        @if (chat.rooms().length === 0) {
          @if (chat.connectionState() === 'connected' && !showNewRoom()) {
            <div class="p-4 text-sm text-center" style="color: var(--mat-sys-on-surface-variant)">
              No rooms yet —
              <button mat-button (click)="toggleNewRoom()">create one</button>
            </div>
          } @else if (chat.connectionState() !== 'connected') {
            <div class="p-4 text-sm text-center" style="color: var(--mat-sys-on-surface-variant)">
              Connecting…
            </div>
          }
        }
      </mat-nav-list>

      <!-- Bottom: user profile -->
      <mat-divider />
      <mat-list>
        <mat-list-item>
          <span
            matListItemAvatar
            class="inline-flex items-center justify-center rounded-full text-sm font-semibold"
            style="background: var(--mat-sys-primary); color: var(--mat-sys-on-primary)"
          >
            {{ identity.userId()[0].toUpperCase() }}
          </span>
          <span matListItemTitle>{{ identity.userId() }}</span>
          <button
            mat-icon-button
            matListItemMeta
            [matMenuTriggerFor]="themeMenu"
            [attr.aria-label]="'Theme: ' + themeLabel()"
            [matTooltip]="'Theme: ' + themeLabel()"
          >
            <mat-icon>{{ themeIcon() }}</mat-icon>
          </button>
        </mat-list-item>
      </mat-list>

      <mat-menu #themeMenu="matMenu" yPosition="above">
        <button mat-menu-item (click)="setTheme('light')">
          <mat-icon>light_mode</mat-icon>
          <span>Light</span>
        </button>
        <button mat-menu-item (click)="setTheme('dark')">
          <mat-icon>dark_mode</mat-icon>
          <span>Dark</span>
        </button>
        <button mat-menu-item (click)="setTheme('system')">
          <mat-icon>desktop_windows</mat-icon>
          <span>System</span>
        </button>
      </mat-menu>

    </div>
  </mat-sidenav>

  <mat-sidenav-content class="flex flex-col overflow-hidden">
    <router-outlet />
  </mat-sidenav-content>
</mat-sidenav-container>
```

**Step 2: Build to verify template**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|complete"
```

**Step 3: Commit**

```bash
git add frontend/src/app/features/shell/shell.html
git commit -m "feat: refactor shell to Discord-style 3-zone sidenav"
```

---

### Task 3: Refactor Shell TypeScript — wire ShellUiService, fix host class, add MatDividerModule

**Files:**
- Modify: `frontend/src/app/features/shell/shell.ts`

**Step 1: Update shell.ts**

Replace the imports block and component decorator with:

```ts
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { ChatSocket } from '../../core/chat/chat-socket';
import { Identity } from '../../core/identity/identity';
import { Theme, ThemeMode } from '../../core/theme/theme';
import { ShellUiService } from './shell-ui.service';
import { ConnectionBanner } from './connection-banner';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, FormsModule,
    MatSidenavModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatMenuModule, MatTooltipModule,
    MatToolbarModule, MatListModule, MatDividerModule,
    ConnectionBanner,
  ],
  templateUrl: './shell.html',
  host: {
    class: 'block h-[100dvh]',
  },
})
export class Shell {
  readonly chat = inject(ChatSocket);
  readonly identity = inject(Identity);
  readonly theme = inject(Theme);
  private readonly shellUi = inject(ShellUiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly showNewRoom = signal(false);
  protected newRoomName = '';

  private readonly sidenav = viewChild.required<MatSidenav>('sidenav');

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
      const rooms = this.chat.rooms();
      if (rooms.length === 0) return;
      if (!rooms.some((r) => r.id === currentId)) {
        this.router.navigate(['/']);
      }
    });

    this.shellUi.toggleSidenav$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sidenav().toggle());
  }

  // ... keep all existing methods unchanged (themeIcon, themeLabel, setTheme, isActiveRoom, toggleNewRoom, cancelNewRoom, submitNewRoom, deleteRoom)
}
```

Keep all existing methods (`themeIcon`, `themeLabel`, `setTheme`, `isActiveRoom`, `toggleNewRoom`, `cancelNewRoom`, `submitNewRoom`, `deleteRoom`) — only the imports, decorator, and constructor change.

**Step 2: Build**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|complete"
```

**Step 3: Commit**

```bash
git add frontend/src/app/features/shell/shell.ts
git commit -m "feat: wire ShellUiService sidenav toggle in Shell"
```

---

### Task 4: Refactor Room — mat-drawer-container for members, hamburger in toolbar

**Files:**
- Modify: `frontend/src/app/features/room/room.html`

Replace the entire file with:

```html
@if (chat.connectionState() === 'connecting' && room() === undefined) {
  <div class="flex items-center justify-center h-full">
    <mat-spinner diameter="36" />
  </div>
} @else if (room() === undefined) {
  <div class="flex flex-col items-center justify-center h-full gap-3">
    <mat-icon>error_outline</mat-icon>
    <p class="m-0">Room not found.</p>
    <a mat-button routerLink="/">Back to rooms</a>
  </div>
} @else {
  <mat-drawer-container class="h-full" autosize>
    <mat-drawer
      #membersDrawer
      position="end"
      [mode]="isDesktop() ? 'side' : 'over'"
      [opened]="showUsersSidebar()"
    >
      <app-users-sidebar
        [users]="users()"
        [currentUserId]="identity.userId()"
        (closeRequested)="membersDrawer.close()"
      />
    </mat-drawer>

    <mat-drawer-content class="flex flex-col overflow-hidden">
      <mat-toolbar>
        @if (!isDesktop()) {
          <button mat-icon-button (click)="toggleShellSidenav()" aria-label="Toggle rooms list">
            <mat-icon>menu</mat-icon>
          </button>
        }
        <mat-icon>tag</mat-icon>
        <span class="ml-2 flex-1 truncate">{{ room()!.name }}</span>

        <mat-chip-set>
          <mat-chip disableRipple>{{ users().length }} online</mat-chip>
        </mat-chip-set>

        <button mat-icon-button (click)="toggleUsersSidebar()" aria-label="Toggle members">
          <mat-icon>people</mat-icon>
        </button>

        <button mat-icon-button [matMenuTriggerFor]="roomMenu" aria-label="Room options">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #roomMenu="matMenu" xPosition="before">
          <button mat-menu-item (click)="onClearChat()">
            <mat-icon>delete</mat-icon>
            <span>Clear chat</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <div
        #messageList
        id="main-messages"
        class="flex-1 overflow-y-auto p-4 flex flex-col"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Messages"
        (scroll)="onScroll($event)"
      >
        @if (isLoadingMore()) {
          <div class="flex justify-center p-2">
            <mat-spinner diameter="20" />
          </div>
        }
        @if (enrichedMessages().length === 0) {
          <div class="flex-1 flex items-center justify-center text-sm" style="color: var(--mat-sys-on-surface-variant)">
            No messages yet — say hi!
          </div>
        }
        @for (item of enrichedMessages(); track item.msg.id) {
          <app-message-bubble
            [message]="item.msg"
            [currentUserId]="identity.userId()"
            [firstInGroup]="item.firstInGroup"
            [lastInGroup]="item.lastInGroup"
            [showDate]="item.showDate"
            [dateString]="item.dateString"
            [reactions]="chat.roomReactions()[item.msg.id]"
            [roomId]="roomId()"
          />
        }
      </div>

      @if (typingList().length > 0) {
        <div class="px-4 py-1 min-h-6 flex items-center gap-1.5 shrink-0" aria-live="polite">
          <span class="typing-dot" aria-hidden="true"></span>
          <span class="typing-dot" aria-hidden="true"></span>
          <span class="typing-dot" aria-hidden="true"></span>
          <span class="text-xs" style="color: var(--mat-sys-on-surface-variant)">
            {{ typingList().join(', ') }} {{ typingList().length === 1 ? 'is' : 'are' }} typing
          </span>
        </div>
      } @else {
        <div class="px-4 py-1 min-h-6 shrink-0" aria-hidden="true"></div>
      }

      <app-message-composer
        [disabled]="chat.connectionState() !== 'connected'"
        (messageSent)="onSend($event)"
        (typingChanged)="onTypingChanged($event)"
        class="shrink-0"
      />
    </mat-drawer-content>
  </mat-drawer-container>
}
```

**Step 2: Build**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|complete"
```

**Step 3: Commit**

```bash
git add frontend/src/app/features/room/room.html
git commit -m "feat: refactor room to mat-drawer-container for members panel"
```

---

### Task 5: Refactor Room TypeScript — inject ShellUiService, add toggleShellSidenav

**Files:**
- Modify: `frontend/src/app/features/room/room.ts`

**Step 1: Add ShellUiService import and inject it, add toggleShellSidenav method**

Add to imports block:
```ts
import { ShellUiService } from '../shell/shell-ui.service';
```

Add to class body (inject alongside other services):
```ts
private readonly shellUi = inject(ShellUiService);
```

Add method:
```ts
toggleShellSidenav(): void {
  this.shellUi.toggleSidenav();
}
```

Remove `closeSidebar()` method — no longer needed (drawer handles close via `(closeRequested)="membersDrawer.close()"`).

Keep `toggleUsersSidebar()` — it toggles the `showUsersSidebar` signal which drives `[opened]` on the drawer.

Update host class to remove manual flex layout (drawer-container handles it):
```ts
host: { class: 'flex flex-col flex-1 h-full' },
```

**Step 2: Build**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|complete"
```

**Step 3: Commit**

```bash
git add frontend/src/app/features/room/room.ts
git commit -m "feat: wire ShellUiService in Room for mobile hamburger"
```

---

### Task 6: Simplify UsersSidebar — remove manual backdrop and fixed positioning

**Files:**
- Modify: `frontend/src/app/features/room/users-sidebar.html`
- Modify: `frontend/src/app/features/room/users-sidebar.ts`

**Step 1: Replace users-sidebar.html**

```html
<mat-toolbar>
  <span class="flex-1">Members</span>
  <button mat-icon-button (click)="closeBackdrop()" aria-label="Close members panel">
    <mat-icon>close</mat-icon>
  </button>
</mat-toolbar>

<mat-list class="flex-1 overflow-y-auto">
  @for (user of users(); track user.userId) {
    <mat-list-item>
      <span
        matListItemAvatar
        class="inline-flex items-center justify-center text-xs font-semibold text-white"
        [style.background]="getUserColor(user.userId)"
      >
        {{ user.userId[0].toUpperCase() }}
      </span>
      <span matListItemTitle>{{ user.userId }}</span>
      @if (user.userId === currentUserId()) {
        <mat-chip matListItemMeta highlighted disableRipple>you</mat-chip>
      }
    </mat-list-item>
  }
</mat-list>
```

The component no longer renders a backdrop or sets its own positioning — the `mat-drawer` owns all of that.

**Step 2: Update users-sidebar.ts host class**

Change host from `class: 'contents'` to a proper flex column that fills the drawer:
```ts
host: {
  class: 'flex flex-col h-full',
},
```

**Step 3: Build**

```bash
cd frontend && pnpm build 2>&1 | grep -E "error|complete"
```

**Step 4: Commit**

```bash
git add frontend/src/app/features/room/users-sidebar.html frontend/src/app/features/room/users-sidebar.ts
git commit -m "feat: simplify UsersSidebar — remove manual backdrop, use mat-drawer layout"
```

---

### Task 7: Final verification

**Step 1: Full build**

```bash
cd frontend && pnpm build 2>&1 | tail -5
```
Expected: `Application bundle generation complete.`

**Step 2: Visual checklist (run dev server)**

```bash
cd frontend && pnpm dev
```

Check:
- [ ] Desktop: left sidenav open with app name at top, rooms list, user + theme toggle at bottom
- [ ] Desktop: room view has single toolbar (room name, chip, people icon, more menu)
- [ ] Desktop: members drawer open on the right by default
- [ ] Mobile: sidenav hidden; hamburger in room toolbar toggles it
- [ ] Mobile: members drawer overlays on people-icon click, closes on backdrop click

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Discord-style layout — sidenav 3-zone + room drawer panel"
```
