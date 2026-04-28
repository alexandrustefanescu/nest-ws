import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import type { RoomUser } from '@repo/shared-types';

@Component({
  selector: 'app-users-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatListModule, MatToolbarModule, MatIconModule, MatButtonModule, MatChipsModule],
  templateUrl: './users-sidebar.html',
  host: {
    class: 'flex flex-col h-full',
  },
})
export class UsersSidebar {
  readonly users = input.required<RoomUser[]>();
  readonly currentUserId = input.required<string>();
  readonly closeRequested = output<void>();

  closeBackdrop(): void {
    this.closeRequested.emit();
  }

  getUserColor(userId: string): string {
    const hash = userId.charCodeAt(0);
    const hue = ((hash * 33) ^ 5381) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
}
