import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express, { type Application, type NextFunction, type Request, type Response } from 'express';
import { CONFIG } from './config';
import { db, ensureDatabaseReady } from './db/database';
import authRouter from './routes/auth';
import combatRouter from './routes/combat';
import {
  inventoryRouter,
  missionsRouter,
  shopRouter,
  skillsRouter,
  upgradesRouter,
} from './routes/economy';
import leaderboardRouter from './routes/leaderboard';
import playerRouter from './routes/player';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // Ensure DB adapter is initialized before servicing API requests (helpful in tests too)
  app.use('/api', async (_req, _res, next) => {
    try {
      await ensureDatabaseReady();
      next();
    } catch (err) {
      next(err);
    }
  });

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      status: 'ok',
      service: 'brute-legends-api',
      storageMode: db.getStorageMode(),
      timestamp: Date.now(),
    });
  });

  // Domain API routes
  app.use('/api/auth', authRouter);
  app.use('/api/player', playerRouter);
  app.use('/api/combat', combatRouter);
  app.use('/api/leaderboard', leaderboardRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/shop', shopRouter);
  app.use('/api/skills', skillsRouter);
  app.use('/api/upgrades', upgradesRouter);
  app.use('/api/missions', missionsRouter);

  // Unknown API route handler
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API introuvable.' });
  });

  // Serve built Vite SPA in production when dist/index.html is present
  const distDir = path.resolve(__dirname, '../dist');
  const distIndex = path.join(distDir, 'index.html');
  if (fs.existsSync(distIndex)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  // Centralized JSON error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;

    const message =
      err instanceof Error ? err.message : 'Erreur interne du serveur.';

    if (status >= 500) {
      console.error('[Brute Legends API Error]', err);
    }

    res.status(status).json({ error: message });
  });

  return app;
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  ensureDatabaseReady()
    .then(() => {
      const app = createApp();
      app.listen(CONFIG.port, '0.0.0.0', () => {
        console.log(
          `⚔️  Brute Legends API listening on http://0.0.0.0:${CONFIG.port} (storage: ${db.getStorageMode()})`,
        );
      });
    })
    .catch((err) => {
      console.error('Failed to start Brute Legends API:', err);
      process.exit(1);
    });
}
