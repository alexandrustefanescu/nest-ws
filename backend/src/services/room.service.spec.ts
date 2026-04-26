import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoomService } from './room.service';
import { Room } from '../entities/room.entity';

describe('RoomService', () => {
  let service: RoomService;
  let mockRoomRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockRoomRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: getRepositoryToken(Room), useValue: mockRoomRepository },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it('should return all rooms', async () => {
    const mockRooms = [
      { id: 1, name: 'general', createdAt: new Date() },
      { id: 2, name: 'random', createdAt: new Date() },
    ];
    mockRoomRepository.find.mockResolvedValue(mockRooms);

    const result = await service.getAllRooms();

    expect(result).toEqual(mockRooms);
    expect(mockRoomRepository.find).toHaveBeenCalled();
  });

  it('should return a room by id', async () => {
    const mockRoom = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomRepository.findOne.mockResolvedValue(mockRoom);

    const result = await service.getRoomById(1);

    expect(result).toEqual(mockRoom);
    expect(mockRoomRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('should return null when room not found', async () => {
    mockRoomRepository.findOne.mockResolvedValue(null);

    const result = await service.getRoomById(999);

    expect(result).toBeNull();
  });

  it('should create a new room', async () => {
    const mockRoom = { id: 1, name: 'new-room', createdAt: new Date() };
    mockRoomRepository.create.mockReturnValue(mockRoom);
    mockRoomRepository.save.mockResolvedValue(mockRoom);

    const result = await service.createRoom('new-room');

    expect(result).toEqual(mockRoom);
    expect(mockRoomRepository.create).toHaveBeenCalledWith({ name: 'new-room' });
    expect(mockRoomRepository.save).toHaveBeenCalledWith(mockRoom);
  });

  it('should delete a room', async () => {
    mockRoomRepository.delete.mockResolvedValue({ affected: 1 });

    await service.deleteRoom(1);

    expect(mockRoomRepository.delete).toHaveBeenCalledWith({ id: 1 });
  });
});
