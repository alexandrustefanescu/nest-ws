import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/sqlite';

import { mikroOrmConfig } from './config/database.config';
import { Room } from './modules/rooms/room.entity';

const DEFAULT_ROOM_NAMES = ['general', 'random', 'dev'] as const;

export async function seedInitialRooms(em: EntityManager): Promise<Room[]> {
  const rooms: Room[] = [];

  for (const name of DEFAULT_ROOM_NAMES) {
    const existingRoom = await em.findOne(Room, { name });

    if (existingRoom) {
      rooms.push(existingRoom);
      continue;
    }

    const room = em.create(Room, { name });
    rooms.push(room);
  }

  await em.flush();
  return rooms;
}

async function main(): Promise<void> {
  const orm = await MikroORM.init(mikroOrmConfig);

  try {
    await seedInitialRooms(orm.em.fork());
    console.log('Seeded default rooms: general, random, dev');
  } finally {
    await orm.close(true);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
