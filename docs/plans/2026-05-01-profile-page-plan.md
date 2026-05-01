# Profile Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public profile page showing a user's posts and commented posts, with inline editing of display name and bio.

**Architecture:** New `UserProfilesModule` on the backend with a `user_profiles` table and four REST endpoints. Angular `ProfileService` fetches data; a `Profile` component renders the header (view/edit toggle) and two lazy-loaded `MatTabGroup` tabs reusing the existing `PostCard`.

**Tech Stack:** NestJS + TypeORM (SQLite), Angular 21 signals + Material Design, existing `PostCard` component.

---

### Task 1: Backend — UserProfile entity

**Files:**
- Create: `backend/src/modules/profiles/user-profile.entity.ts`

**Step 1: Create the entity**

```typescript
import { Entity, PrimaryColumn, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('user_profiles')
export class UserProfile {
  @ApiProperty({ example: 'alex' })
  @PrimaryColumn()
  userId: string;

  @ApiProperty({ example: 'Alex S.', nullable: true })
  @Column({ nullable: true, length: 60 })
  displayName: string | null;

  @ApiProperty({ example: 'Building things.', nullable: true })
  @Column({ type: 'text', nullable: true })
  bio: string | null;
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/profiles/user-profile.entity.ts
git commit -m "feat(profiles): add UserProfile entity"
```

---

### Task 2: Backend — UserProfilesService (TDD)

**Files:**
- Create: `backend/src/modules/profiles/user-profiles.service.spec.ts`
- Create: `backend/src/modules/profiles/user-profiles.service.ts`

**Step 1: Write failing tests**

```typescript
// backend/src/modules/profiles/user-profiles.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserProfilesService } from './user-profiles.service';
import { UserProfile } from './user-profile.entity';
import { SocialPost } from '../social/social-post.entity';
import { PostComment } from '../social/post-comment.entity';

describe('UserProfilesService', () => {
  let service: UserProfilesService;
  let mockProfiles: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let mockPosts: { createQueryBuilder: jest.Mock };
  let mockComments: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    mockProfiles = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    mockPosts = { createQueryBuilder: jest.fn() };
    mockComments = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfilesService,
        { provide: getRepositoryToken(UserProfile), useValue: mockProfiles },
        { provide: getRepositoryToken(SocialPost), useValue: mockPosts },
        { provide: getRepositoryToken(PostComment), useValue: mockComments },
      ],
    }).compile();

    service = module.get<UserProfilesService>(UserProfilesService);
  });

  describe('getOrCreate', () => {
    it('returns existing profile', async () => {
      const profile = { userId: 'alice', displayName: 'Alice', bio: null };
      mockProfiles.findOne.mockResolvedValue(profile);

      const result = await service.getOrCreate('alice');

      expect(result).toEqual(profile);
      expect(mockProfiles.create).not.toHaveBeenCalled();
    });

    it('creates blank profile when none exists', async () => {
      mockProfiles.findOne.mockResolvedValue(null);
      const blank = { userId: 'bob', displayName: null, bio: null };
      mockProfiles.create.mockReturnValue(blank);
      mockProfiles.save.mockResolvedValue(blank);

      const result = await service.getOrCreate('bob');

      expect(mockProfiles.create).toHaveBeenCalledWith({ userId: 'bob', displayName: null, bio: null });
      expect(result).toEqual(blank);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      const existing = { userId: 'alice', displayName: 'Alice', bio: null };
      const updated = { ...existing, bio: 'Builder.' };
      mockProfiles.findOne.mockResolvedValue(existing);
      mockProfiles.save.mockResolvedValue(updated);

      const result = await service.update('alice', { bio: 'Builder.' });

      expect(mockProfiles.save).toHaveBeenCalledWith({ ...existing, bio: 'Builder.' });
      expect(result).toEqual(updated);
    });

    it('auto-creates profile if missing before update', async () => {
      mockProfiles.findOne.mockResolvedValue(null);
      const blank = { userId: 'bob', displayName: null, bio: null };
      mockProfiles.create.mockReturnValue(blank);
      mockProfiles.save.mockResolvedValue({ ...blank, displayName: 'Bob' });

      const result = await service.update('bob', { displayName: 'Bob' });

      expect(result.displayName).toBe('Bob');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd backend && pnpm test --testPathPattern=user-profiles.service.spec
```

