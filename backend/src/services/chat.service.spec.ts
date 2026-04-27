import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Message } from '../modules/messaging/message.entity';
import { RoomUser } from '../modules/presence/room-user.entity';
import { TypingStatus } from '../modules/presence/typing-status.entity';

describe('ChatService', () => {
  let service: ChatService;
  let mockMessageRepository: { delete: jest.Mock };
  let mockRoomUserRepository: { delete: jest.Mock };
  let mockTypingStatusRepository: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockMessageRepository = { delete: jest.fn() };
    mockRoomUserRepository = { delete: jest.fn() };
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
});
