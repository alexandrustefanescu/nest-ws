import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let em: jest.Mocked<
    Pick<
      EntityManager,
      | 'getReference'
      | 'create'
      | 'persist'
      | 'flush'
      | 'find'
      | 'nativeUpdate'
      | 'count'
    >
  >;
  let mockGateway: { server: { to: jest.Mock } };

  beforeEach(async () => {
    const toMock = jest.fn().mockReturnValue({ emit: jest.fn() });
    em = {
      getReference: jest.fn(),
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      nativeUpdate: jest.fn(),
      count: jest.fn(),
    };
    mockGateway = { server: { to: toMock } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: EntityManager, useValue: em },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('create', () => {
    it('skips when actor is recipient', async () => {
      await service.create('user1', 'user1', 'like', 1, 'My Post');
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('persists the notification', async () => {
      const postRef = { id: 1 };
      const saved = {
        id: 10,
        recipientId: 'r',
        actorId: 'a',
        type: 'like',
        post: postRef,
        read: false,
        createdAt: new Date(),
      };
      em.getReference.mockReturnValue(postRef);
      em.create.mockReturnValue(saved);
      em.persist.mockReturnThis();

      await service.create('r', 'a', 'like', 1, 'My Post');

      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          recipientId: 'r',
          actorId: 'a',
          type: 'like',
          post: postRef,
        }),
      );
      expect(em.flush).toHaveBeenCalled();
    });

    it('emits notification:new to recipient personal room', async () => {
      const emitMock = jest.fn();
      mockGateway.server.to.mockReturnValue({ emit: emitMock });
      const postRef = { id: 1 };
      const saved = {
        id: 10,
        recipientId: 'r',
        actorId: 'a',
        type: 'like',
        post: postRef,
        read: false,
        createdAt: new Date(),
      };
      em.getReference.mockReturnValue(postRef);
      em.create.mockReturnValue(saved);
      em.persist.mockReturnThis();

      await service.create('r', 'a', 'like', 1, 'My Post');

      expect(mockGateway.server.to).toHaveBeenCalledWith('user:r');
      expect(emitMock).toHaveBeenCalledWith(
        'notification:new',
        expect.objectContaining({
          id: 10,
          type: 'like',
          actorId: 'a',
          postId: 1,
          postTitle: 'My Post',
        }),
      );
    });
  });

  describe('listForUser', () => {
    it('returns notifications with post relation, DESC order', async () => {
      const items = [{ id: 2 }, { id: 1 }];
      em.find.mockResolvedValue(items);

      const result = await service.listForUser('user1');

      expect(em.find).toHaveBeenCalledWith(
        expect.anything(),
        { recipientId: 'user1' },
        expect.objectContaining({
          orderBy: { id: 'DESC' },
          populate: ['post'],
          limit: 20,
        }),
      );
      expect(result).toEqual(items);
    });
  });

  describe('markRead', () => {
    it('updates the notification read flag for the correct user', async () => {
      em.nativeUpdate.mockResolvedValue(1);
      await service.markRead('user1', 5);
      expect(em.nativeUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { id: 5, recipientId: 'user1' },
        { read: true },
      );
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications for the user', async () => {
      em.nativeUpdate.mockResolvedValue(3);
      await service.markAllRead('user1');
      expect(em.nativeUpdate).toHaveBeenCalledWith(
        expect.anything(),
        { recipientId: 'user1', read: false },
        { read: true },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('counts unread notifications for user', async () => {
      em.count.mockResolvedValue(7);
      const result = await service.getUnreadCount('user1');
      expect(em.count).toHaveBeenCalledWith(expect.anything(), {
        recipientId: 'user1',
        read: false,
      });
      expect(result).toBe(7);
    });
  });
});
