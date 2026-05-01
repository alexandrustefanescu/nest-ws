import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { PostScope, SocialPost } from './social-post.entity';
import { SocialPostsService } from './social-posts.service';

describe('SocialPostsService', () => {
  let service: SocialPostsService;
  let em: jest.Mocked<
    Pick<EntityManager, 'create' | 'persist' | 'flush' | 'find' | 'findOne'>
  >;

  beforeEach(async () => {
    em = {
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SocialPostsService, { provide: EntityManager, useValue: em }],
    }).compile();

    service = module.get(SocialPostsService);
  });

  it('creates a global post with normalized title and body', async () => {
    const post = {
      id: 1,
      scope: PostScope.Global,
      room: null,
      userId: 'user1',
      title: 'Launch update',
      body: 'The new home feed is underway.',
      createdAt: new Date(),
    };
    em.create.mockReturnValue(post);
    em.persist.mockReturnThis();

    const result = await service.createGlobalPost(
      'user1',
      '  Launch update  ',
      '  The new home feed is underway.  ',
    );

    expect(result).toEqual(post);
    expect(em.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scope: PostScope.Global,
        room: null,
        userId: 'user1',
        title: 'Launch update',
        body: 'The new home feed is underway.',
      }),
    );
  });

  it('creates a room-scoped post with required room id', async () => {
    const post = {
      id: 2,
      scope: PostScope.Room,
      room: 7,
      userId: 'user2',
      title: 'Community update',
      body: 'We have a new event this weekend.',
      createdAt: new Date(),
    };
    em.create.mockReturnValue(post);
    em.persist.mockReturnThis();

    const result = await service.createRoomPost(
      7,
      'user2',
      'Community update',
      'We have a new event this weekend.',
    );

    expect(result).toEqual(post);
    expect(em.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        scope: PostScope.Room,
        room: 7,
        userId: 'user2',
      }),
    );
  });

  it('rejects empty post title', async () => {
    await expect(
      service.createGlobalPost('user1', '   ', 'body'),
    ).rejects.toThrow('Post title is required');
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('rejects empty post body', async () => {
    await expect(
      service.createGlobalPost('user1', 'title', '   '),
    ).rejects.toThrow('Post body is required');
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('returns the global feed in ascending timeline order for rendering', async () => {
    const posts = [
      {
        id: 1,
        scope: PostScope.Global,
        room: null,
        userId: 'u1',
        title: 'a',
        body: 'a',
        createdAt: new Date(),
      },
      {
        id: 2,
        scope: PostScope.Global,
        room: null,
        userId: 'u2',
        title: 'b',
        body: 'b',
        createdAt: new Date(),
      },
    ];
    em.find.mockResolvedValue([...posts].reverse());

    const result = await service.getGlobalFeed();

    expect(result).toEqual(posts);
    expect(em.find).toHaveBeenCalledWith(
      expect.anything(),
      { scope: PostScope.Global },
      expect.objectContaining({ orderBy: { id: 'DESC' }, limit: 50 }),
    );
  });

  it('returns a room feed scoped to one community', async () => {
    const posts = [
      {
        id: 3,
        scope: PostScope.Room,
        room: { id: 4 },
        userId: 'u1',
        title: 'first',
        body: 'body',
        createdAt: new Date(),
      },
      {
        id: 4,
        scope: PostScope.Room,
        room: { id: 4 },
        userId: 'u2',
        title: 'second',
        body: 'body',
        createdAt: new Date(),
      },
    ];
    em.find.mockResolvedValue([...posts].reverse());

    const result = await service.getRoomFeed(4, 20, 25);

    expect(result).toEqual(posts);
    expect(em.find).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scope: PostScope.Room }),
      expect.objectContaining({ orderBy: { id: 'DESC' }, limit: 25 }),
    );
  });

  it('returns a single post by id', async () => {
    const post = {
      id: 9,
      scope: PostScope.Global,
      room: null,
      userId: 'u1',
      title: 'single',
      body: 'body',
      createdAt: new Date(),
    } as SocialPost;
    em.findOne.mockResolvedValue(post);

    await expect(service.getPostById(9)).resolves.toEqual(post);
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), { id: 9 });
  });

  it('throws when a requested post does not exist', async () => {
    em.findOne.mockResolvedValue(null);
    await expect(service.getPostById(404)).rejects.toThrow('Post not found');
  });
});
