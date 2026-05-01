import { EntityManager } from '@mikro-orm/sqlite';
import { BadRequestException, Injectable } from '@nestjs/common';

import { NotificationsService } from '../notifications/notifications.service';
import { PostBookmark } from './post-bookmark.entity';
import { PostComment } from './post-comment.entity';
import { PostLike } from './post-like.entity';
import { SocialPost } from './social-post.entity';
import { normalizeCommentBody } from './social-post-content.policy';

export interface SocialPostEngagement {
  commentCount: number;
  likeCount: number;
}

@Injectable()
export class SocialEngagementService {
  constructor(
    private readonly em: EntityManager,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listComments(postId: number): Promise<PostComment[]> {
    await this.requirePost(postId);
    return this.em.find(
      PostComment,
      { post: { id: postId } },
      { orderBy: { id: 'ASC' } },
    );
  }

  async createComment(
    postId: number,
    userId: string,
    body: string,
  ): Promise<PostComment> {
    const post = await this.requirePost(postId);
    const comment = this.em.create(PostComment, {
      post: this.em.getReference(SocialPost, postId),
      userId,
      body: normalizeCommentBody(body),
    });
    this.em.persist(comment);
    await this.em.flush();
    void this.notificationsService.create(
      post.userId,
      userId,
      'comment',
      postId,
      post.title,
    );
    return comment;
  }

  async toggleLike(
    postId: number,
    userId: string,
  ): Promise<{ postId: number; likeCount: number; liked: boolean }> {
    const post = await this.requirePost(postId);
    const existing = await this.em.findOne(PostLike, {
      post: { id: postId },
      userId,
    });
    let liked: boolean;

    if (existing) {
      await this.em.nativeDelete(PostLike, { post: { id: postId }, userId });
      liked = false;
    } else {
      const like = this.em.create(PostLike, {
        post: this.em.getReference(SocialPost, postId),
        userId,
      });
      this.em.persist(like);
      await this.em.flush();
      liked = true;
      void this.notificationsService.create(
        post.userId,
        userId,
        'like',
        postId,
        post.title,
      );
    }

    const likeCount = await this.em.count(PostLike, { post: { id: postId } });
    return { postId, likeCount, liked };
  }

  async toggleBookmark(
    postId: number,
    userId: string,
  ): Promise<{ bookmarked: boolean }> {
    await this.requirePost(postId);
    const existing = await this.em.findOne(PostBookmark, {
      post: { id: postId },
      userId,
    });

    if (existing) {
      await this.em.nativeDelete(PostBookmark, {
        post: { id: postId },
        userId,
      });
      return { bookmarked: false };
    }

    const bookmark = this.em.create(PostBookmark, {
      post: this.em.getReference(SocialPost, postId),
      userId,
    });
    this.em.persist(bookmark);
    await this.em.flush();
    return { bookmarked: true };
  }

  async listBookmarks(
    userId: string,
    before?: number,
    limit = 20,
  ): Promise<{ posts: SocialPost[]; hasMore: boolean }> {
    const where =
      before !== undefined ? { userId, id: { $lt: before } } : { userId };

    const results = await this.em.find(PostBookmark, where, {
      populate: ['post'],
      orderBy: { id: 'DESC' },
      limit,
    });

    return {
      posts: results.map((bm) => bm.post),
      hasMore: results.length === limit,
    };
  }

  async getEngagementForPosts(
    postIds: number[],
  ): Promise<Record<number, SocialPostEngagement>> {
    if (postIds.length === 0) return {};

    const base = Object.fromEntries(
      postIds.map((id) => [id, { commentCount: 0, likeCount: 0 }]),
    );

    const [comments, likes] = await Promise.all([
      this.em.find(PostComment, { post: { id: { $in: postIds } } }),
      this.em.find(PostLike, { post: { id: { $in: postIds } } }),
    ]);

    for (const comment of comments) {
      base[comment.postId].commentCount += 1;
    }

    for (const like of likes) {
      base[like.post.id].likeCount += 1;
    }

    return base;
  }

  private async requirePost(postId: number): Promise<SocialPost> {
    const post = await this.em.findOne(SocialPost, { id: postId });
    if (!post) throw new BadRequestException('Post not found');
    return post;
  }
}
