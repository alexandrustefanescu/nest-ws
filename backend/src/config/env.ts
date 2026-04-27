const num = (raw: string | undefined, fallback: number): number => {
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

export const env = {
  port: num(process.env.PORT, 3000),
  databasePath: process.env.DATABASE_PATH ?? 'chat.db',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
