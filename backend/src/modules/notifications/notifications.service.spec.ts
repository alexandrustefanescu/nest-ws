import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  let mockGateway: { server: { to: jest.Mock } };

  beforeEach(async () => {
    const toMock = jest.fn().mockReturnValue({ emit: jest.fn() });
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };
    mockGateway = { server: { to: toMock } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('create', () => {
    it('skips when actor is recipient', async () => {
      await service.create('user1', 'user1', 'like', 1, 'My Post');
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('persists the notification', async () => {
      const saved = { id: 10, recipientId: 'r', actorId: 'a', type: 'like', postId: 1, read: false, createdAt: new Date() };
      mockRepo.create.mockReturnValue(saved);
      mockRepo.save.mockResolvedValue(saved);

      await service.create('r', 'a', 'like', 1, 'My Post');

      expect(mockRepo.create).toHaveBeenCalledWith({
        recipientId: 'r',
        actorId: 'a',
        type: 'like',
        postId: 1,
      });
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('emits notification:new to recipient personal room', async () => {
      const emitMock = jest.fn();
      mockGateway.server.to.mockReturnValue({ emit: emitMock });
      const saved = { id: 10, recipientId: 'r', actorId: 'a', type: 'like', postId: 1, read: false, createdAt: new Date() };
      mockRepo.create.mockReturnValue(saved);
      mockRepo.save.mockResolvedValue(saved);

      await service.create('r', 'a', 'like', 1, 'My Post');

      expect(mockGateway.server.to).toHaveBeenCalledWith('user:r');
      expect(emitMock).toHaveBeenCalledWith('notification:new', expect.objectContaining({
        id: 10, type: 'like', actorId: 'a', postId: 1, postTitle: 'My Post',
      }));
    });
  });

  describe('listForUser', () => {
    it('returns notifications with post relation, DESC order', async () => {
      const items = [{ id: 2 }, { id: 1 }];
      mockRepo.find.mockResolvedValue(items);

      const result = await service.listForUser('user1');

      expect(mockRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: { recipientId: 'user1' },
        order: { id: 'DESC' },
        relations: ['post'],
        take: 20,
      }));
      expect(result).toEqual(items);
    });
  });

  describe('markRead', () => {
    it('updates the notification read flag for the correct user', async () => {
      mockRepo.update.mockResolvedValue({ affected: 1 });
      await service.markRead('user1', 5);
      expect(mockRepo.update).toHaveBeenCalledWith({ id: 5, recipientId: 'user1' }, { read: true });
    });
  });

  describe('markAllRead', () => {
    it('marks all unread notifications for the user', async () => {
      mockRepo.update.mockResolvedValue({ affected: 3 });
      await service.markAllRead('user1');
      expect(mockRepo.update).toHaveBeenCalledWith({ recipientId: 'user1', read: false }, { read: true });
    });
  });

  describe('getUnreadCount', () => {
    it('counts unread notifications for user', async () => {
      mockRepo.count.mockResolvedValue(7);
      const result = await service.getUnreadCount('user1');
      expect(mockRepo.count).toHaveBeenCalledWith({ where: { recipientId: 'user1', read: false } });
      expect(result).toBe(7);
    });
  });
});
