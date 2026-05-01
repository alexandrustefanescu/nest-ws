import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { Message } from './message.entity';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockMessages: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    mockMessages = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getRepositoryToken(Message), useValue: mockMessages },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  it('should save a message', async () => {
    const mockMessage = { id: 1, roomId: 1, userId: 'user1', text: 'Hello', createdAt: new Date() };
    mockMessages.create.mockReturnValue(mockMessage);
    mockMessages.save.mockResolvedValue(mockMessage);

    const result = await service.saveMessage(1, 'user1', 'Hello');

    expect(result).toEqual(mockMessage);
    expect(mockMessages.create).toHaveBeenCalledWith({ roomId: 1, userId: 'user1', text: 'Hello' });
    expect(mockMessages.save).toHaveBeenCalledWith(mockMessage);
  });

  it('normalizes post text before saving', async () => {
    const mockMessage = { id: 1, roomId: 1, userId: 'user1', text: 'Hello 🔥', createdAt: new Date() };
    mockMessages.create.mockReturnValue(mockMessage);
    mockMessages.save.mockResolvedValue(mockMessage);

    const result = await service.saveMessage(1, 'user1', '  Hello 🔥  ');

    expect(result).toEqual(mockMessage);
    expect(mockMessages.create).toHaveBeenCalledWith({ roomId: 1, userId: 'user1', text: 'Hello 🔥' });
  });

  it('rejects empty post text before persistence', async () => {
    await expect(service.saveMessage(1, 'user1', '   ')).rejects.toThrow('Post text is required');

    expect(mockMessages.create).not.toHaveBeenCalled();
    expect(mockMessages.save).not.toHaveBeenCalled();
  });

  describe('getMessageHistory', () => {
    it('returns last 50 messages in ascending order when no cursor given', async () => {
      const msgs = [
        { id: 1, roomId: 1, userId: 'u1', text: 'a', createdAt: new Date() },
        { id: 2, roomId: 1, userId: 'u1', text: 'b', createdAt: new Date() },
      ];
      mockMessages.find.mockResolvedValue([...msgs].reverse());

      const result = await service.getMessageHistory(1);

      expect(mockMessages.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { roomId: 1 }, order: { id: 'DESC' }, take: 50 }),
      );
      expect(result).toEqual(msgs);
    });

    it('applies before cursor when provided', async () => {
      mockMessages.find.mockResolvedValue([]);

      await service.getMessageHistory(1, 10);

      expect(mockMessages.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ roomId: 1 }), order: { id: 'DESC' }, take: 50 }),
      );
    });
  });

  describe('deleteMessage', () => {
    it('deletes the message when userId matches author', async () => {
      const msg = { id: 5, roomId: 1, userId: 'u1', text: 'hi', createdAt: new Date() };
      mockMessages.findOne.mockResolvedValue(msg);
      mockMessages.delete.mockResolvedValue({ affected: 1 });

      await service.deleteMessage(5, 'u1');

      expect(mockMessages.delete).toHaveBeenCalledWith({ id: 5 });
    });

    it('throws WsException when message not found', async () => {
      mockMessages.findOne.mockResolvedValue(null);

      await expect(service.deleteMessage(99, 'u1')).rejects.toThrow('Not found');
    });

    it('throws WsException when userId is not the author', async () => {
      const msg = { id: 5, roomId: 1, userId: 'author', text: 'hi', createdAt: new Date() };
      mockMessages.findOne.mockResolvedValue(msg);

      await expect(service.deleteMessage(5, 'other-user')).rejects.toThrow('Forbidden');
    });
  });

  it('clearRoomMessages deletes only messages for the room', async () => {
    mockMessages.delete.mockResolvedValue({ affected: 5 });

    await service.clearRoomMessages(1);

    expect(mockMessages.delete).toHaveBeenCalledWith({ roomId: 1 });
  });

  describe('post-oriented API', () => {
    it('creates a room-scoped post', async () => {
      const mockMessage = { id: 1, roomId: 1, userId: 'user1', text: 'Hello', createdAt: new Date() };
      mockMessages.create.mockReturnValue(mockMessage);
      mockMessages.save.mockResolvedValue(mockMessage);

      const result = await service.createPost(1, 'user1', 'Hello');

      expect(result).toEqual(mockMessage);
      expect(mockMessages.create).toHaveBeenCalledWith({ roomId: 1, userId: 'user1', text: 'Hello' });
    });

    it('returns a room feed using the existing cursor order', async () => {
      const posts = [
        { id: 1, roomId: 1, userId: 'u1', text: 'first', createdAt: new Date() },
        { id: 2, roomId: 1, userId: 'u2', text: 'second', createdAt: new Date() },
      ];
      mockMessages.find.mockResolvedValue([...posts].reverse());

      const result = await service.getRoomFeed(1, 20, 25);

      expect(result).toEqual(posts);
      expect(mockMessages.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ roomId: 1 }), order: { id: 'DESC' }, take: 25 }),
      );
    });

    it('deletes a post by author', async () => {
      const post = { id: 5, roomId: 1, userId: 'author', text: 'hi', createdAt: new Date() };
      mockMessages.findOne.mockResolvedValue(post);
      mockMessages.delete.mockResolvedValue({ affected: 1 });

      await service.deletePost(5, 'author');

      expect(mockMessages.delete).toHaveBeenCalledWith({ id: 5 });
    });

    it('clears all posts in a room feed', async () => {
      mockMessages.delete.mockResolvedValue({ affected: 5 });

      await service.clearRoomFeed(1);

      expect(mockMessages.delete).toHaveBeenCalledWith({ roomId: 1 });
    });
  });
});
