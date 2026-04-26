import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

export const databaseConfig: DataSourceOptions = {
  type: 'sqlite',
  database: process.env.DATABASE_PATH || 'chat.db',
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};
