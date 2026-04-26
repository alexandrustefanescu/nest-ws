import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col flex-1 items-center justify-center' },
  imports: [RouterLink, MatIconModule],
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }

    mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: var(--text-faint);
    }

    p {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0;
    }

    a {
      font-size: 13px;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }

    a:hover {
      text-decoration: underline;
    }
  `],
  template: `
    <div class="empty-state">
      <mat-icon>chat_bubble_outline</mat-icon>
      <p>Pick a room to start chatting</p>
      <a routerLink="/" fragment="new-room">or create a new one →</a>
    </div>
  `,
})
export class EmptyRoomPage {}
