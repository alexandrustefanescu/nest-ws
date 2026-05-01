import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { TypingService } from './typing.service';

describe('TypingService', () => {
  let service: TypingService;
  let em: jest.Mocked<
    Pick<EntityManager, 'create' | 'persist' | 'flush' | 'nativeDelete'>
  >;

  beforeEach(async () => {
    em = {
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      nativeDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TypingService, { provide: EntityManager, useValue: em }],
    }).compile();

    service = module.get(TypingService);
  });

  it('should mark user as typing', async () => {
    const mockStatus = {
      id: 1,
      roomId: 1,
      userId: 'user1',
      expiresAt: new Date(),
    };
    em.create.mockReturnValue(mockStatus);
    em.persist.mockReturnThis();

    const result = await service.markUserTyping(1, 'user1');

    expect(result).toEqual(mockStatus);
    expect(em.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ roomId: 1, userId: 'user1' }),
    );
    expect(em.persist).toHaveBeenCalledWith(mockStatus);
    expect(em.flush).toHaveBeenCalled();
  });

  it('should remove user typing status', async () => {
    em.nativeDelete.mockResolvedValue(1);

    await service.removeUserTyping(1, 'user1');

    expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
      roomId: 1,
      userId: 'user1',
    });
  });

  it('should clear all typing statuses for a room', async () => {
    em.nativeDelete.mockResolvedValue(0);

    await service.clearRoomTyping(1);

    expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
      roomId: 1,
    });
  });
});
