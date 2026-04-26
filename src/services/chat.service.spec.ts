import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Message } from '../entities/message.entity';
import { RoomUser } from '../entities/room-user.entity';
import { TypingStatus } from '../entities/typing-status.entity';
import { MessageReaction } from '../entities/message-reaction.entity';

describe('ChatService', () => {
  let service: ChatService;
  let mockMessageRepository: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let mockRoomUserRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let mockTypingStatusRepository: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };
  let mockReactionRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    mockMessageRepository = { create: jest.fn(), save: jest.fn(), delete: jest.fn() };
    mockRoomUserRepository = { find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };
    mockTypingStatusRepository = { create: jest.fn(), save: jest.fn(), delete: jest.fn(), find: jest.fn() };
    mockReactionRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepository },
        { provide: getRepositoryToken(RoomUser), useValue: mockRoomUserRepository },
        { provide: getRepositoryToken(TypingStatus), useValue: mockTypingStatusRepository },
        { provide: getRepositoryToken(MessageReaction), useValue: mockReactionRepository },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should save a message', async () => {
    const mockMessage = { id: 1, roomId: 1, userId: 'user1', text: 'Hello', createdAt: new Date() };
    mockMessageRepository.create.mockReturnValue(mockMessage);
    mockMessageRepository.save.mockResolvedValue(mockMessage);

    const result = await service.saveMessage(1, 'user1', 'Hello');

    expect(result).toEqual(mockMessage);
    expect(mockMessageRepository.create).toHaveBeenCalledWith({ roomId: 1, userId: 'user1', text: 'Hello' });
    expect(mockMessageRepository.save).toHaveBeenCalledWith(mockMessage);
  });

  it('should get users in a room', async () => {
    const mockUsers = [
      { id: 1, roomId: 1, userId: 'user1', joinedAt: new Date() },
      { id: 2, roomId: 1, userId: 'user2', joinedAt: new Date() },
    ];
    mockRoomUserRepository.find.mockResolvedValue(mockUsers);

    const result = await service.getUsersInRoom(1);

    expect(result).toEqual(mockUsers);
    expect(mockRoomUserRepository.find).toHaveBeenCalledWith({ where: { roomId: 1 } });
  });

  it('should add user to room', async () => {
    const mockRoomUser = { id: 1, roomId: 1, userId: 'user1', joinedAt: new Date() };
    mockRoomUserRepository.create.mockReturnValue(mockRoomUser);
    mockRoomUserRepository.save.mockResolvedValue(mockRoomUser);

    const result = await service.addUserToRoom(1, 'user1');

    expect(result).toEqual(mockRoomUser);
    expect(mockRoomUserRepository.create).toHaveBeenCalledWith({ roomId: 1, userId: 'user1' });
  });

  it('should remove user from room', async () => {
    mockRoomUserRepository.delete.mockResolvedValue({ affected: 1 });

    await service.removeUserFromRoom(1, 'user1');

    expect(mockRoomUserRepository.delete).toHaveBeenCalledWith({ roomId: 1, userId: 'user1' });
  });

  it('should mark user as typing', async () => {
    const mockStatus = { id: 1, roomId: 1, userId: 'user1', expiresAt: new Date() };
    mockTypingStatusRepository.create.mockReturnValue(mockStatus);
    mockTypingStatusRepository.save.mockResolvedValue(mockStatus);

    const result = await service.markUserTyping(1, 'user1');

    expect(result).toEqual(mockStatus);
    expect(mockTypingStatusRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 1, userId: 'user1' }),
    );
  });

  it('should remove user typing status', async () => {
    mockTypingStatusRepository.delete.mockResolvedValue({ affected: 1 });

    await service.removeUserTyping(1, 'user1');

    expect(mockTypingStatusRepository.delete).toHaveBeenCalledWith({ roomId: 1, userId: 'user1' });
  });

  it('should get typing users in room', async () => {
    const mockStatuses = [{ id: 1, roomId: 1, userId: 'user1', expiresAt: new Date() }];
    mockTypingStatusRepository.find.mockResolvedValue(mockStatuses);

    const result = await service.getTypingUsersInRoom(1);

    expect(result).toEqual(mockStatuses);
    expect(mockTypingStatusRepository.find).toHaveBeenCalledWith({ where: { roomId: 1 } });
  });

  it('should clear all room data', async () => {
    mockMessageRepository.delete.mockResolvedValue({ affected: 3 });
    mockRoomUserRepository.delete.mockResolvedValue({ affected: 2 });
    mockTypingStatusRepository.delete.mockResolvedValue({ affected: 1 });

    await service.clearRoomData(1);

    expect(mockMessageRepository.delete).toHaveBeenCalledWith({ roomId: 1 });
    expect(mockRoomUserRepository.delete).toHaveBeenCalledWith({ roomId: 1 });
    expect(mockTypingStatusRepository.delete).toHaveBeenCalledWith({ roomId: 1 });
  });

  describe('toggleReaction', () => {
    it('should add a reaction when none exists', async () => {
      mockReactionRepository.findOne.mockResolvedValue(null);
      mockReactionRepository.create.mockReturnValue({ messageId: 1, userId: 'u1', emoji: '👍' });
      mockReactionRepository.save.mockResolvedValue({ id: 1, messageId: 1, userId: 'u1', emoji: '👍' });
      mockReactionRepository.find.mockResolvedValue([
        { messageId: 1, userId: 'u1', emoji: '👍' },
      ]);

      const result = await service.toggleReaction(1, 'u1', '👍');

      expect(mockReactionRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ '👍': ['u1'] });
    });

    it('should remove a reaction when it already exists', async () => {
      mockReactionRepository.findOne.mockResolvedValue({ id: 1, messageId: 1, userId: 'u1', emoji: '👍' });
      mockReactionRepository.delete.mockResolvedValue({ affected: 1 });
      mockReactionRepository.find.mockResolvedValue([]);

      const result = await service.toggleReaction(1, 'u1', '👍');

      expect(mockReactionRepository.delete).toHaveBeenCalledWith({ messageId: 1, userId: 'u1', emoji: '👍' });
      expect(result).toEqual({});
    });
  });

  describe('getReactionsForRoom', () => {
    it('should return aggregated reactions keyed by messageId', async () => {
      const mockQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { messageId: 1, userId: 'u1', emoji: '👍' },
          { messageId: 1, userId: 'u2', emoji: '👍' },
          { messageId: 2, userId: 'u1', emoji: '❤️' },
        ]),
      };
      mockReactionRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getReactionsForRoom(5);

      expect(result).toEqual({
        1: { '👍': ['u1', 'u2'] },
        2: { '❤️': ['u1'] },
      });
    });

    it('should return empty object when no reactions', async () => {
      const mockQB = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockReactionRepository.createQueryBuilder.mockReturnValue(mockQB);

      const result = await service.getReactionsForRoom(5);
      expect(result).toEqual({});
    });
  });
});
