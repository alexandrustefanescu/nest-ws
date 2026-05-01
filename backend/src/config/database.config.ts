import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/sqlite';
import { mikroOrmEntities } from './entities';
import { env } from './env';

export const mikroOrmConfig = defineConfig({
  dbName: env.databasePath,
  entities: mikroOrmEntities,
  entitiesTs: mikroOrmEntities,
  extensions: [Migrator],
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './dist/migrations',
    pathTs: './src/migrations',
    transactional: true,
    allOrNothing: true,
    emit: 'ts',
  },
  debug: env.isDevelopment,
  allowGlobalContext: false,
});

export default mikroOrmConfig;
