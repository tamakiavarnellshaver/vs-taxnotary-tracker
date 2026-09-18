import { Router } from 'express';

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

export function appointmentsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const { status, client_id, from, to } = req.query;
    let sql = 'SELECT * FROM appointments';
    const clauses = [];
    const params = [];

    if (status) {
      clauses.push('status = ?');
      params.push(status);
    }
    if (client_id) {
      clauses.push('client_id = ?');
      params.push(client_id);
    }
    if (from) {
      clauses.push('scheduled_at >= ?');
      params.push(from);
    }
    if (to) {
      clauses.push('scheduled_at <= ?');
      params.push(to);
    }
    if (clauses.length) {
      sql += ' WHERE ' + clauses.join(' AND ');
    }
    sql += ' ORDER BY scheduled_at ASC';

    res.json(db.prepare(sql).all(...params));
  });

  router.post('/', (req, res) => {
    const { client_id, scheduled_at, service_type = 'tax_prep', notes } = req.body || {};

    if (!client_id) return res.status(400).json({ error: 'client_id is required' });
    if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });
    if (Number.isNaN(Date.parse(scheduled_at))) {
      return res.status(400).json({ error: 'scheduled_at must be a valid ISO date string' });
    }

    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
    if (!client) return res.status(404).json({ error: 'client_id does not reference an existing client' });

    const result = db
      .prepare('INSERT INTO appointments (client_id, scheduled_at, service_type, notes) VALUES (?, ?, ?, ?)')
      .run(client_id, scheduled_at, service_type, notes || null);

    res.status(201).json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(result.lastInsertRowid));
  });

  router.patch('/:id/status', (req, res) => {
    const { status } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });

    db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json(db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });
    db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  return router;
}

export { VALID_STATUSES };
