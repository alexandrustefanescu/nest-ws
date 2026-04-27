import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { env } from './env';

export const databaseConfig: DataSourceOptions = {
  type: 'sqlite',
  database: env.databasePath,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  synchronize: true,
  logging: env.isDevelopment,
};
