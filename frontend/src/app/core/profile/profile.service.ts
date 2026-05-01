import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Identity } from '../identity/identity';
import type { SocialPost } from '../social/social-posts.service';

export interface UserProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(Identity);

  readonly profile = signal<UserProfile | null>(null);
  readonly posts = signal<SocialPost[]>([]);
  readonly replies = signal<SocialPost[]>([]);
  readonly loading = signal(false);

  async loadProfile(userId: string): Promise<void> {
    const p = await firstValueFrom(
      this.http.get<UserProfile>(`${environment.apiUrl}/api/profiles/${userId}`),
    );
    this.profile.set(p);
  }

  async loadPosts(userId: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ posts: SocialPost[] }>(`${environment.apiUrl}/api/profiles/${userId}/posts`),
    );
    this.posts.set(res?.posts ?? []);
  }

  async loadReplies(userId: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ posts: SocialPost[] }>(`${environment.apiUrl}/api/profiles/${userId}/replies`),
    );
    this.replies.set(res?.posts ?? []);
  }

  async updateProfile(userId: string, patch: { displayName?: string; bio?: string }): Promise<void> {
    const requestingUserId = this.identity.userId();
    if (!requestingUserId) return;
    const updated = await firstValueFrom(
      this.http.patch<UserProfile>(
        `${environment.apiUrl}/api/profiles/${userId}`,
        patch,
        { params: { requestingUserId } },
      ),
    );
    this.profile.set(updated);
  }

  reset(): void {
    this.profile.set(null);
    this.posts.set([]);
    this.replies.set([]);
    this.loading.set(false);
  }
}
