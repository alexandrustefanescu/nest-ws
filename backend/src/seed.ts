import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RoomService } from './services/room.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const roomService = app.get(RoomService);

  try {
    const existingRooms = await roomService.getAllRooms();

    if (existingRooms.length === 0) {
      console.log('Seeding initial rooms...');
      await roomService.createRoom('general');
      await roomService.createRoom('random');
      await roomService.createRoom('dev');
      console.log('Seed complete!');
    } else {
      console.log('Rooms already exist, skipping seed');
    }
  } catch (error) {
    console.error('Seed failed:', error);
  }

  await app.close();
}

seed();
