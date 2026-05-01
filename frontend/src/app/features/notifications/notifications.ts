import { ChangeDetectionStrategy, Component, inject, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { NotificationsService } from '../../core/notifications/notifications.service';

@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatDividerModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class Notifications implements OnInit {
  protected readonly svc = inject(NotificationsService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    await this.svc.load();
  }

  protected actionText(type: 'like' | 'comment'): string {
    return type === 'like' ? 'liked your post' : 'commented on your post';
  }

  protected async onNotificationClick(id: number, postId: number, read: boolean): Promise<void> {
    if (!read) {
      await this.svc.markRead(id);
    }
    await this.router.navigate(['/home'], { fragment: `post-${postId}` });
  }

  protected async onMarkAllRead(): Promise<void> {
    await this.svc.markAllRead();
  }
}
