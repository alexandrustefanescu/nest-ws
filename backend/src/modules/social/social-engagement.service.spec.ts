import { jest } from '@jest/globals';
import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { NotificationsService } from '../notifications/notifications.service';
import { SocialEngagementService } from './social-engagement.service';
import { PostScope, type SocialPost } from './social-post.entity';

describe('SocialEngagementService', () => {
  let service: SocialEngagementService;
  let em: jest.Mocked<
    Pick<
      EntityManager,
      | 'getReference'
      | 'findOne'
      | 'find'
      | 'create'
      | 'persist'
      | 'flush'
      | 'nativeDelete'
      | 'count'
      | 'createQueryBuilder'
      | 'transactional'
    >
  >;
  let mockNotifications: { create: jest.Mock };

  beforeEach(async () => {
    em = {
      getReference: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      nativeDelete: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
      transactional: jest.fn().mockImplementation(async (cb) => cb(em)),
    };
    mockNotifications = { create: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialEngagementService,
        { provide: EntityManager, useValue: em },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get(SocialEngagementService);
  });

  it('creates a normalized flat comment for an existing post', async () => {
    const post = {
      id: 1,
      scope: PostScope.Global,
      userId: 'bob',
      title: 'Hi',
    } as SocialPost;
    const postRef = { id: 1 };
    const comment = {
      id: 1,
      post: postRef,
      userId: 'alice',
      body: 'Nice update',
      createdAt: new Date(),
    };
    em.findOne.mockResolvedValue(post);
    em.getReference.mockReturnValue(postRef);
    em.create.mockReturnValue(comment);
    em.persist.mockReturnThis();

    const result = await service.createComment(1, 'alice', '  Nice update  ');

    expect(result).toEqual(comment);
    expect(em.create).toHaveBeenCalledWith(expect.anything(), {
      post: postRef,
      userId: 'alice',
      body: 'Nice update',
    });
  });

  it('rejects comments for missing posts', async () => {
    em.findOne.mockResolvedValue(null);

    await expect(service.createComment(99, 'alice', 'hello')).rejects.toThrow(
      'Post not found',
    );
    expect(em.create).not.toHaveBeenCalled();
  });

  it('toggles likes on and off', async () => {
    const post = {
      id: 1,
      scope: PostScope.Global,
      userId: 'bob',
      title: 'Hi',
    } as SocialPost;
    const postRef = { id: 1 };
    em.findOne
      .mockResolvedValueOnce(post) // requirePost for first toggle
      .mockResolvedValueOnce(null) // no existing like → add
      .mockResolvedValueOnce(post) // requirePost for second toggle
      .mockResolvedValueOnce({ id: 99 }); // existing like → remove
    em.getReference.mockReturnValue(postRef);
    em.create.mockReturnValue({ post: postRef, userId: 'alice' });
    em.persist.mockReturnThis();
    em.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    em.nativeDelete.mockResolvedValue(1);

    await expect(service.toggleLike(1, 'alice')).resolves.toEqual({
      postId: 1,
      likeCount: 1,
      liked: true,
    });
    await expect(service.toggleLike(1, 'alice')).resolves.toEqual({
      postId: 1,
      likeCount: 0,
      liked: false,
    });
  });

  it('lists comments in ascending order for an existing post', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    const comments = [
      {
        id: 1,
        post: { id: 1 },
        userId: 'alice',
        body: 'Hi',
        createdAt: new Date(),
      },
    ];
    em.findOne.mockResolvedValue(post);
    em.find.mockResolvedValue(comments);

    await expect(service.listComments(1)).resolves.toEqual(comments);
    expect(em.find).toHaveBeenCalledWith(
      expect.anything(),
      { post: { id: 1 } },
      { orderBy: { id: 'ASC' } },
    );
  });

  it('bookmarks a post that is not yet bookmarked', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    const postRef = { id: 1 };
    em.findOne
      .mockResolvedValueOnce(post) // requirePost
      .mockResolvedValueOnce(null); // no existing bookmark
    em.getReference.mockReturnValue(postRef);
    em.create.mockReturnValue({ post: postRef, userId: 'alice' });
    em.persist.mockReturnThis();

    await expect(service.toggleBookmark(1, 'alice')).resolves.toEqual({
      bookmarked: true,
    });
    expect(em.create).toHaveBeenCalledWith(expect.anything(), {
      post: postRef,
      userId: 'alice',
    });
  });

  it('removes a bookmark that already exists', async () => {
    const post = { id: 1, scope: PostScope.Global } as SocialPost;
    em.findOne
      .mockResolvedValueOnce(post) // requirePost
      .mockResolvedValueOnce({ id: 1 }); // existing bookmark
    em.nativeDelete.mockResolvedValue(1);

    await expect(service.toggleBookmark(1, 'alice')).resolves.toEqual({
      bookmarked: false,
    });
    expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
      post: { id: 1 },
      userId: 'alice',
    });
  });

  it('rejects toggleBookmark for missing posts', async () => {
    em.findOne.mockResolvedValue(null);

    await expect(service.toggleBookmark(99, 'alice')).rejects.toThrow(
      'Post not found',
    );
    expect(em.create).not.toHaveBeenCalled();
  });

  it('returns paginated bookmarked posts for a user', async () => {
    const post = {
      id: 1,
      scope: PostScope.Global,
      userId: 'bob',
      title: 'Hello',
      body: 'World',
      createdAt: new Date(),
    } as SocialPost;
    const bookmarkRow = { id: 5, post };
    em.find.mockResolvedValue([bookmarkRow] as never);

    const result = await service.listBookmarks('alice', undefined, 20);

    expect(result.posts).toEqual([post]);
    expect(result.hasMore).toBe(false);
    expect(em.find).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'alice' },
      expect.objectContaining({ populate: ['post'], orderBy: { id: 'DESC' } }),
    );
  });

  it('applies before cursor when provided', async () => {
    em.find.mockResolvedValue([] as never);

    await service.listBookmarks('alice', 10, 20);

    expect(em.find).toHaveBeenCalledWith(
      expect.anything(),
      { userId: 'alice', id: { $lt: 10 } },
      expect.anything(),
    );
  });

  it('signals hasMore when full page returned', async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      post: { id: i + 1, userId: 'bob' } as SocialPost,
    }));
    em.find.mockResolvedValue(rows);

    const result = await service.listBookmarks('alice', undefined, 20);

    expect(result.hasMore).toBe(true);
  });

  it('aggregates like and comment counts per post', async () => {
    const comments = [
      { post: { id: 1 }, postId: 1 },
      { post: { id: 1 }, postId: 1 },
    ];
    const likes = [
      { post: { id: 2 } },
      { post: { id: 2 } },
      { post: { id: 2 } },
    ];
    em.find.mockResolvedValueOnce(comments).mockResolvedValueOnce(likes);

    await expect(service.getEngagementForPosts([1, 2])).resolves.toEqual({
      1: { commentCount: 2, likeCount: 0 },
      2: { commentCount: 0, likeCount: 3 },
    });
    expect(em.find).toHaveBeenCalledTimes(2);
  });
});
