import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth';

import authRoutes from './modules/auth/routes';
import creatorsRoutes from './modules/creators/routes';
import dealsRoutes from './modules/deals/routes';
import contentRoutes from './modules/content/routes';
import invoicesRoutes from './modules/invoices/routes';
import vaultRoutes from './modules/vault/routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/debug/auth', requireAuth, (req, res) => {
    res.json({ authenticated: true, user: (req as any).user });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/creators', requireAuth, creatorsRoutes);
  app.use('/api/deals', requireAuth, dealsRoutes);
  app.use('/api/content', requireAuth, contentRoutes);
  app.use('/api/invoices', requireAuth, invoicesRoutes);
  app.use('/api/vault', requireAuth, vaultRoutes);

  return app;
}