Expected: FAIL — `UserProfilesService` not found.

**Step 3: Implement the service**

```typescript
// backend/src/modules/profiles/user-profiles.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { SocialPost } from '../social/social-post.entity';
import { PostComment } from '../social/post-comment.entity';

const DEFAULT_LIMIT = 20;

@Injectable()
export class UserProfilesService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
    @InjectRepository(SocialPost)
    private readonly posts: Repository<SocialPost>,
    @InjectRepository(PostComment)
    private readonly comments: Repository<PostComment>,
  ) {}

  async getOrCreate(userId: string): Promise<UserProfile> {
    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) return existing;
    const blank = this.profiles.create({ userId, displayName: null, bio: null });
    return this.profiles.save(blank);
  }

  async update(userId: string, patch: { displayName?: string; bio?: string }): Promise<UserProfile> {
    const profile = await this.getOrCreate(userId);
    if (patch.displayName !== undefined) profile.displayName = patch.displayName.trim() || null;
    if (patch.bio !== undefined) profile.bio = patch.bio.trim() || null;
    return this.profiles.save(profile);
  }

  async getUserPosts(userId: string, before?: number, limit = DEFAULT_LIMIT): Promise<SocialPost[]> {
    const where = before !== undefined
      ? { userId, id: LessThan(before) }
      : { userId };
    const posts = await this.posts.find({ where, order: { id: 'DESC' }, take: limit });
    return posts.reverse();
  }

  async getUserReplies(userId: string, before?: number, limit = DEFAULT_LIMIT): Promise<SocialPost[]> {
    const subQb = this.comments
      .createQueryBuilder('c')
      .select('DISTINCT c.postId', 'postId')
      .where('c.userId = :userId', { userId });

    const qb = this.posts
      .createQueryBuilder('p')
      .where(`p.id IN (${subQb.getQuery()})`)
      .setParameters(subQb.getParameters())
      .orderBy('p.id', 'DESC')
      .take(limit);

    if (before !== undefined) {
      qb.andWhere('p.id < :before', { before });
    }

    const posts = await qb.getMany();
    return posts.reverse();
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd backend && pnpm test --testPathPattern=user-profiles.service.spec
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/modules/profiles/user-profiles.service.spec.ts backend/src/modules/profiles/user-profiles.service.ts
git commit -m "feat(profiles): add UserProfilesService with TDD"
```

---

### Task 3: Backend — DTOs

**Files:**
- Create: `backend/src/modules/profiles/dto/update-profile.dto.ts`
- Create: `backend/src/modules/profiles/dto/list-profile-feed.dto.ts`

**Step 1: Create DTOs**

```typescript
// backend/src/modules/profiles/dto/update-profile.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}
```

```typescript
// backend/src/modules/profiles/dto/list-profile-feed.dto.ts
import { IsInt, IsOptional, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListProfileFeedDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  before?: number;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(50)
  limit?: number = 20;
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/profiles/dto/
git commit -m "feat(profiles): add profile DTOs"
```

---

### Task 4: Backend — UserProfilesController

**Files:**
- Create: `backend/src/modules/profiles/user-profiles.controller.ts`

**Step 1: Create the controller**

