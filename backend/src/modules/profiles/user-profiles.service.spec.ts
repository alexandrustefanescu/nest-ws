import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { UserProfilesService } from './user-profiles.service';

describe('UserProfilesService', () => {
  let service: UserProfilesService;
  let em: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'find' | 'create' | 'persist' | 'flush'>
  >;

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfilesService,
        { provide: EntityManager, useValue: em },
      ],
    }).compile();

    service = module.get(UserProfilesService);
  });

  describe('getOrCreate', () => {
    it('returns existing profile', async () => {
      const profile = { userId: 'alice', displayName: 'Alice', bio: null };
      em.findOne.mockResolvedValue(profile);

      const result = await service.getOrCreate('alice');

      expect(result).toEqual(profile);
      expect(em.create).not.toHaveBeenCalled();
    });

    it('creates blank profile when none exists', async () => {
      em.findOne.mockResolvedValue(null);
      const blank = { userId: 'bob', displayName: null, bio: null };
      em.create.mockReturnValue(blank);
      em.persist.mockReturnThis();

      const result = await service.getOrCreate('bob');

      expect(em.create).toHaveBeenCalledWith(expect.anything(), {
        userId: 'bob',
        displayName: null,
        bio: null,
      });
      expect(result).toEqual(blank);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      const existing = { userId: 'alice', displayName: 'Alice', bio: null };
      em.findOne.mockResolvedValue(existing);

      const result = await service.update('alice', { bio: 'Builder.' });

      expect(em.flush).toHaveBeenCalled();
      expect(result.bio).toBe('Builder.');
    });

    it('does not overwrite displayName when only bio is updated', async () => {
      const existing = { userId: 'alice', displayName: 'Alice', bio: null };
      em.findOne.mockResolvedValue(existing);

      const result = await service.update('alice', { bio: 'Builder.' });

      expect(result.displayName).toBe('Alice');
    });

    it('auto-creates profile if missing before update', async () => {
      em.findOne.mockResolvedValue(null);
      const blank = { userId: 'bob', displayName: null, bio: null };
      em.create.mockReturnValue(blank);
      em.persist.mockReturnThis();

      const result = await service.update('bob', { displayName: 'Bob' });

      expect(result.displayName).toBe('Bob');
    });
  });

  describe('getUserPosts', () => {
    it('returns posts for user ordered oldest-first', async () => {
      const posts = [
        { id: 2, userId: 'alice', title: 'B' },
        { id: 1, userId: 'alice', title: 'A' },
      ];
      em.find.mockResolvedValue(posts);

      const result = await service.getUserPosts('alice');

      expect(em.find).toHaveBeenCalledWith(
        expect.anything(),
        { userId: 'alice' },
        { orderBy: { id: 'DESC' }, limit: 20 },
      );
      expect(result).toEqual([
        { id: 1, userId: 'alice', title: 'A' },
        { id: 2, userId: 'alice', title: 'B' },
      ]);
    });

    it('applies before cursor', async () => {
      em.find.mockResolvedValue([] as never);

      await service.getUserPosts('alice', 5);

      expect(em.find).toHaveBeenCalledWith(
        expect.anything(),
        { userId: 'alice', id: { $lt: 5 } },
        expect.objectContaining({ orderBy: { id: 'DESC' } }),
      );
    });
  });

  describe('getUserReplies', () => {
    it('returns empty array when user has no comments', async () => {
      em.find.mockResolvedValue([] as never);

      const result = await service.getUserReplies('alice');

      expect(result).toEqual([]);
    });

    it('returns posts commented on by user in oldest-first order', async () => {
      const comments = [{ post: { id: 3 } }, { post: { id: 1 } }];
      const posts = [
        { id: 3, title: 'Discussed' },
        { id: 1, title: 'Old' },
      ];
      em.find.mockResolvedValueOnce(comments).mockResolvedValueOnce(posts);

      const result = await service.getUserReplies('alice');

      expect(result).toEqual([
        { id: 1, title: 'Old' },
        { id: 3, title: 'Discussed' },
      ]);
    });

    it('applies before cursor for replies', async () => {
      const comments = [{ post: { id: 5 } }];
      em.find
        .mockResolvedValueOnce(comments)
        .mockResolvedValueOnce([] as never);

      await service.getUserReplies('alice', 10);

      const [[, secondWhere]] = (em.find.mock.calls as unknown[][]).slice(1);
      expect(secondWhere).toMatchObject({ id: { $lt: 10 } });
    });
  });
});
