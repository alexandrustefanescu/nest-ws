import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Message } from '../entities/message.entity';
import { RoomUser } from '../entities/room-user.entity';
import { TypingStatus } from '../entities/typing-status.entity';

describe('ChatService', () => {
  let service: ChatService;
  let mockMessageRepository: {
    create: jest.Mock;
    save: jest.Mock;
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

  beforeEach(async () => {
    mockMessageRepository = { create: jest.fn(), save: jest.fn() };
    mockRoomUserRepository = { find: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };
    mockTypingStatusRepository = { create: jest.fn(), save: jest.fn(), delete: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepository },
        { provide: getRepositoryToken(RoomUser), useValue: mockRoomUserRepository },
        { provide: getRepositoryToken(TypingStatus), useValue: mockTypingStatusRepository },
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
});