```typescript
// backend/src/modules/profiles/user-profiles.controller.ts
import { Body, Controller, ForbiddenException, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserProfilesService } from './user-profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ListProfileFeedDto } from './dto/list-profile-feed.dto';

@ApiTags('profiles')
@Controller('api/profiles')
export class UserProfilesController {
  constructor(private readonly svc: UserProfilesService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get or create a user profile' })
  async getProfile(@Param('userId') userId: string) {
    const profile = await this.svc.getOrCreate(userId);
    return { userId: profile.userId, displayName: profile.displayName, bio: profile.bio };
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update own profile (requestingUserId must match userId)' })
  @ApiQuery({ name: 'userId', type: String })
  async updateProfile(
    @Param('userId') userId: string,
    @Query('userId') requestingUserId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    if (requestingUserId !== userId) throw new ForbiddenException('Cannot edit another user\'s profile');
    const profile = await this.svc.update(userId, dto);
    return { userId: profile.userId, displayName: profile.displayName, bio: profile.bio };
  }

  @Get(':userId/posts')
  @ApiOperation({ summary: 'List posts authored by a user' })
  async getUserPosts(@Param('userId') userId: string, @Query() dto: ListProfileFeedDto) {
    const posts = await this.svc.getUserPosts(userId, dto.before, dto.limit);
    return { posts, hasMore: posts.length === (dto.limit ?? 20) };
  }

  @Get(':userId/replies')
  @ApiOperation({ summary: 'List posts the user has commented on' })
  async getUserReplies(@Param('userId') userId: string, @Query() dto: ListProfileFeedDto) {
    const posts = await this.svc.getUserReplies(userId, dto.before, dto.limit);
    return { posts, hasMore: posts.length === (dto.limit ?? 20) };
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/modules/profiles/user-profiles.controller.ts
git commit -m "feat(profiles): add UserProfilesController"
```

---

### Task 5: Backend — Module + wire up + CORS fix

**Files:**
- Create: `backend/src/modules/profiles/user-profiles.module.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/main.ts`

**Step 1: Create the module**

```typescript
// backend/src/modules/profiles/user-profiles.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './user-profile.entity';
import { SocialPost } from '../social/social-post.entity';
import { PostComment } from '../social/post-comment.entity';
import { UserProfilesService } from './user-profiles.service';
import { UserProfilesController } from './user-profiles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserProfile, SocialPost, PostComment])],
  providers: [UserProfilesService],
  controllers: [UserProfilesController],
})
export class UserProfilesModule {}
```

**Step 2: Register in AppModule**

In `backend/src/app.module.ts`, add the import:
```typescript
import { UserProfilesModule } from './modules/profiles/user-profiles.module';
```
And add `UserProfilesModule` to the `imports` array alongside the existing modules.

**Step 3: Add PATCH to CORS in main.ts**

In `backend/src/main.ts`, find the `cors` config and change:
```typescript
methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
```
to:
```typescript
methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
```

**Step 4: Verify the backend starts and the endpoints appear in docs**

```bash
cd backend && pnpm start:dev
```

Visit `http://localhost:3000/docs` and confirm the `profiles` tag appears with all four endpoints.

**Step 5: Commit**

```bash
git add backend/src/modules/profiles/user-profiles.module.ts backend/src/app.module.ts backend/src/main.ts
git commit -m "feat(profiles): wire UserProfilesModule into app, fix CORS PATCH"
```

---

### Task 6: Frontend — ProfileService

**Files:**
- Create: `frontend/src/app/core/profile/profile.service.ts`

**Step 1: Create the service**

```typescript
// frontend/src/app/core/profile/profile.service.ts
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
    this.loading.set(true);
    try {
      const p = await firstValueFrom(
        this.http.get<UserProfile>(`${environment.apiUrl}/api/profiles/${userId}`),
      );
      this.profile.set(p);
    } finally {
      this.loading.set(false);
    }
  }

  async loadPosts(userId: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ posts: SocialPost[] }>(`${environment.apiUrl}/api/profiles/${userId}/posts`),
    );
    this.posts.set(res.posts);
  }

  async loadReplies(userId: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ posts: SocialPost[] }>(`${environment.apiUrl}/api/profiles/${userId}/replies`),
    );
    this.replies.set(res.posts);
  }

  async updateProfile(userId: string, patch: { displayName?: string; bio?: string }): Promise<void> {
    const requestingUserId = this.identity.userId();
    const updated = await firstValueFrom(
      this.http.patch<UserProfile>(
        `${environment.apiUrl}/api/profiles/${userId}`,
        patch,
        { params: { userId: requestingUserId } },
      ),
    );
    this.profile.set(updated);
  }

  reset(): void {
    this.profile.set(null);
    this.posts.set([]);
    this.replies.set([]);
  }
}
```

**Step 2: Commit**

