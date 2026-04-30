import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostBookmark } from './post-bookmark.entity';
import { PostComment } from './post-comment.entity';
import { PostLike } from './post-like.entity';
import { SocialEngagementService } from './social-engagement.service';
import { PostScope, SocialPost } from './social-post.entity';

describe('SocialEngagementService', () => {
  let service: SocialEngagementService;
  let mockPosts: { findOne: jest.Mock };
  let mockComments: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockLikes: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockBookmarks: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    mockPosts = { findOne: jest.fn() };
    mockComments = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    mockLikes = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    mockBookmarks = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialEngagementService,
        { provide: getRepositoryToken(SocialPost), useValue: mockPosts },
        { provide: getRepositoryToken(PostComment), useValue: mockComments },
        { provide: getRepositoryToken(PostLike), useValue: mockLikes },
        { provide: getRepositoryToken(PostBookmark), useValue: mockBookmarks },
      ],
    }).compile();

    service = module.get<SocialEngagementService>(SocialEngagementService);
  });

  it('creates a normalized flat comment for an existing post', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    const comment = { id: 1, postId: 1, userId: 'alice', body: 'Nice update', createdAt: new Date() };
    mockPosts.findOne.mockResolvedValue(post);
    mockComments.create.mockReturnValue(comment);
    mockComments.save.mockResolvedValue(comment);

    const result = await service.createComment(1, 'alice', '  Nice update  ');

    expect(result).toEqual(comment);
    expect(mockComments.create).toHaveBeenCalledWith({ postId: 1, userId: 'alice', body: 'Nice update' });
  });

  it('rejects comments for missing posts', async () => {
    mockPosts.findOne.mockResolvedValue(null);

    await expect(service.createComment(99, 'alice', 'hello')).rejects.toThrow('Post not found');
    expect(mockComments.create).not.toHaveBeenCalled();
  });

  it('toggles likes on and off', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    mockPosts.findOne.mockResolvedValue(post);
    mockLikes.findOne.mockResolvedValueOnce(null);
    mockLikes.create.mockReturnValue({ postId: 1, userId: 'alice' });
    mockLikes.save.mockResolvedValue({ id: 1, postId: 1, userId: 'alice' });
    mockLikes.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    mockLikes.findOne.mockResolvedValueOnce({ id: 1, postId: 1, userId: 'alice' });
    mockLikes.delete.mockResolvedValue({ affected: 1 });

    await expect(service.toggleLike(1, 'alice')).resolves.toEqual({ postId: 1, likeCount: 1, liked: true });
    await expect(service.toggleLike(1, 'alice')).resolves.toEqual({ postId: 1, likeCount: 0, liked: false });
  });

  it('lists comments in ascending order for an existing post', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    const comments = [{ id: 1, postId: 1, userId: 'alice', body: 'Hi', createdAt: new Date() }];
    mockPosts.findOne.mockResolvedValue(post);
    mockComments.find.mockResolvedValue(comments);

    await expect(service.listComments(1)).resolves.toEqual(comments);
    expect(mockComments.find).toHaveBeenCalledWith({ where: { postId: 1 }, order: { id: 'ASC' } });
  });

  it('bookmarks a post that is not yet bookmarked', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    mockPosts.findOne.mockResolvedValue(post);
    mockBookmarks.findOne.mockResolvedValue(null);
    mockBookmarks.create.mockReturnValue({ postId: 1, userId: 'alice' });
    mockBookmarks.save.mockResolvedValue({ id: 1, postId: 1, userId: 'alice' });

    await expect(service.toggleBookmark(1, 'alice')).resolves.toEqual({ bookmarked: true });
    expect(mockBookmarks.create).toHaveBeenCalledWith({ postId: 1, userId: 'alice' });
    expect(mockBookmarks.save).toHaveBeenCalled();
  });

  it('removes a bookmark that already exists', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    mockPosts.findOne.mockResolvedValue(post);
    mockBookmarks.findOne.mockResolvedValue({ id: 1, postId: 1, userId: 'alice' });
    mockBookmarks.delete.mockResolvedValue({ affected: 1 });

    await expect(service.toggleBookmark(1, 'alice')).resolves.toEqual({ bookmarked: false });
    expect(mockBookmarks.delete).toHaveBeenCalledWith({ postId: 1, userId: 'alice' });
  });

  it('rejects toggleBookmark for missing posts', async () => {
    mockPosts.findOne.mockResolvedValue(null);

    await expect(service.toggleBookmark(99, 'alice')).rejects.toThrow('Post not found');
    expect(mockBookmarks.findOne).not.toHaveBeenCalled();
  });

  it('returns paginated bookmarked posts for a user', async () => {
    const post = { id: 1, scope: PostScope.Global, userId: 'bob', title: 'Hello', body: 'World', createdAt: new Date() } as SocialPost;
    const bookmarkRow = { id: 5, postId: 1, userId: 'alice', post };
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([bookmarkRow]),
    };
    mockBookmarks.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listBookmarks('alice', undefined, 20);

    expect(result.posts).toEqual([post]);
    expect(result.hasMore).toBe(false);
    expect(qb.where).toHaveBeenCalledWith('bm.userId = :userId', { userId: 'alice' });
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('applies before cursor when provided', async () => {
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    mockBookmarks.createQueryBuilder.mockReturnValue(qb);

    await service.listBookmarks('alice', 10, 20);

    expect(qb.andWhere).toHaveBeenCalledWith('bm.id < :before', { before: 10 });
  });

  it('signals hasMore when full page returned', async () => {
    const posts = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      post: { id: i + 1, userId: 'bob' } as SocialPost,
    }));
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(posts),
    };
    mockBookmarks.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listBookmarks('alice', undefined, 20);

    expect(result.hasMore).toBe(true);
  });

  it('aggregates like and comment counts per post', async () => {
    const commentQB = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ postId: '1', count: '2' }]),
    };
    const likeQB = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ postId: '2', count: '3' }]),
    };
    mockComments.createQueryBuilder.mockReturnValue(commentQB);
    mockLikes.createQueryBuilder.mockReturnValue(likeQB);

    await expect(service.getEngagementForPosts([1, 2])).resolves.toEqual({
      1: { commentCount: 2, likeCount: 0 },
      2: { commentCount: 0, likeCount: 3 },
    });
  });
});
