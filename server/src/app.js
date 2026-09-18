import express from 'express';
import cors from 'cors';
import { clientsRouter } from './routes/clients.js';
import { appointmentsRouter } from './routes/appointments.js';
import { documentsRouter } from './routes/documents.js';

export function createApp(db) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/clients', clientsRouter(db));
  app.use('/api/appointments', appointmentsRouter(db));
  app.use('/api', documentsRouter(db));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
