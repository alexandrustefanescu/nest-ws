import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThan } from 'typeorm';
import { PostComment } from '../social/post-comment.entity';
import { SocialPost } from '../social/social-post.entity';
import { UserProfile } from './user-profile.entity';
import { UserProfilesService } from './user-profiles.service';

describe('UserProfilesService', () => {
  let service: UserProfilesService;
  let mockProfiles: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let mockPosts: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let mockComments: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    mockProfiles = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    mockPosts = { find: jest.fn(), createQueryBuilder: jest.fn() };
    mockComments = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfilesService,
        { provide: getRepositoryToken(UserProfile), useValue: mockProfiles },
        { provide: getRepositoryToken(SocialPost), useValue: mockPosts },
        { provide: getRepositoryToken(PostComment), useValue: mockComments },
      ],
    }).compile();

    service = module.get<UserProfilesService>(UserProfilesService);
  });

  describe('getOrCreate', () => {
    it('returns existing profile', async () => {
      const profile = { userId: 'alice', displayName: 'Alice', bio: null };
      mockProfiles.findOne.mockResolvedValue(profile);

      const result = await service.getOrCreate('alice');

      expect(result).toEqual(profile);
      expect(mockProfiles.create).not.toHaveBeenCalled();
    });

    it('creates blank profile when none exists', async () => {
      mockProfiles.findOne.mockResolvedValue(null);
      const blank = { userId: 'bob', displayName: null, bio: null };
      mockProfiles.create.mockReturnValue(blank);
      mockProfiles.save.mockResolvedValue(blank);

      const result = await service.getOrCreate('bob');

      expect(mockProfiles.create).toHaveBeenCalledWith({ userId: 'bob', displayName: null, bio: null });
      expect(result).toEqual(blank);
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      const existing = { userId: 'alice', displayName: 'Alice', bio: null };
      const updated = { ...existing, bio: 'Builder.' };
      mockProfiles.findOne.mockResolvedValue(existing);
      mockProfiles.save.mockResolvedValue(updated);

      const result = await service.update('alice', { bio: 'Builder.' });

      expect(mockProfiles.save).toHaveBeenCalledWith({ ...existing, bio: 'Builder.' });
      expect(result).toEqual(updated);
    });

    it('does not overwrite displayName when only bio is updated', async () => {
      const existing = { userId: 'alice', displayName: 'Alice', bio: null };
      mockProfiles.findOne.mockResolvedValue(existing);
      mockProfiles.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.update('alice', { bio: 'Builder.' });

      expect(result.displayName).toBe('Alice');
    });

    it('auto-creates profile if missing before update', async () => {
      mockProfiles.findOne.mockResolvedValue(null);
      const blank = { userId: 'bob', displayName: null, bio: null };
      mockProfiles.create.mockReturnValue(blank);
      mockProfiles.save.mockResolvedValue({ ...blank, displayName: 'Bob' });

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
      mockPosts.find.mockResolvedValue(posts);

      const result = await service.getUserPosts('alice');

      expect(mockPosts.find).toHaveBeenCalledWith({
        where: { userId: 'alice' },
        order: { id: 'DESC' },
        take: 20,
      });
      expect(result).toEqual([
        { id: 1, userId: 'alice', title: 'A' },
        { id: 2, userId: 'alice', title: 'B' },
      ]);
    });

    it('applies before cursor', async () => {
      mockPosts.find.mockResolvedValue([]);

      await service.getUserPosts('alice', 5);

      expect(mockPosts.find).toHaveBeenCalledWith({
        where: { userId: 'alice', id: LessThan(5) },
        order: { id: 'DESC' },
        take: 20,
      });
    });
  });

  describe('getUserReplies', () => {
    function makeQb(rows: object[]) {
      const qb: Record<string, jest.Mock> = {};
      const chain = () => qb as unknown as ReturnType<typeof mockComments.createQueryBuilder>;
      qb['select'] = jest.fn().mockReturnValue(chain());
      qb['where'] = jest.fn().mockReturnValue(chain());
      qb['andWhere'] = jest.fn().mockReturnValue(chain());
      qb['orderBy'] = jest.fn().mockReturnValue(chain());
      qb['take'] = jest.fn().mockReturnValue(chain());
      qb['getMany'] = jest.fn().mockResolvedValue(rows);
      qb['getQuery'] = jest.fn().mockReturnValue('SELECT DISTINCT c.postId FROM post_comments c WHERE c.userId = :userId');
      qb['getParameters'] = jest.fn().mockReturnValue({ userId: 'alice' });
      qb['setParameters'] = jest.fn().mockReturnValue(chain());
      return qb;
    }

    it('returns posts commented on by user', async () => {
      const commentQb = makeQb([]);
      const postQb = makeQb([{ id: 3, title: 'Discussed' }, { id: 1, title: 'Old' }]);
      mockComments.createQueryBuilder.mockReturnValue(commentQb);
      mockPosts.createQueryBuilder.mockReturnValue(postQb);

      const result = await service.getUserReplies('alice');

      expect(result).toEqual([{ id: 1, title: 'Old' }, { id: 3, title: 'Discussed' }]);
    });

    it('applies before cursor via andWhere', async () => {
      const commentQb = makeQb([]);
      const postQb = makeQb([]);
      mockComments.createQueryBuilder.mockReturnValue(commentQb);
      mockPosts.createQueryBuilder.mockReturnValue(postQb);

      await service.getUserReplies('alice', 10);

      expect(postQb['andWhere']).toHaveBeenCalledWith('p.id < :before', { before: 10 });
    });
  });
});
