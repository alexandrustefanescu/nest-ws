import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { RoomUser } from '@repo/shared-types';

@Component({
  selector: 'app-users-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-sidebar.html',
  standalone: true,
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
