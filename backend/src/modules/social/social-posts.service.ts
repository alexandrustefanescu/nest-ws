import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { normalizePostBody, normalizePostTitle } from './social-post-content.policy';
import { PostScope, SocialPost } from './social-post.entity';

const DEFAULT_FEED_LIMIT = 50;

@Injectable()
export class SocialPostsService {
  constructor(
    @InjectRepository(SocialPost)
    private readonly posts: Repository<SocialPost>,
  ) {}

  async createGlobalPost(userId: string, title: string, body: string): Promise<SocialPost> {
    return this.createScopedPost({
      scope: PostScope.Global,
      roomId: null,
      userId,
      title,
      body,
    });
  }

  async createRoomPost(roomId: number, userId: string, title: string, body: string): Promise<SocialPost> {
    return this.createScopedPost({
      scope: PostScope.Room,
      roomId,
      userId,
      title,
      body,
    });
  }

  async getGlobalFeed(before?: number, limit = DEFAULT_FEED_LIMIT): Promise<SocialPost[]> {
    const where = before !== undefined
      ? { scope: PostScope.Global, id: LessThan(before) }
      : { scope: PostScope.Global };

    const posts = await this.posts.find({
      where,
      order: { id: 'DESC' },
      take: limit,
    });

    return posts.reverse();
  }

  async getRoomFeed(roomId: number, before?: number, limit = DEFAULT_FEED_LIMIT): Promise<SocialPost[]> {
    const where = before !== undefined
      ? { scope: PostScope.Room, roomId, id: LessThan(before) }
      : { scope: PostScope.Room, roomId };

    const posts = await this.posts.find({
      where,
      order: { id: 'DESC' },
      take: limit,
    });

    return posts.reverse();
  }

  async getPostById(postId: number): Promise<SocialPost> {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) {
      throw new BadRequestException('Post not found');
    }
    return post;
  }

  private async createScopedPost(input: {
    scope: PostScope;
    roomId: number | null;
    userId: string;
    title: string;
    body: string;
  }): Promise<SocialPost> {
    const post = this.posts.create({
      scope: input.scope,
      roomId: input.roomId,
      userId: input.userId,
      title: normalizePostTitle(input.title),
      body: normalizePostBody(input.body),
    });

    return this.posts.save(post);
  }
}
