import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { RoomsService } from './rooms.service';

describe('RoomsService', () => {
  let service: RoomsService;
  let em: jest.Mocked<
    Pick<
      EntityManager,
      'find' | 'findOne' | 'create' | 'persist' | 'flush' | 'nativeDelete'
    >
  >;

  beforeEach(async () => {
    em = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      nativeDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsService, { provide: EntityManager, useValue: em }],
    }).compile();

    service = module.get(RoomsService);
  });

  it('should return all rooms', async () => {
    const rooms = [{ id: 1, name: 'general', createdAt: new Date() }];
    em.find.mockResolvedValue(rooms);

    expect(await service.getAllRooms()).toEqual(rooms);
    expect(em.find).toHaveBeenCalledWith(expect.anything(), {});
  });

  it('should return a room by id', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    em.findOne.mockResolvedValue(room);

    expect(await service.getRoomById(1)).toEqual(room);
    expect(em.findOne).toHaveBeenCalledWith(expect.anything(), { id: 1 });
  });

  it('should return null when room not found', async () => {
    em.findOne.mockResolvedValue(null);
    expect(await service.getRoomById(999)).toBeNull();
  });

  it('should create a new room', async () => {
    const room = { id: 1, name: 'new-room', createdAt: new Date() };
    em.create.mockReturnValue(room);
    em.persist.mockReturnThis();

    expect(await service.createRoom('new-room')).toEqual(room);
    expect(em.create).toHaveBeenCalledWith(expect.anything(), {
      name: 'new-room',
    });
    expect(em.persist).toHaveBeenCalledWith(room);
    expect(em.flush).toHaveBeenCalled();
  });

  it('should delete a room', async () => {
    em.nativeDelete.mockResolvedValue(1);

    await service.deleteRoom(1);

    expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), { id: 1 });
  });
});
