import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createDb } from '../src/db.js';
import { createApp } from '../src/app.js';

describe('clients API', () => {
  let app;

  beforeEach(() => {
    const db = createDb(':memory:');
    app = createApp(db);
  });

  it('creates a client with valid data', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ name: 'Jane Doe', email: 'jane@example.com', service_type: 'tax_prep' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Jane Doe');
    expect(res.body.id).toBeTypeOf('number');
  });

  it('rejects a client with no name', async () => {
    const res = await request(app).post('/api/clients').send({ email: 'no-name@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('rejects an invalid service_type', async () => {
    const res = await request(app)
      .post('/api/clients')
      .send({ name: 'Bad Type', service_type: 'not_a_real_service' });
    expect(res.status).toBe(400);
  });

  it('lists clients filtered by service_type', async () => {
    await request(app).post('/api/clients').send({ name: 'Notary Client', service_type: 'notary' });
    await request(app).post('/api/clients').send({ name: 'Tax Client', service_type: 'tax_prep' });

    const res = await request(app).get('/api/clients?service_type=notary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Notary Client');
  });

  it('searches clients by name substring', async () => {
    await request(app).post('/api/clients').send({ name: 'Alicia Keys' });
    await request(app).post('/api/clients').send({ name: 'Bob Marley' });

    const res = await request(app).get('/api/clients?q=alic');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alicia Keys');
  });

  it('returns 404 for a client that does not exist', async () => {
    const res = await request(app).get('/api/clients/999');
    expect(res.status).toBe(404);
  });

  it('updates a client', async () => {
    const created = await request(app).post('/api/clients').send({ name: 'Original Name' });
    const res = await request(app).patch(`/api/clients/${created.body.id}`).send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });

  it('deletes a client', async () => {
    const created = await request(app).post('/api/clients').send({ name: 'To Delete' });
    const del = await request(app).delete(`/api/clients/${created.body.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/clients/${created.body.id}`);
    expect(get.status).toBe(404);
  });
});
