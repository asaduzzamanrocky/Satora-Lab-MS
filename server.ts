import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { authRouter } from './server/routes/auth.js';
import { projectsRouter } from './server/routes/projects.js';
import { employeesRouter } from './server/routes/employees.js';
import { clientsRouter } from './server/routes/clients.js';
import { transactionsRouter } from './server/routes/transactions.js';
import { tasksRouter } from './server/routes/tasks.js';
import { reportsRouter } from './server/routes/reports.js';
import { settingsRouter } from './server/routes/settings.js';
import { migrationRouter } from './server/routes/migration.js';
import { paymentOptionsRouter } from './server/routes/payment-options.js';
import { chatRouter } from './server/routes/chat.js';
import { vaultRouter } from './server/routes/vault.js';
import { investmentsRouter } from './server/routes/investments.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/employees', employeesRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/migrate', migrationRouter);
  app.use('/api/payment-options', paymentOptionsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/vault', vaultRouter);
  app.use('/api/investments', investmentsRouter);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Satora Lab Enterprise Office & Project Manager',
      timezone: 'Asia/Dhaka',
      currency: 'BDT (৳)',
      time: new Date().toISOString(),
    });
  });

  // Frontend integration
  const distPath = path.resolve(__dirname, 'dist');
  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Satora Lab] Platform operational at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Satora Lab] Startup error:', err);
  process.exit(1);
});
