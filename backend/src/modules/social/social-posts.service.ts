import { EntityManager } from '@mikro-orm/sqlite';
import { BadRequestException, Injectable } from '@nestjs/common';

import {
  normalizePostBody,
  normalizePostTitle,
} from './social-post-content.policy';
import { PostScope, SocialPost } from './social-post.entity';

const DEFAULT_FEED_LIMIT = 50;

@Injectable()
export class SocialPostsService {
  constructor(private readonly em: EntityManager) {}

  async createGlobalPost(
    userId: string,
    title: string,
    body: string,
  ): Promise<SocialPost> {
    return this.createScopedPost({
      scope: PostScope.Global,
      room: null,
      userId,
      title,
      body,
    });
  }

  async createRoomPost(
    roomId: number,
    userId: string,
    title: string,
    body: string,
  ): Promise<SocialPost> {
    return this.createScopedPost({
      scope: PostScope.Room,
      room: roomId,
      userId,
      title,
      body,
    });
  }

  async getGlobalFeed(
    before?: number,
    limit = DEFAULT_FEED_LIMIT,
  ): Promise<SocialPost[]> {
    const where =
      before !== undefined
        ? { scope: PostScope.Global, id: { $lt: before } }
        : { scope: PostScope.Global };

    const posts = await this.em.find(SocialPost, where, {
      orderBy: { id: 'DESC' },
      limit,
    });
    return posts.reverse();
  }

  async getRoomFeed(
    roomId: number,
    before?: number,
    limit = DEFAULT_FEED_LIMIT,
  ): Promise<SocialPost[]> {
    const where =
      before !== undefined
        ? { scope: PostScope.Room, room: { id: roomId }, id: { $lt: before } }
        : { scope: PostScope.Room, room: { id: roomId } };

    const posts = await this.em.find(SocialPost, where, {
      orderBy: { id: 'DESC' },
      limit,
    });
    return posts.reverse();
  }

  async getPostById(postId: number): Promise<SocialPost> {
    const post = await this.em.findOne(SocialPost, { id: postId });
    if (!post) {
      throw new BadRequestException('Post not found');
    }
    return post;
  }

  private async createScopedPost(input: {
    scope: PostScope;
    room: number | null;
    userId: string;
    title: string;
    body: string;
  }): Promise<SocialPost> {
    const post = this.em.create(SocialPost, {
      scope: input.scope,
      room: input.room,
      userId: input.userId,
      title: normalizePostTitle(input.title),
      body: normalizePostBody(input.body),
    });
    this.em.persist(post);
    await this.em.flush();
    return post;
  }
}
