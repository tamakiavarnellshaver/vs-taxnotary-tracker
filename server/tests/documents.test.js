import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../src/db.js';
import { createApp } from '../src/app.js';

describe('document checklist API', () => {
  let app;
  let clientId;

  beforeEach(async () => {
    const db = createDb(':memory:');
    app = createApp(db);
    const client = await request(app).post('/api/clients').send({ name: 'Checklist Client' });
    clientId = client.body.id;
  });

  it('adds a document item to a client checklist', async () => {
    const res = await request(app).post(`/api/clients/${clientId}/documents`).send({ label: 'W-2' });
    expect(res.status).toBe(201);
    expect(res.body.label).toBe('W-2');
    expect(res.body.received).toBe(0);
  });

  it('rejects adding a document item for a nonexistent client', async () => {
    const res = await request(app).post('/api/clients/99999/documents').send({ label: 'W-2' });
    expect(res.status).toBe(404);
  });

  it('marks a document item as received', async () => {
    const created = await request(app).post(`/api/clients/${clientId}/documents`).send({ label: '1099' });
    const res = await request(app).patch(`/api/documents/${created.body.id}`).send({ received: true });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(1);
  });

  it('rejects a non-boolean received value', async () => {
    const created = await request(app).post(`/api/clients/${clientId}/documents`).send({ label: 'ID' });
    const res = await request(app).patch(`/api/documents/${created.body.id}`).send({ received: 'yes' });
    expect(res.status).toBe(400);
  });

  it('lists all document items for a client', async () => {
    await request(app).post(`/api/clients/${clientId}/documents`).send({ label: 'W-2' });
    await request(app).post(`/api/clients/${clientId}/documents`).send({ label: 'Driver License' });

    const res = await request(app).get(`/api/clients/${clientId}/documents`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});
