import { EntityManager } from '@mikro-orm/sqlite';
import { Injectable } from '@nestjs/common';

import { PostComment } from '../social/post-comment.entity';
import { SocialPost } from '../social/social-post.entity';
import { UserProfile } from './user-profile.entity';

const DEFAULT_LIMIT = 20;

@Injectable()
export class UserProfilesService {
  constructor(private readonly em: EntityManager) {}

  async getOrCreate(userId: string): Promise<UserProfile> {
    const existing = await this.em.findOne(UserProfile, { userId });
    if (existing) return existing;
    const blank = this.em.create(UserProfile, {
      userId,
      displayName: null,
      bio: null,
    });
    await this.em.flush();
    return blank;
  }

  async update(
    userId: string,
    patch: { displayName?: string; bio?: string },
  ): Promise<UserProfile> {
    const profile = await this.getOrCreate(userId);
    if (patch.displayName !== undefined)
      profile.displayName = patch.displayName.trim() || null;
    if (patch.bio !== undefined) profile.bio = patch.bio.trim() || null;
    await this.em.flush();
    return profile;
  }

  async getUserPosts(
    userId: string,
    before?: number,
    limit = DEFAULT_LIMIT,
  ): Promise<SocialPost[]> {
    const where =
      before !== undefined ? { userId, id: { $lt: before } } : { userId };
    const posts = await this.em.find(SocialPost, where, {
      orderBy: { id: 'DESC' },
      limit,
    });
    return posts.reverse();
  }

  async getUserReplies(
    userId: string,
    before?: number,
    limit = DEFAULT_LIMIT,
  ): Promise<SocialPost[]> {
    const comments = await this.em.find(
      PostComment,
      { userId },
      { populate: ['post'] },
    );
    const postIds = [...new Set(comments.map((c) => c.post.id))];
    if (postIds.length === 0) return [];

    const where =
      before !== undefined
        ? { id: { $in: postIds, $lt: before } }
        : { id: { $in: postIds } };

    const posts = await this.em.find(SocialPost, where, {
      orderBy: { id: 'DESC' },
      limit,
    });
    return posts.reverse();
  }
}
