import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PresenceService } from './presence.service';
import { RoomUser } from './room-user.entity';

describe('PresenceService', () => {
  let service: PresenceService;
  let mockRoomUsers: {
    find: jest.Mock;
    findOneOrFail: jest.Mock;
    upsert: jest.Mock;
    delete: jest.Mock;
    clear: jest.Mock;
  };

  beforeEach(async () => {
    mockRoomUsers = {
      find: jest.fn(),
      findOneOrFail: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenceService,
        { provide: getRepositoryToken(RoomUser), useValue: mockRoomUsers },
      ],
    }).compile();

    service = module.get<PresenceService>(PresenceService);
  });

  it('should get users in a room', async () => {
    const users = [{ id: 1, roomId: 1, userId: 'user1', joinedAt: new Date() }];
    mockRoomUsers.find.mockResolvedValue(users);

    expect(await service.getUsersInRoom(1)).toEqual(users);
    expect(mockRoomUsers.find).toHaveBeenCalledWith({ where: { roomId: 1 } });
  });

  it('should add user to room via upsert', async () => {
    const roomUser = { id: 1, roomId: 1, userId: 'user1', joinedAt: new Date() };
    mockRoomUsers.upsert.mockResolvedValue(undefined);
    mockRoomUsers.findOneOrFail.mockResolvedValue(roomUser);

    expect(await service.addUserToRoom(1, 'user1')).toEqual(roomUser);
    expect(mockRoomUsers.upsert).toHaveBeenCalledWith(
      { roomId: 1, userId: 'user1' },
      ['roomId', 'userId'],
    );
  });

  it('should not create a duplicate when called twice for the same user', async () => {
    const existing = { id: 1, roomId: 1, userId: 'user1', joinedAt: new Date() };
    mockRoomUsers.upsert.mockResolvedValue(undefined);
    mockRoomUsers.findOneOrFail.mockResolvedValue(existing);

    expect(await service.addUserToRoom(1, 'user1')).toEqual(existing);
    expect(await service.addUserToRoom(1, 'user1')).toEqual(existing);
    expect(mockRoomUsers.upsert).toHaveBeenCalledTimes(2);
  });

  it('should remove user from room', async () => {
    mockRoomUsers.delete.mockResolvedValue({ affected: 1 });

    await service.removeUserFromRoom(1, 'user1');

    expect(mockRoomUsers.delete).toHaveBeenCalledWith({ roomId: 1, userId: 'user1' });
  });

  it('should clear all presence on startup', async () => {
    mockRoomUsers.clear.mockResolvedValue(undefined);

    await service.clearPresence();

    expect(mockRoomUsers.clear).toHaveBeenCalled();
  });
});
