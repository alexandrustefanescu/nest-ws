import { defineConfig } from '@mikro-orm/sqlite';
import { env } from './env';

export const mikroOrmConfig = defineConfig({
  dbName: env.databasePath,
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  debug: env.isDevelopment,
});
