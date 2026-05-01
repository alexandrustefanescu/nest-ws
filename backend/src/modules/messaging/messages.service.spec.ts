import { EntityManager } from '@mikro-orm/sqlite';
import { Test, type TestingModule } from '@nestjs/testing';

import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let em: jest.Mocked<
    Pick<
      EntityManager,
      | 'getReference'
      | 'create'
      | 'persist'
      | 'flush'
      | 'find'
      | 'findOne'
      | 'nativeDelete'
    >
  >;

  beforeEach(async () => {
    em = {
      getReference: jest.fn(),
      create: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      find: jest.fn(),
      findOne: jest.fn(),
      nativeDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagesService, { provide: EntityManager, useValue: em }],
    }).compile();

    service = module.get(MessagesService);
  });

  it('should save a message', async () => {
    const roomRef = { id: 1 };
    const mockMessage = {
      id: 1,
      room: roomRef,
      userId: 'user1',
      text: 'Hello',
      createdAt: new Date(),
    };
    em.getReference.mockReturnValue(roomRef);
    em.create.mockReturnValue(mockMessage);
    em.persist.mockReturnThis();

    const result = await service.saveMessage(1, 'user1', 'Hello');

    expect(em.create).toHaveBeenCalledWith(expect.anything(), {
      room: roomRef,
      userId: 'user1',
      text: 'Hello',
    });
    expect(em.persist).toHaveBeenCalledWith(mockMessage);
    expect(em.flush).toHaveBeenCalled();
    expect(result).toEqual(mockMessage);
  });

  it('normalizes post text before saving', async () => {
    const roomRef = { id: 1 };
    const mockMessage = {
      id: 1,
      room: roomRef,
      userId: 'user1',
      text: 'Hello 🔥',
      createdAt: new Date(),
    };
    em.getReference.mockReturnValue(roomRef);
    em.create.mockReturnValue(mockMessage);
    em.persist.mockReturnThis();

    const result = await service.saveMessage(1, 'user1', '  Hello 🔥  ');

    expect(em.create).toHaveBeenCalledWith(expect.anything(), {
      room: roomRef,
      userId: 'user1',
      text: 'Hello 🔥',
    });
    expect(result).toEqual(mockMessage);
  });

  it('rejects empty post text before persistence', async () => {
    await expect(service.saveMessage(1, 'user1', '   ')).rejects.toThrow(
      'Post text is required',
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
  });

  describe('getMessageHistory', () => {
    it('returns last 50 messages in ascending order when no cursor given', async () => {
      const roomRef = { id: 1 };
      const msgs = [
        {
          id: 1,
          room: roomRef,
          userId: 'u1',
          text: 'a',
          createdAt: new Date(),
        },
        {
          id: 2,
          room: roomRef,
          userId: 'u1',
          text: 'b',
          createdAt: new Date(),
        },
      ];
      em.getReference.mockReturnValue(roomRef);
      em.find.mockResolvedValue([...msgs].reverse());

      const result = await service.getMessageHistory(1);

      expect(em.find).toHaveBeenCalledWith(
        expect.anything(),
        { room: roomRef },
        { orderBy: { id: 'DESC' }, limit: 50 },
      );
      expect(result).toEqual(msgs);
    });

    it('applies before cursor when provided', async () => {
      const roomRef = { id: 1 };
      em.getReference.mockReturnValue(roomRef);
      em.find.mockResolvedValue([] as never);

      await service.getMessageHistory(1, 10);

      expect(em.find).toHaveBeenCalledWith(
        expect.anything(),
        { room: roomRef, id: { $lt: 10 } },
        expect.objectContaining({ orderBy: { id: 'DESC' } }),
      );
    });
  });

  describe('deleteMessage', () => {
    it('deletes the message when userId matches author', async () => {
      const msg = { id: 5, userId: 'u1', text: 'hi' };
      em.findOne.mockResolvedValue(msg);
      em.nativeDelete.mockResolvedValue(1);

      await service.deleteMessage(5, 'u1');

      expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
        id: 5,
      });
    });

    it('throws WsException when message not found', async () => {
      em.findOne.mockResolvedValue(null);
      await expect(service.deleteMessage(99, 'u1')).rejects.toThrow(
        'Not found',
      );
    });

    it('throws WsException when userId is not the author', async () => {
      const msg = { id: 5, userId: 'author', text: 'hi' };
      em.findOne.mockResolvedValue(msg);
      await expect(service.deleteMessage(5, 'other-user')).rejects.toThrow(
        'Forbidden',
      );
    });
  });

  it('clearRoomMessages deletes only messages for the room', async () => {
    const roomRef = { id: 1 };
    em.getReference.mockReturnValue(roomRef);
    em.nativeDelete.mockResolvedValue(5);

    await service.clearRoomMessages(1);

    expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
      room: roomRef,
    });
  });

  describe('post-oriented API', () => {
    it('creates a room-scoped post', async () => {
      const roomRef = { id: 1 };
      const mockMessage = {
        id: 1,
        room: roomRef,
        userId: 'user1',
        text: 'Hello',
        createdAt: new Date(),
      };
      em.getReference.mockReturnValue(roomRef);
      em.create.mockReturnValue(mockMessage);
      em.persist.mockReturnThis();

      const result = await service.createPost(1, 'user1', 'Hello');

      expect(result).toEqual(mockMessage);
    });

    it('returns a room feed using the existing cursor order', async () => {
      const roomRef = { id: 1 };
      const posts = [
        {
          id: 1,
          room: roomRef,
          userId: 'u1',
          text: 'first',
          createdAt: new Date(),
        },
        {
          id: 2,
          room: roomRef,
          userId: 'u2',
          text: 'second',
          createdAt: new Date(),
        },
      ];
      em.getReference.mockReturnValue(roomRef);
      em.find.mockResolvedValue([...posts].reverse());

      const result = await service.getRoomFeed(1, 20, 25);

      expect(result).toEqual(posts);
    });

    it('deletes a post by author', async () => {
      const post = { id: 5, userId: 'author', text: 'hi' };
      em.findOne.mockResolvedValue(post);
      em.nativeDelete.mockResolvedValue(1);

      await service.deletePost(5, 'author');

      expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
        id: 5,
      });
    });

    it('clears all posts in a room feed', async () => {
      const roomRef = { id: 1 };
      em.getReference.mockReturnValue(roomRef);
      em.nativeDelete.mockResolvedValue(5);

      await service.clearRoomFeed(1);

      expect(em.nativeDelete).toHaveBeenCalledWith(expect.anything(), {
        room: roomRef,
      });
    });
  });
});
