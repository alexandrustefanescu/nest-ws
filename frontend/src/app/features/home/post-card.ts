import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import type { SocialPost } from '../../core/social/social-posts.service';
import { SocialPostsService } from '../../core/social/social-posts.service';
import { BookmarkService } from '../../core/social/bookmark.service';
import { CommentSection } from './comment-section';

@Component({
  selector: 'app-post-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatButtonModule, MatChipsModule, CommentSection],
  templateUrl: './post-card.html',
  styleUrl: './post-card.css',
})
export class PostCard {
  readonly post = input.required<SocialPost>();
  readonly currentUserId = input.required<string>();

  readonly feed = inject(SocialPostsService);
  readonly bookmarks = inject(BookmarkService);

  readonly showComments = signal(false);
  readonly isLiking = signal(false);

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  userHue(userId: string): number {
    let h = 5381;
    for (let i = 0; i < userId.length; i++) h = (h * 33) ^ userId.charCodeAt(i);
    return Math.abs(h) % 360;
  }

  async toggleLike(): Promise<void> {
    if (this.isLiking()) return;
    this.isLiking.set(true);
    try {
      await this.feed.toggleLike(this.post().id);
    } finally {
      this.isLiking.set(false);
    }
  }

  async toggleBookmark(): Promise<void> {
    await this.bookmarks.toggleBookmark(this.post());
  }

  toggleComments(): void {
    this.showComments.update((v) => !v);
  }
}
