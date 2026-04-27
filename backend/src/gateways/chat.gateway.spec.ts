import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../services/chat.service';
import { RoomService } from '../services/room.service';
import { MessagesService } from '../modules/messaging/messages.service';
import { ReactionsService } from '../modules/messaging/reactions.service';
import { PresenceService } from '../modules/presence/presence.service';
import { WsThrottlerGuard } from '../guards/ws-throttler.guard';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

const mockTo = { emit: jest.fn() };

const mockServer = {
  to: jest.fn().mockReturnValue(mockTo),
  emit: jest.fn(),
} as unknown as Server;

const mockSocket = {
  id: 'socket-1',
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  data: {},
} as unknown as Socket;

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockChatService: {
    markUserTyping: jest.Mock;
    removeUserTyping: jest.Mock;
    clearRoomData: jest.Mock;
  };
  let mockPresenceService: {
    getUsersInRoom: jest.Mock;
    addUserToRoom: jest.Mock;
    removeUserFromRoom: jest.Mock;
    clearPresence: jest.Mock;
  };
  let mockReactionsService: {
    toggleReaction: jest.Mock;
    getReactionsForRoom: jest.Mock;
  };
  let mockMessagesService: {
    saveMessage: jest.Mock;
    getMessageHistory: jest.Mock;
    deleteMessage: jest.Mock;
    clearRoomMessages: jest.Mock;
  };
  let mockRoomService: {
    getAllRooms: jest.Mock;
    getRoomById: jest.Mock;
    deleteRoom: jest.Mock;
  };
  let mockWsThrottlerGuard: { canActivate: jest.Mock; evict: jest.Mock };

  beforeEach(async () => {
    mockWsThrottlerGuard = { canActivate: jest.fn().mockReturnValue(true), evict: jest.fn() };

    mockChatService = {
      markUserTyping: jest.fn(),
      removeUserTyping: jest.fn(),
      clearRoomData: jest.fn(),
    };

    mockPresenceService = {
      getUsersInRoom: jest.fn().mockResolvedValue([]),
      addUserToRoom: jest.fn(),
      removeUserFromRoom: jest.fn(),
      clearPresence: jest.fn(),
    };

    mockReactionsService = {
      toggleReaction: jest.fn(),
      getReactionsForRoom: jest.fn().mockResolvedValue({}),
    };

    mockMessagesService = {
      saveMessage: jest.fn(),
      getMessageHistory: jest.fn().mockResolvedValue([]),
      deleteMessage: jest.fn(),
      clearRoomMessages: jest.fn(),
    };

    mockRoomService = {
      getAllRooms: jest.fn().mockResolvedValue([]),
      getRoomById: jest.fn(),
      deleteRoom: jest.fn(),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: mockChatService },
        { provide: RoomService, useValue: mockRoomService },
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: ReactionsService, useValue: mockReactionsService },
        { provide: PresenceService, useValue: mockPresenceService },
        { provide: WsThrottlerGuard, useValue: mockWsThrottlerGuard },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    gateway.server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should emit rooms list on connection', async () => {
    const rooms = [{ id: 1, name: 'general', createdAt: new Date() }];
    mockRoomService.getAllRooms.mockResolvedValue(rooms);

    await gateway.handleConnection(mockSocket);

    expect(mockSocket.emit).toHaveBeenCalledWith('rooms:list', rooms);
  });

  it('should throw WsException when joining non-existent room', async () => {
    mockRoomService.getRoomById.mockResolvedValue(null);

    await expect(
      gateway.handleJoinRoom(mockSocket, { roomId: 99, userId: 'user1' }),
    ).rejects.toThrow(WsException);
  });

  it('should add user to room and broadcast on join', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockPresenceService.addUserToRoom.mockResolvedValue({ id: 1, roomId: 1, userId: 'user1' });
    mockPresenceService.getUsersInRoom.mockResolvedValue([{ userId: 'user1' }]);

    await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockSocket.join).toHaveBeenCalledWith('room-1');
    expect(mockServer.to).toHaveBeenCalledWith('room-1');
  });

  it('should save message and broadcast on send', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    const message = { id: 1, roomId: 1, userId: 'user1', text: 'Hello', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockMessagesService.saveMessage.mockResolvedValue(message);

    await gateway.handleSendMessage(mockSocket, { roomId: 1, userId: 'user1', text: 'Hello' });

    expect(mockMessagesService.saveMessage).toHaveBeenCalledWith(1, 'user1', 'Hello');
    expect(mockServer.to).toHaveBeenCalledWith('room-1');
  });

  it('should mark typing and notify others', async () => {
    mockChatService.markUserTyping.mockResolvedValue({});

    await gateway.handleTypingStart(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockChatService.markUserTyping).toHaveBeenCalledWith(1, 'user1');
    expect(mockSocket.to).toHaveBeenCalledWith('room-1');
  });

  it('should remove typing status on typing stop', async () => {
    mockChatService.removeUserTyping.mockResolvedValue(undefined);

    await gateway.handleTypingStop(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockChatService.removeUserTyping).toHaveBeenCalledWith(1, 'user1');
  });

  it('should remove user from room on leave', async () => {
    mockPresenceService.removeUserFromRoom.mockResolvedValue(undefined);
    mockPresenceService.getUsersInRoom.mockResolvedValue([]);

    await gateway.handleLeaveRoom(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockSocket.leave).toHaveBeenCalledWith('room-1');
    expect(mockPresenceService.removeUserFromRoom).toHaveBeenCalledWith(1, 'user1');
  });

  it('should remove a disconnected socket from every joined room', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockPresenceService.addUserToRoom.mockResolvedValue({});
    mockPresenceService.getUsersInRoom.mockResolvedValue([]);

    await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'user1' });
    await gateway.handleJoinRoom(mockSocket, { roomId: 2, userId: 'user1' });

    jest.clearAllMocks();
    await gateway.handleDisconnect(mockSocket);

    expect(mockPresenceService.removeUserFromRoom).toHaveBeenCalledWith(1, 'user1');
    expect(mockPresenceService.removeUserFromRoom).toHaveBeenCalledWith(2, 'user1');
    expect(mockPresenceService.removeUserFromRoom).toHaveBeenCalledTimes(2);
  });

  it('should keep a user online until their last socket leaves a room', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    const secondSocket = { ...mockSocket, id: 'socket-2' } as Socket;
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockPresenceService.addUserToRoom.mockResolvedValue({});
    mockPresenceService.getUsersInRoom.mockResolvedValue([]);

    await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'user1' });
    await gateway.handleJoinRoom(secondSocket, { roomId: 1, userId: 'user1' });

    jest.clearAllMocks();
    await gateway.handleDisconnect(mockSocket);

    expect(mockPresenceService.removeUserFromRoom).not.toHaveBeenCalled();

    await gateway.handleDisconnect(secondSocket);

    expect(mockPresenceService.removeUserFromRoom).toHaveBeenCalledWith(1, 'user1');
    expect(mockPresenceService.removeUserFromRoom).toHaveBeenCalledTimes(1);
  });

  it('should throw WsException when deleting non-existent room', async () => {
    mockRoomService.getRoomById.mockResolvedValue(null);

    await expect(
      gateway.handleDeleteRoom(mockSocket, { roomId: 99 }),
    ).rejects.toThrow(WsException);
  });

  it('should delete room, clear data and broadcast rooms list', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockChatService.clearRoomData.mockResolvedValue(undefined);
    mockRoomService.deleteRoom.mockResolvedValue(undefined);
    mockRoomService.getAllRooms.mockResolvedValue([]);

    await gateway.handleDeleteRoom(mockSocket, { roomId: 1 });

    expect(mockChatService.clearRoomData).toHaveBeenCalledWith(1);
    expect(mockRoomService.deleteRoom).toHaveBeenCalledWith(1);
    expect(mockServer.emit).toHaveBeenCalledWith('rooms:list', []);
  });

  it('should emit reactions:snapshot on room join', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockPresenceService.addUserToRoom.mockResolvedValue({});
    mockPresenceService.getUsersInRoom.mockResolvedValue([]);
    mockReactionsService.getReactionsForRoom.mockResolvedValue({ 1: { '👍': ['u1'] } });

    await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'user1' });

    expect(mockSocket.emit).toHaveBeenCalledWith('reactions:snapshot', { 1: { '👍': ['u1'] } });
  });

  it('should toggle reaction and broadcast reaction:updated', async () => {
    mockReactionsService.toggleReaction.mockResolvedValue({ '👍': ['u1'] });

    await gateway.handleToggleReaction(mockSocket, {
      roomId: 1,
      messageId: 42,
      userId: 'u1',
      emoji: '👍',
    });

    expect(mockReactionsService.toggleReaction).toHaveBeenCalledWith(42, 'u1', '👍');
    expect(mockServer.to).toHaveBeenCalledWith('room-1');
    expect(mockTo.emit).toHaveBeenCalledWith('reaction:updated', {
      messageId: 42,
      reactions: { '👍': ['u1'] },
    });
  });

  it('emits messages:history to joining socket on room:join', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    const history = [{ id: 1, roomId: 1, userId: 'u1', text: 'hi', createdAt: new Date() }];
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockPresenceService.addUserToRoom.mockResolvedValue({});
    mockPresenceService.getUsersInRoom.mockResolvedValue([]);
    mockReactionsService.getReactionsForRoom.mockResolvedValue({});
    mockMessagesService.getMessageHistory.mockResolvedValue(history);

    await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'u1' });

    expect(mockMessagesService.getMessageHistory).toHaveBeenCalledWith(1);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'messages:history',
      { roomId: 1, messages: history, hasMore: false },
    );
  });

  it('hasMore is true when history returns exactly 50 messages', async () => {
    const room = { id: 1, name: 'general', createdAt: new Date() };
    const history = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1, roomId: 1, userId: 'u1', text: `msg${i}`, createdAt: new Date(),
    }));
    mockRoomService.getRoomById.mockResolvedValue(room);
    mockPresenceService.addUserToRoom.mockResolvedValue({});
    mockPresenceService.getUsersInRoom.mockResolvedValue([]);
    mockReactionsService.getReactionsForRoom.mockResolvedValue({});
    mockMessagesService.getMessageHistory.mockResolvedValue(history);

    await gateway.handleJoinRoom(mockSocket, { roomId: 1, userId: 'u1' });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'messages:history',
      expect.objectContaining({ hasMore: true }),
    );
  });

  it('handleLoadMore returns paginated messages via ack', async () => {
    const history = [{ id: 5, roomId: 1, userId: 'u1', text: 'old', createdAt: new Date() }];
    mockMessagesService.getMessageHistory.mockResolvedValue(history);

    const result = await gateway.handleLoadMore({ roomId: 1, before: 10 });

    expect(mockMessagesService.getMessageHistory).toHaveBeenCalledWith(1, 10);
    expect(result).toEqual({ messages: history, hasMore: false });
  });

  it('handleDeleteMessage broadcasts message:deleted to room', async () => {
    mockMessagesService.deleteMessage.mockResolvedValue(undefined);

    await gateway.handleDeleteMessage(mockSocket, { roomId: 1, messageId: 42, userId: 'u1' });

    expect(mockMessagesService.deleteMessage).toHaveBeenCalledWith(42, 'u1');
    expect(mockServer.to).toHaveBeenCalledWith('room-1');
    expect(mockTo.emit).toHaveBeenCalledWith('message:deleted', { roomId: 1, messageId: 42 });
  });

  it('handleClearChat broadcasts chat:cleared to room', async () => {
    mockMessagesService.clearRoomMessages.mockResolvedValue(undefined);

    await gateway.handleClearChat(mockSocket, { roomId: 1, userId: 'u1' });

    expect(mockMessagesService.clearRoomMessages).toHaveBeenCalledWith(1);
    expect(mockServer.to).toHaveBeenCalledWith('room-1');
    expect(mockTo.emit).toHaveBeenCalledWith('chat:cleared', { roomId: 1 });
  });
});
