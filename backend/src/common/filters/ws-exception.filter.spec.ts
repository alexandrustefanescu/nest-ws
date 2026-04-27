import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsExceptionFilter } from './ws-exception.filter';

const makeHost = (emit: jest.Mock): ArgumentsHost =>
  ({
    switchToWs: () => ({ getClient: () => ({ emit }) }),
  }) as unknown as ArgumentsHost;

describe('WsExceptionFilter', () => {
  let filter: WsExceptionFilter;
  let emit: jest.Mock;

  beforeEach(() => {
    filter = new WsExceptionFilter();
    emit = jest.fn();
  });

  it('emits error event for WsException with string message', () => {
    filter.catch(new WsException('Room not found'), makeHost(emit));
    expect(emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ status: 'error', message: 'Room not found' }),
    );
  });

  it('flattens BadRequestException validation array into a single message', () => {
    const exc = new BadRequestException({
      statusCode: 400,
      message: ['roomId must be a positive number', 'userId should not be empty'],
      error: 'Bad Request',
    });
    filter.catch(exc, makeHost(emit));
    expect(emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({
        status: 'error',
        message: 'roomId must be a positive number; userId should not be empty',
      }),
    );
  });

  it('uses BadRequestException string message when no array is present', () => {
    filter.catch(new BadRequestException('plain message'), makeHost(emit));
    expect(emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({ message: 'plain message' }),
    );
  });
});
