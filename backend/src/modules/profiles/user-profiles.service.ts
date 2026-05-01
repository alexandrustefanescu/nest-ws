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
