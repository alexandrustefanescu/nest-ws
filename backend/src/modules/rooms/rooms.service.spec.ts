import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { Room } from './room.entity';

describe('RoomsService', () => {
  let service: RoomsService;
  let mockRooms: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockRooms = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        { provide: getRepositoryToken(Room), useValue: mockRooms },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should return all rooms', async () => {
    const rooms = [{ id: 1, name: 'general', createdAt: new Date() }];
    mockRooms.find.mockResolvedValue(rooms);

    expect(await service.getAllRooms()).toEqual(rooms);
    expect(mockRooms.find).toHaveBeenCalled();
  });

  it('should return a room by id', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    mockRooms.findOne.mockResolvedValue(room);

    expect(await service.getRoomById(1)).toEqual(room);
    expect(mockRooms.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should return null when room not found', async () => {
    mockRooms.findOne.mockResolvedValue(null);
    expect(await service.getRoomById(999)).toBeNull();
  });

  it('should create a new room', async () => {
    const room = { id: 1, name: 'new-room', createdAt: new Date() };
    mockRooms.create.mockReturnValue(room);
    mockRooms.save.mockResolvedValue(room);

    expect(await service.createRoom('new-room')).toEqual(room);
    expect(mockRooms.create).toHaveBeenCalledWith({ name: 'new-room' });
  });

  it('should delete a room', async () => {
    mockRooms.delete.mockResolvedValue({ affected: 1 });

    await service.deleteRoom(1);

    expect(mockRooms.delete).toHaveBeenCalledWith({ id: 1 });
  });
});
