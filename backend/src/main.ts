import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

  await app.register(helmet);
  await app.register(fastifyCsrf);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
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
  await fastify.register(ScalarApiReference, {
    routePrefix: '/docs',
    configuration: {
      content: document,
      title: 'nest-ws API Reference',
    },
  });

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API docs available at: ${await app.getUrl()}/docs`);
}
bootstrap();
