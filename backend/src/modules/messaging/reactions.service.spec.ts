import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReactionsService } from './reactions.service';
import { MessageReaction } from './message-reaction.entity';

describe('ReactionsService', () => {
  let service: ReactionsService;
  let mockReactions: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    mockReactions = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        { provide: getRepositoryToken(MessageReaction), useValue: mockReactions },
      ],
    }).compile();

    service = module.get<ReactionsService>(ReactionsService);
  });

  describe('toggleReaction', () => {
    it('adds a reaction when none exists', async () => {
      mockReactions.findOne.mockResolvedValue(null);
      mockReactions.create.mockReturnValue({ messageId: 1, userId: 'u1', emoji: '👍' });
      mockReactions.save.mockResolvedValue({ id: 1, messageId: 1, userId: 'u1', emoji: '👍' });
      mockReactions.find.mockResolvedValue([{ messageId: 1, userId: 'u1', emoji: '👍' }]);

      const result = await service.toggleReaction(1, 'u1', '👍');

      expect(mockReactions.save).toHaveBeenCalledWith({ messageId: 1, userId: 'u1', emoji: '👍' });
      expect(result).toEqual({ '👍': ['u1'] });
    });

    it('removes a reaction when it already exists', async () => {
      mockReactions.findOne.mockResolvedValue({ id: 1, messageId: 1, userId: 'u1', emoji: '👍' });
      mockReactions.delete.mockResolvedValue({ affected: 1 });
      mockReactions.find.mockResolvedValue([]);

      const result = await service.toggleReaction(1, 'u1', '👍');

      expect(mockReactions.delete).toHaveBeenCalledWith({ messageId: 1, userId: 'u1', emoji: '👍' });
      expect(result).toEqual({});
    });
  });

  describe('getReactionsForRoom', () => {
    it('returns aggregated reactions keyed by messageId', async () => {
      const mockQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { messageId: 1, userId: 'u1', emoji: '👍' },
          { messageId: 1, userId: 'u2', emoji: '👍' },
          { messageId: 2, userId: 'u1', emoji: '❤️' },
        ]),
      };
      mockReactions.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getReactionsForRoom(5);

      expect(result).toEqual({ 1: { '👍': ['u1', 'u2'] }, 2: { '❤️': ['u1'] } });
    });

    it('returns empty object when no reactions', async () => {
      const mockQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockReactions.createQueryBuilder.mockReturnValue(mockQB);

      expect(await service.getReactionsForRoom(5)).toEqual({});
    });
  });
});
