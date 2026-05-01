# Profile Page Design

## Overview

A public profile page for every user, navigable by clicking an author's name on any post or via a "Profile" sidebar nav item. Users can view their own posts and posts they commented on. Own profiles are editable inline.

## Backend

### New module: `UserProfilesModule`

**Entity: `user_profiles`**

| column | type | notes |
|---|---|---|
| `userId` | `varchar` PK | matches cookie identity |
| `displayName` | `varchar` nullable | editable by user |
| `bio` | `text` nullable | editable by user |

**Endpoints:**

- `GET /profiles/:userId` — returns the profile. Auto-creates an empty profile on first access (no 404 on new users).
- `PATCH /profiles/:userId` — updates `displayName` and/or `bio`. A guard compares `:userId` against the `userId` cookie — only the owner can write.
- `GET /profiles/:userId/posts` — posts authored by that user, cursor-paginated (same pattern as global feed).
- `GET /profiles/:userId/replies` — posts where the user has at least one comment, cursor-paginated.

## Frontend

### Routing

Add `/profile/:userId` as a lazy-loaded child route inside the shell.

### Navigation

- Shell sidebar: add "Profile" nav item (`person` icon) linking to `/profile/<currentUserId>`.
- `PostCard`: author name becomes a `[routerLink]` pointing to `/profile/<authorId>`.

### `ProfileService` (`core/profile/profile.service.ts`)

Signals: `profile`, `posts`, `replies`, `loading`

Methods:
- `loadProfile(userId: string)`
- `loadPosts(userId: string)`
- `loadReplies(userId: string)`
- `updateProfile(userId: string, patch: { displayName?: string; bio?: string })`

### `Profile` component (`features/profile/`)

**Header — view mode:**
- Large initials avatar circle (Material sys-primary background)
- Display name (falls back to `userId` if not set)
- Bio (or muted "No bio yet" placeholder)
- "Edit profile" button — only rendered when `currentUserId === profileUserId`

**Header — edit mode (inline toggle):**
- Display name `<input>` and bio `<textarea>` replace static text
- Save / Cancel buttons
- On save: calls `PATCH /profiles/:userId`, then exits edit mode

**Content:**
- `MatTabGroup` with two tabs: **Posts** and **Replies**
- Each tab renders a list of existing `PostCard` components
- Tab data is lazy-loaded on first activation

## Out of Scope (for now)

- Avatar image upload
- Follow / follower counts
- Pinned posts
- Account deletion or username change
