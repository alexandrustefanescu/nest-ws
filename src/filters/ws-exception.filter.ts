import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    if (exception instanceof WsException) {
      const error = exception.getError();
      const message = typeof error === 'string' ? error : extractMessage(error);

      console.error(`[WS Error] ${message}`);

      client.emit('error', {
        status: 'error',
        message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Unexpected error';
    console.error(`[WS Error] Unexpected:`, exception instanceof Error ? exception.stack : exception);
    super.catch(exception, host);
  }
}

function extractMessage(error: object): string {
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'WebSocket error';
}
