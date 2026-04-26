import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Socket } from 'socket.io';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient<Socket>();
      const eventName = context.getHandler().name;
      const startTime = Date.now();

      console.log(`[WS] ${eventName} - client: ${client.id}`);

      return next.handle().pipe(
        tap(() => {
          const duration = Date.now() - startTime;
          console.log(`[WS] ${eventName} completed in ${duration}ms`);
        }),
      );
    }

    return next.handle();
  }
}
