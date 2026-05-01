import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Identity } from '../identity/identity';
import type { SocialPost } from './social-posts.service';

interface BookmarksFeedResponse {
  posts: SocialPost[];
  hasMore: boolean;
}

interface ToggleBookmarkResponse {
  bookmarked: boolean;
}

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(Identity);

  readonly bookmarks = signal<SocialPost[]>([]);
  readonly hasMore = signal(false);
  readonly loading = signal(false);

  isBookmarked(postId: number): boolean {
    return this.bookmarks().some((p) => p.id === postId);
  }

  async loadBookmarks(before?: number, limit = 20): Promise<void> {
    this.loading.set(true);
    try {
      const params: Record<string, string> = {
        userId: this.identity.userId(),
        limit: String(limit),
      };
      if (before !== undefined) {
        params.before = String(before);
      }
      const res = await firstValueFrom(
        this.http.get<BookmarksFeedResponse>(`${environment.apiUrl}/api/bookmarks`, { params }),
      );
      if (before !== undefined) {
        this.bookmarks.update((prev) => [...prev, ...(res?.posts ?? [])]);
      } else {
        this.bookmarks.set(res?.posts ?? []);
      }
      this.hasMore.set(res?.hasMore ?? false);
    } finally {
      this.loading.set(false);
    }
  }

  async toggleBookmark(post: SocialPost): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<ToggleBookmarkResponse>(
        `${environment.apiUrl}/api/posts/${post.id}/bookmark`,
        { userId: this.identity.userId() },
      ),
    );
    if (res?.bookmarked) {
      this.bookmarks.update((prev) => {
        if (prev.some((p) => p.id === post.id)) return prev;
        return [post, ...prev];
      });
    } else {
      this.bookmarks.update((prev) => prev.filter((p) => p.id !== post.id));
    }
  }
}
