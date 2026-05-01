import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  let service: ReactionsService;
  let em: jest.Mocked<
    Pick<
      EntityManager,
      | 'getReference'
      | 'create'
      | 'persist'
      | 'flush'
      | 'find'
      | 'findOne'
      | 'nativeDelete'
    >
  >;

  beforeEach(async () => {
    em = {
      getReference: jest.fn(),
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      findOne: jest.fn(),
      nativeDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReactionsService, { provide: EntityManager, useValue: em }],
    }).compile();

    service = module.get(ReactionsService);
  });

  describe('toggleReaction', () => {
    it('adds a reaction when none exists', async () => {
      const msgRef = { id: 1 };
      const reaction = { message: msgRef, userId: 'u1', emoji: '👍' };
      em.getReference.mockReturnValue(msgRef);
      em.findOne.mockResolvedValue(null);
      em.create.mockReturnValue(reaction);
      em.persist.mockReturnThis();
      em.find.mockResolvedValue([reaction] as never);

      const result = await service.toggleReaction(1, 'u1', '👍');

      expect(em.create).toHaveBeenCalledWith(expect.anything(), {
        message: msgRef,
        userId: 'u1',
        emoji: '👍',
      });
      expect(em.persist).toHaveBeenCalledWith(reaction);
      expect(em.flush).toHaveBeenCalled();
      expect(result).toEqual({ '👍': ['u1'] });
    });

    it('removes a reaction when it already exists', async () => {
      const msgRef = { id: 1 };
      em.getReference.mockReturnValue(msgRef);
      em.findOne.mockResolvedValue({
        id: 1,
        message: msgRef,
        userId: 'u1',
        emoji: '👍',
      } as never);
      em.nativeDelete.mockResolvedValue(1);
      em.find.mockResolvedValue([] as never);

      const result = await service.toggleReaction(1, 'u1', '👍');

      expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
        message: msgRef,
        userId: 'u1',
        emoji: '👍',
      });
      expect(result).toEqual({});
    });
  });

  describe('getReactionsForRoom', () => {
    it('returns aggregated reactions keyed by messageId', async () => {
      em.find.mockResolvedValue([
        { message: { id: 1 }, userId: 'u1', emoji: '👍' },
        { message: { id: 1 }, userId: 'u2', emoji: '👍' },
        { message: { id: 2 }, userId: 'u1', emoji: '❤️' },
      ] as never);

      const result = await service.getReactionsForRoom(5);

      expect(em.find).toHaveBeenCalledWith(
        expect.anything(),
        { message: { room: { id: 5 } } },
        expect.objectContaining({ populate: ['message'] }),
      );
      expect(result).toEqual({
        1: { '👍': ['u1', 'u2'] },
        2: { '❤️': ['u1'] },
      });
    });

    it('returns empty object when no reactions', async () => {
      em.find.mockResolvedValue([] as never);
      expect(await service.getReactionsForRoom(5)).toEqual({});
    });
  });
});
