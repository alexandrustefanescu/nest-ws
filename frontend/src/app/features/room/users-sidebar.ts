import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { User } from '@repo/shared-types';

@Component({
  selector: 'app-users-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-sidebar.html',
  standalone: true,
})
export class UsersSidebar {
  readonly users = input.required<User[]>();
  readonly currentUserId = input.required<string>();
  readonly closeRequested = output<void>();

  closeBackdrop(): void {
    this.closeRequested.emit();
  }
}
