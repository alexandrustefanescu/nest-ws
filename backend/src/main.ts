import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { env } from './config/env';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import ScalarApiReference from '@scalar/fastify-api-reference';
import helmet from '@fastify/helmet';
import fastifyCsrf from '@fastify/csrf-protection';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { cors: false }
  );

  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );

  await app.register(helmet);
  await app.register(fastifyCsrf);

  app.enableCors({
    origin: env.corsOrigin,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('nest-ws Chat API')
    .setDescription('REST and WebSocket API for real-time chat rooms')
    .setVersion('1.0')
    .addTag('health', 'Service health checks')
    .addTag('websocket-events', 'Socket.IO events — connect via ws://localhost:3000')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const fastify = app.getHttpAdapter().getInstance();

  // Relax CSP only for the /docs route — Scalar requires unsafe-inline to bootstrap.
  // All other routes keep helmet's strict default policy.
  fastify.addHook('onSend', async (request, reply) => {
    if (request.url.startsWith('/docs')) {
      reply.header(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; worker-src blob:;",
      );
    }
  });

  await fastify.register(ScalarApiReference, {
    routePrefix: '/docs',
    configuration: {
      content: document,
      title: 'nest-ws API Reference',
    },
  });

  await app.listen(env.port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API docs available at: ${await app.getUrl()}/docs`);
}
bootstrap();
