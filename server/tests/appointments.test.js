import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../src/db.js';
import { createApp } from '../src/app.js';

describe('appointments API', () => {
  let app;
  let clientId;

  beforeEach(async () => {
    const db = createDb(':memory:');
    app = createApp(db);
    const client = await request(app).post('/api/clients').send({ name: 'Test Client' });
    clientId = client.body.id;
  });

  it('creates an appointment for an existing client', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ client_id: clientId, scheduled_at: '2026-10-01T14:00:00Z', service_type: 'notary' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('scheduled');
  });

  it('rejects an appointment for a nonexistent client', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ client_id: 99999, scheduled_at: '2026-10-01T14:00:00Z' });
    expect(res.status).toBe(404);
  });

  it('rejects an appointment with an invalid date', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ client_id: clientId, scheduled_at: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('rejects an appointment missing scheduled_at', async () => {
    const res = await request(app).post('/api/appointments').send({ client_id: clientId });
    expect(res.status).toBe(400);
  });

  it('updates appointment status through valid transitions', async () => {
    const created = await request(app)
      .post('/api/appointments')
      .send({ client_id: clientId, scheduled_at: '2026-10-01T14:00:00Z' });

    const res = await request(app).patch(`/api/appointments/${created.body.id}/status`).send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('rejects an invalid status value', async () => {
    const created = await request(app)
      .post('/api/appointments')
      .send({ client_id: clientId, scheduled_at: '2026-10-01T14:00:00Z' });

    const res = await request(app).patch(`/api/appointments/${created.body.id}/status`).send({ status: 'bogus' });
    expect(res.status).toBe(400);
  });

  it('filters appointments by status and date range', async () => {
    const a1 = await request(app)
      .post('/api/appointments')
      .send({ client_id: clientId, scheduled_at: '2026-10-01T14:00:00Z' });
    await request(app)
      .post('/api/appointments')
      .send({ client_id: clientId, scheduled_at: '2026-11-01T14:00:00Z' });
    await request(app).patch(`/api/appointments/${a1.body.id}/status`).send({ status: 'completed' });

    const res = await request(app).get('/api/appointments?status=completed&from=2026-09-01&to=2026-10-31');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(a1.body.id);
  });
});
