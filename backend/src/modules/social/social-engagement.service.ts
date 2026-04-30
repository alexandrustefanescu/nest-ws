import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    @InjectRepository(SocialPost)
    private readonly posts: Repository<SocialPost>,
    @InjectRepository(PostComment)
    private readonly comments: Repository<PostComment>,
    @InjectRepository(PostLike)
    private readonly likes: Repository<PostLike>,
    @InjectRepository(PostBookmark)
    private readonly bookmarksRepo: Repository<PostBookmark>,
  ) {}

  async listComments(postId: number): Promise<PostComment[]> {
    await this.requirePost(postId);
    return this.comments.find({ where: { postId }, order: { id: 'ASC' } });
  }

  async createComment(postId: number, userId: string, body: string): Promise<PostComment> {
    await this.requirePost(postId);
    const comment = this.comments.create({
      postId,
      userId,
      body: normalizeCommentBody(body),
    });
    return this.comments.save(comment);
  }

  async toggleLike(postId: number, userId: string): Promise<{ postId: number; likeCount: number; liked: boolean }> {
    await this.requirePost(postId);

    const existing = await this.likes.findOne({ where: { postId, userId } });
    let liked: boolean;

    if (existing) {
      await this.likes.delete({ postId, userId });
      liked = false;
    } else {
      const like = this.likes.create({ postId, userId });
      await this.likes.save(like);
      liked = true;
    }

    const likeCount = await this.likes.count({ where: { postId } });
    return { postId, likeCount, liked };
  }

  async toggleBookmark(postId: number, userId: string): Promise<{ bookmarked: boolean }> {
    await this.requirePost(postId);

    const existing = await this.bookmarksRepo.findOne({ where: { postId, userId } });

    if (existing) {
      await this.bookmarksRepo.delete({ postId, userId });
      return { bookmarked: false };
    }

    const bookmark = this.bookmarksRepo.create({ postId, userId });
    await this.bookmarksRepo.save(bookmark);
    return { bookmarked: true };
  }

  async listBookmarks(
    userId: string,
    before?: number,
    limit = 20,
  ): Promise<{ posts: SocialPost[]; hasMore: boolean }> {
    const qb = this.bookmarksRepo
      .createQueryBuilder('bm')
      .innerJoinAndSelect('bm.post', 'post')
      .where('bm.userId = :userId', { userId })
      .orderBy('bm.id', 'DESC')
      .take(limit);

    if (before !== undefined) {
      qb.andWhere('bm.id < :before', { before });
    }

    const results = await qb.getMany();
    return {
      posts: results.map((bm) => bm.post),
      hasMore: results.length === limit,
    };
  }

  async getEngagementForPosts(postIds: number[]): Promise<Record<number, SocialPostEngagement>> {
    if (postIds.length === 0) {
      return {};
    }

    const base = Object.fromEntries(postIds.map((id) => [id, { commentCount: 0, likeCount: 0 }]));

    const [commentRows, likeRows] = await Promise.all([
      this.comments
        .createQueryBuilder('comment')
        .select('comment.postId', 'postId')
        .addSelect('COUNT(*)', 'count')
        .where('comment.postId IN (:...postIds)', { postIds })
        .groupBy('comment.postId')
        .getRawMany<{ postId: string; count: string }>(),
      this.likes
        .createQueryBuilder('like')
        .select('like.postId', 'postId')
        .addSelect('COUNT(*)', 'count')
        .where('like.postId IN (:...postIds)', { postIds })
        .groupBy('like.postId')
        .getRawMany<{ postId: string; count: string }>(),
    ]);

    for (const row of commentRows) {
      const postId = Number(row.postId);
      if (base[postId]) {
        base[postId].commentCount = Number(row.count);
      }
    }

    for (const row of likeRows) {
      const postId = Number(row.postId);
      if (base[postId]) {
        base[postId].likeCount = Number(row.count);
      }
    }

    return base;
  }

  private async requirePost(postId: number): Promise<SocialPost> {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) {
      throw new BadRequestException('Post not found');
    }
    return post;
  }
}
