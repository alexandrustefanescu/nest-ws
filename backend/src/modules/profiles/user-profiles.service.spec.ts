import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserProfilesService } from './user-profiles.service';
import { UserProfile } from './user-profile.entity';
import { SocialPost } from '../social/social-post.entity';
import { PostComment } from '../social/post-comment.entity';

describe('UserProfilesService', () => {
  let service: UserProfilesService;
  let mockProfiles: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let mockPosts: { createQueryBuilder: jest.Mock };
  let mockComments: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    mockProfiles = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    mockPosts = { createQueryBuilder: jest.fn() };
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

    it('auto-creates profile if missing before update', async () => {
      mockProfiles.findOne.mockResolvedValue(null);
      const blank = { userId: 'bob', displayName: null, bio: null };
      mockProfiles.create.mockReturnValue(blank);
      mockProfiles.save.mockResolvedValue({ ...blank, displayName: 'Bob' });

      const result = await service.update('bob', { displayName: 'Bob' });

      expect(result.displayName).toBe('Bob');
    });
  });
});
