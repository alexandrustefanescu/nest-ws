import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { Identity } from '../../core/identity/identity';
import { ProfileService } from '../../core/profile/profile.service';
import { PostCard } from '../home/post-card';

@Component({
  selector: 'app-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatTabsModule,
    PostCard,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, OnDestroy {
  protected readonly svc = inject(ProfileService);
  protected readonly identity = inject(Identity);
  private readonly route = inject(ActivatedRoute);

  protected userId = '';
  protected readonly isOwn = computed(() => this.userId === this.identity.userId());
  protected readonly editing = signal(false);
  protected editDisplayName = '';
  protected editBio = '';

  protected readonly postsLoaded = signal(false);
  protected readonly repliesLoaded = signal(false);

  async ngOnInit(): Promise<void> {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    this.svc.reset();
    await Promise.all([
      this.svc.loadProfile(this.userId),
      this.svc.loadPosts(this.userId),
    ]);
    this.postsLoaded.set(true);
  }

  ngOnDestroy(): void {
    this.svc.reset();
  }

  protected startEdit(): void {
    const p = this.svc.profile();
    this.editDisplayName = p?.displayName ?? '';
    this.editBio = p?.bio ?? '';
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
  }

  protected async saveEdit(): Promise<void> {
    await this.svc.updateProfile(this.userId, {
      displayName: this.editDisplayName,
      bio: this.editBio,
    });
    this.editing.set(false);
  }

  protected async onTabChange(event: MatTabChangeEvent): Promise<void> {
    if (event.index === 1 && !this.repliesLoaded()) {
      await this.svc.loadReplies(this.userId);
      this.repliesLoaded.set(true);
    }
  }

  protected displayName(): string {
    return this.svc.profile()?.displayName || this.userId;
  }

  protected userInitial(): string {
    return this.userId[0]?.toUpperCase() ?? '?';
  }

  protected userHue(): number {
    let h = 5381;
    for (let i = 0; i < this.userId.length; i++) h = (h * 33) ^ this.userId.charCodeAt(i);
    return Math.abs(h) % 360;
  }
}
