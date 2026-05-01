import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let em: jest.Mocked<
    Pick<
      EntityManager,
      | 'getReference'
      | 'find'
      | 'findOne'
      | 'create'
      | 'persist'
      | 'flush'
      | 'nativeDelete'
    >
  >;

  beforeEach(async () => {
    em = {
      getReference: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      nativeDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PresenceService, { provide: EntityManager, useValue: em }],
    }).compile();

    service = module.get(PresenceService);
  });

  it('should get users in a room', async () => {
    const roomRef = { id: 1 };
    const users = [
      { id: 1, room: roomRef, userId: 'user1', joinedAt: new Date() },
    ];
    em.getReference.mockReturnValue(roomRef);
    em.find.mockResolvedValue(users);

    expect(await service.getUsersInRoom(1)).toEqual(users);
    expect(em.find).toHaveBeenCalledWith(expect.anything(), { room: roomRef });
  });

  it('should add user to room when not already present', async () => {
    const roomRef = { id: 1 };
    const roomUser = {
      id: 1,
      room: roomRef,
      userId: 'user1',
      joinedAt: new Date(),
    };
    em.getReference.mockReturnValue(roomRef);
    em.findOne.mockResolvedValue(null);
    em.create.mockReturnValue(roomUser);
    em.persist.mockReturnThis();

    expect(await service.addUserToRoom(1, 'user1')).toEqual(roomUser);
    expect(em.create).toHaveBeenCalledWith(expect.anything(), {
      room: roomRef,
      userId: 'user1',
    });
    expect(em.persist).toHaveBeenCalledWith(roomUser);
    expect(em.flush).toHaveBeenCalled();
  });

  it('should not create a duplicate when called twice for the same user', async () => {
    const roomRef = { id: 1 };
    const existing = {
      id: 1,
      room: roomRef,
      userId: 'user1',
      joinedAt: new Date(),
    };
    em.getReference.mockReturnValue(roomRef);
    em.findOne.mockResolvedValue(existing);

    expect(await service.addUserToRoom(1, 'user1')).toEqual(existing);
    expect(await service.addUserToRoom(1, 'user1')).toEqual(existing);
    expect(em.create).not.toHaveBeenCalled();
  });

  it('should remove user from room', async () => {
    const roomRef = { id: 1 };
    em.getReference.mockReturnValue(roomRef);
    em.nativeDelete.mockResolvedValue(1);

    await service.removeUserFromRoom(1, 'user1');

    expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
      room: roomRef,
      userId: 'user1',
    });
  });

  it('should clear all presence on startup', async () => {
    em.nativeDelete.mockResolvedValue(0);

    await service.clearPresence();

    expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {});
  });
});
