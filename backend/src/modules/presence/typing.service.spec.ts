import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TypingService } from './typing.service';
import { TypingStatus } from './typing-status.entity';

describe('TypingService', () => {
  let service: TypingService;
  let mockRepo: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = { create: jest.fn(), save: jest.fn(), delete: jest.fn(), find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypingService,
        { provide: getRepositoryToken(TypingStatus), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<TypingService>(TypingService);
  });

  it('should mark user as typing', async () => {
    const mockStatus = { id: 1, roomId: 1, userId: 'user1', expiresAt: new Date() };
    mockRepo.create.mockReturnValue(mockStatus);
    mockRepo.save.mockResolvedValue(mockStatus);

    const result = await service.markUserTyping(1, 'user1');

    expect(result).toEqual(mockStatus);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ roomId: 1, userId: 'user1' }));
  });

  it('should remove user typing status', async () => {
    mockRepo.delete.mockResolvedValue({ affected: 1 });

    await service.removeUserTyping(1, 'user1');

    expect(mockRepo.delete).toHaveBeenCalledWith({ roomId: 1, userId: 'user1' });
  });

  it('should get typing users in room', async () => {
    const statuses = [{ id: 1, roomId: 1, userId: 'user1', expiresAt: new Date() }];
    mockRepo.find.mockResolvedValue(statuses);

    expect(await service.getTypingUsersInRoom(1)).toEqual(statuses);
    expect(mockRepo.find).toHaveBeenCalledWith({ where: { roomId: 1 } });
  });
});
