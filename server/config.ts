import 'dotenv/config';

const rawDatabaseUrl = (process.env.DATABASE_URL ?? '').trim();

export const CONFIG = {
  port: Number(process.env.PORT) || 3001,
  jwtSecret:
    (process.env.JWT_SECRET ?? '').trim() ||
    'brute-legends-dev-secret-change-in-production',
  databaseUrl: rawDatabaseUrl,
  isPostgres: Boolean(rawDatabaseUrl),
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;
