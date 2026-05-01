import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SocialPostsService } from './social-posts.service';
import { PostScope, SocialPost } from './social-post.entity';

describe('SocialPostsService', () => {
  let service: SocialPostsService;
  let mockPosts: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    mockPosts = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialPostsService,
        { provide: getRepositoryToken(SocialPost), useValue: mockPosts },
      ],
    }).compile();

    service = module.get<SocialPostsService>(SocialPostsService);
  });

  it('creates a global post with normalized title and body', async () => {
    const post = {
      id: 1,
      scope: PostScope.Global,
      roomId: null,
      userId: 'user1',
      title: 'Launch update',
      body: 'The new home feed is underway.',
      createdAt: new Date(),
    };
    mockPosts.create.mockReturnValue(post);
    mockPosts.save.mockResolvedValue(post);

    const result = await service.createGlobalPost('user1', '  Launch update  ', '  The new home feed is underway.  ');

    expect(result).toEqual(post);
    expect(mockPosts.create).toHaveBeenCalledWith({
      scope: PostScope.Global,
      roomId: null,
      userId: 'user1',
      title: 'Launch update',
      body: 'The new home feed is underway.',
    });
  });

  it('creates a room-scoped post with required room id', async () => {
    const post = {
      id: 2,
      scope: PostScope.Room,
      roomId: 7,
      userId: 'user2',
      title: 'Community update',
      body: 'We have a new event this weekend.',
      createdAt: new Date(),
    };
    mockPosts.create.mockReturnValue(post);
    mockPosts.save.mockResolvedValue(post);

    const result = await service.createRoomPost(7, 'user2', 'Community update', 'We have a new event this weekend.');

    expect(result).toEqual(post);
    expect(mockPosts.create).toHaveBeenCalledWith({
      scope: PostScope.Room,
      roomId: 7,
      userId: 'user2',
      title: 'Community update',
      body: 'We have a new event this weekend.',
    });
  });

  it('rejects empty post title', async () => {
    await expect(service.createGlobalPost('user1', '   ', 'body')).rejects.toThrow('Post title is required');

    expect(mockPosts.create).not.toHaveBeenCalled();
    expect(mockPosts.save).not.toHaveBeenCalled();
  });

  it('rejects empty post body', async () => {
    await expect(service.createGlobalPost('user1', 'title', '   ')).rejects.toThrow('Post body is required');

    expect(mockPosts.create).not.toHaveBeenCalled();
    expect(mockPosts.save).not.toHaveBeenCalled();
  });

  it('returns the global feed in ascending timeline order for rendering', async () => {
    const posts = [
      { id: 1, scope: PostScope.Global, roomId: null, userId: 'u1', title: 'a', body: 'a', createdAt: new Date() },
      { id: 2, scope: PostScope.Global, roomId: null, userId: 'u2', title: 'b', body: 'b', createdAt: new Date() },
    ];
    mockPosts.find.mockResolvedValue([...posts].reverse());

    const result = await service.getGlobalFeed();

    expect(result).toEqual(posts);
    expect(mockPosts.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { scope: PostScope.Global }, order: { id: 'DESC' }, take: 50 }),
    );
  });

  it('returns a room feed scoped to one community', async () => {
    const posts = [
      { id: 3, scope: PostScope.Room, roomId: 4, userId: 'u1', title: 'first', body: 'body', createdAt: new Date() },
      { id: 4, scope: PostScope.Room, roomId: 4, userId: 'u2', title: 'second', body: 'body', createdAt: new Date() },
    ];
    mockPosts.find.mockResolvedValue([...posts].reverse());

    const result = await service.getRoomFeed(4, 20, 25);

    expect(result).toEqual(posts);
    expect(mockPosts.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: PostScope.Room, roomId: 4 }),
        order: { id: 'DESC' },
        take: 25,
      }),
    );
  });

  it('returns a single post by id', async () => {
    const post = { id: 9, scope: PostScope.Global, roomId: null, userId: 'u1', title: 'single', body: 'body', createdAt: new Date() };
    mockPosts.findOne.mockResolvedValue(post);

    await expect(service.getPostById(9)).resolves.toEqual(post);
    expect(mockPosts.findOne).toHaveBeenCalledWith({ where: { id: 9 } });
  });

  it('throws when a requested post does not exist', async () => {
    mockPosts.findOne.mockResolvedValue(null);

    await expect(service.getPostById(404)).rejects.toThrow('Post not found');
  });
});
