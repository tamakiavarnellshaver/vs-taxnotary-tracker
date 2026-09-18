import { Router } from 'express';

const VALID_SERVICE_TYPES = ['tax_prep', 'notary', 'virtual_notary', 'loan_signing'];

export function clientsRouter(db) {
  const router = Router();

  router.get('/', (req, res) => {
    const { service_type, q } = req.query;
    let sql = 'SELECT * FROM clients';
    const clauses = [];
    const params = [];

    if (service_type) {
      clauses.push('service_type = ?');
      params.push(service_type);
    }
    if (q) {
      clauses.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (clauses.length) {
      sql += ' WHERE ' + clauses.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  });

  router.get('/:id', (req, res) => {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  });

  router.post('/', (req, res) => {
    const { name, email, phone, service_type = 'tax_prep', notes } = req.body || {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!VALID_SERVICE_TYPES.includes(service_type)) {
      return res.status(400).json({ error: `service_type must be one of: ${VALID_SERVICE_TYPES.join(', ')}` });
    }

    const result = db
      .prepare('INSERT INTO clients (name, email, phone, service_type, notes) VALUES (?, ?, ?, ?, ?)')
      .run(name.trim(), email || null, phone || null, service_type, notes || null);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(client);
  });

  router.patch('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });

    const { name, email, phone, service_type, notes } = req.body || {};
    if (service_type && !VALID_SERVICE_TYPES.includes(service_type)) {
      return res.status(400).json({ error: `service_type must be one of: ${VALID_SERVICE_TYPES.join(', ')}` });
    }

    db.prepare(
      'UPDATE clients SET name = ?, email = ?, phone = ?, service_type = ?, notes = ? WHERE id = ?'
    ).run(
      name ?? existing.name,
      email ?? existing.email,
      phone ?? existing.phone,
      service_type ?? existing.service_type,
      notes ?? existing.notes,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  router.delete('/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Client not found' });
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  return router;
}

export { VALID_SERVICE_TYPES };