```bash
git add frontend/src/app/core/profile/profile.service.ts
git commit -m "feat(profiles): add frontend ProfileService"
```

---

### Task 7: Frontend — Profile component

**Files:**
- Create: `frontend/src/app/features/profile/profile.ts`
- Create: `frontend/src/app/features/profile/profile.html`
- Create: `frontend/src/app/features/profile/profile.css`

**Step 1: Create the component class**

```typescript
// frontend/src/app/features/profile/profile.ts
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
  private readonly identity = inject(Identity);
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
```

**Step 2: Create the template**

```html
<!-- frontend/src/app/features/profile/profile.html -->
<div class="profile-layout">
  @if (svc.loading()) {
    <div class="profile-loading">
      <mat-spinner diameter="32" />
    </div>
  } @else {
    <div class="profile-header">
      @if (!editing()) {
        <div
          class="profile-avatar"
          [style.background]="'hsl(' + userHue() + ', 65%, 55%)'"
        >{{ userInitial() }}</div>

        <div class="profile-info">
          <h1 class="profile-display-name">{{ displayName() }}</h1>
          @if (svc.profile()?.userId !== displayName()) {
            <span class="profile-user-id">{{ userId }}</span>
          }
          <p class="profile-bio">{{ svc.profile()?.bio || 'No bio yet.' }}</p>
        </div>

        @if (isOwn()) {
          <button mat-stroked-button class="edit-btn" (click)="startEdit()">
            <mat-icon>edit</mat-icon>
            Edit profile
          </button>
        }
      } @else {
        <div
          class="profile-avatar"
          [style.background]="'hsl(' + userHue() + ', 65%, 55%)'"
        >{{ userInitial() }}</div>

        <div class="profile-edit-form">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Display name</mat-label>
            <input matInput [(ngModel)]="editDisplayName" maxlength="60" />
          </mat-form-field>

          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Bio</mat-label>
            <textarea matInput [(ngModel)]="editBio" rows="3" maxlength="300"></textarea>
          </mat-form-field>

          <div class="edit-actions">
            <button mat-button (click)="cancelEdit()">Cancel</button>
            <button mat-flat-button (click)="saveEdit()">Save</button>
          </div>
        </div>
      }
    </div>

    <mat-tab-group (selectedTabChange)="onTabChange($event)" animationDuration="0">
      <mat-tab label="Posts">
        @if (!postsLoaded()) {
          <div class="tab-loading"><mat-spinner diameter="28" /></div>
        } @else if (svc.posts().length === 0) {
          <div class="tab-empty">
            <mat-icon>article</mat-icon>
            <p>No posts yet.</p>
          </div>
        } @else {
          <div class="tab-feed">
            @for (post of svc.posts(); track post.id) {
              <app-post-card [post]="post" [currentUserId]="identity.userId()" />
            }
          </div>
        }
      </mat-tab>

      <mat-tab label="Replies">
        @if (!repliesLoaded()) {
          <div class="tab-loading"><mat-spinner diameter="28" /></div>
        } @else if (svc.replies().length === 0) {
          <div class="tab-empty">
            <mat-icon>comment</mat-icon>
            <p>No replies yet.</p>
          </div>
        } @else {
          <div class="tab-feed">
            @for (post of svc.replies(); track post.id) {
              <app-post-card [post]="post" [currentUserId]="identity.userId()" />
            }
          </div>
        }
      </mat-tab>
    </mat-tab-group>
  }
</div>
```

**Step 3: Create the stylesheet**

