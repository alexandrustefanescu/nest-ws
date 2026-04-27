import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const message = this.toMessage(exception);

    if (message !== null) {
      console.error(`[WS Error] ${message}`);
      client.emit('error', {
        status: 'error',
        message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.error(
      `[WS Error] Unexpected:`,
      exception instanceof Error ? exception.stack : exception,
    );
    super.catch(exception, host);
  }

  private toMessage(exception: unknown): string | null {
    if (exception instanceof WsException) {
      const error = exception.getError();
      return typeof error === 'string' ? error : extractMessage(error);
    }
    if (exception instanceof BadRequestException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (response && typeof response === 'object' && 'message' in response) {
        const msg = (response as { message: unknown }).message;
        if (Array.isArray(msg)) return msg.join('; ');
        if (typeof msg === 'string') return msg;
      }
      return exception.message;
    }
    return null;
  }
}

function extractMessage(error: object): string {
  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'WebSocket error';
}