```css
/* frontend/src/app/features/profile/profile.css */
:host {
  display: block;
  height: 100%;
  overflow-y: auto;
}

.profile-layout {
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 16px;
}

.profile-loading {
  display: flex;
  justify-content: center;
  padding: 48px 0;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--mat-sys-outline-variant);
  margin-bottom: 16px;
}

.profile-avatar {
  flex-shrink: 0;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 600;
  color: white;
}

.profile-info {
  flex: 1;
  min-width: 0;
}

.profile-display-name {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--mat-sys-on-surface);
}

.profile-user-id {
  font-size: 14px;
  color: var(--mat-sys-on-surface-variant);
  display: block;
  margin-bottom: 8px;
}

.profile-bio {
  font-size: 14px;
  color: var(--mat-sys-on-surface-variant);
  margin: 4px 0 0;
  white-space: pre-wrap;
}

.edit-btn {
  margin-left: auto;
  flex-shrink: 0;
}

.profile-edit-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tab-loading,
.tab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 0;
  gap: 12px;
  color: var(--mat-sys-on-surface-variant);
}

.tab-feed {
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

**Step 4: Commit**

```bash
git add frontend/src/app/features/profile/
git commit -m "feat(profiles): add Profile component with inline edit and tabs"
```

---

### Task 8: Frontend — Routing + shell nav + post-card author link

**Files:**
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/features/shell/shell.ts`
- Modify: `frontend/src/app/features/home/post-card.html`
- Modify: `frontend/src/app/features/home/post-card.ts`

**Step 1: Add the profile route in app.routes.ts**

Inside the shell children array, add:
```typescript
{
  path: 'profile/:userId',
  loadComponent: () => import('./features/profile/profile').then((m) => m.Profile),
},
```

**Step 2: Update shell navItems to use dynamic profile route**

In `frontend/src/app/features/shell/shell.ts`, the `navItems` array is a `protected readonly` plain array. Change it to a `computed()` signal so the Profile entry can embed the current userId:

```typescript
// Replace:
protected readonly navItems: NavItem[] = [ ... ];

// With:
protected readonly navItems = computed<NavItem[]>(() => [
  { label: 'Home', icon: 'home', route: '/', activeRoute: '/' },
  { label: 'Notifications', icon: 'notifications', route: '/notifications', activeRoute: '/notifications' },
  { label: 'Chat', icon: 'chat', route: '/chat', activeRoute: '/chat' },
  { label: 'Bookmarks', icon: 'bookmark', route: '/bookmarks', activeRoute: '/bookmarks' },
  { label: 'Rooms', icon: 'group_work', route: '/rooms', activeRoute: '/rooms' },
  { label: 'Profile', icon: 'person', route: `/profile/${this.identity.userId()}`, activeRoute: '/profile' },
]);
```

**Step 3: Update shell.html @for to call navItems()**

In `shell.html`, change:
```html
@for (item of navItems; track item.label) {
```
to:
```html
@for (item of navItems(); track item.label) {
```

**Step 4: Add RouterLink to post-card author**

In `frontend/src/app/features/home/post-card.ts`, add `RouterLink` to imports:
```typescript
import { RouterLink } from '@angular/router';
// ...
imports: [..., RouterLink],
```

In `frontend/src/app/features/home/post-card.html`, wrap the author name in a link. Find the `author-name` span (line 10) and replace it with:
```html
<a class="author-name" [routerLink]="['/profile', post().userId]">{{ post().userId }}</a>
```

**Step 5: Add author link styles in post-card.css**

Add to `frontend/src/app/features/home/post-card.css`:
```css
a.author-name {
  text-decoration: none;
  color: inherit;
}
a.author-name:hover {
  text-decoration: underline;
}
```

**Step 6: Commit**

```bash
git add frontend/src/app/app.routes.ts frontend/src/app/features/shell/shell.ts frontend/src/app/features/shell/shell.html frontend/src/app/features/home/post-card.ts frontend/src/app/features/home/post-card.html frontend/src/app/features/home/post-card.css
git commit -m "feat(profiles): wire profile route, shell nav, and post-card author links"
```

---

### Task 9: Manual smoke test

1. Start dev servers: `pnpm --filter backend start:dev` and `pnpm --filter frontend start` (or the monorepo dev command)
2. Open the app in a browser
3. Click "Profile" in the sidebar — should open your own profile at `/profile/<userId>`
4. Confirm the Posts tab loads your posts
5. Click "Edit profile" — form should appear inline, save a display name and bio
6. Refresh — display name and bio should persist
7. Click another user's name on a post card — should navigate to their profile
8. Confirm "Edit profile" button does NOT appear on another user's profile
9. Switch to Replies tab — should load posts you've commented on (or show empty state)
