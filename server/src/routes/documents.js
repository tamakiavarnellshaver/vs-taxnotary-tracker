import { Router } from 'express';

export function documentsRouter(db) {
  const router = Router();

  router.get('/clients/:clientId/documents', (req, res) => {
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json(
      db.prepare('SELECT * FROM document_items WHERE client_id = ? ORDER BY created_at ASC').all(req.params.clientId)
    );
  });

  router.post('/clients/:clientId/documents', (req, res) => {
    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.clientId);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { label } = req.body || {};
    if (!label || !label.trim()) return res.status(400).json({ error: 'label is required' });

    const result = db
      .prepare('INSERT INTO document_items (client_id, label) VALUES (?, ?)')
      .run(req.params.clientId, label.trim());

    res.status(201).json(db.prepare('SELECT * FROM document_items WHERE id = ?').get(result.lastInsertRowid));
  });

  router.patch('/documents/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM document_items WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Document item not found' });

    const { received } = req.body || {};
    if (typeof received !== 'boolean') return res.status(400).json({ error: 'received must be a boolean' });

    db.prepare('UPDATE document_items SET received = ? WHERE id = ?').run(received ? 1 : 0, req.params.id);
    res.json(db.prepare('SELECT * FROM document_items WHERE id = ?').get(req.params.id));
  });

  router.delete('/documents/:id', (req, res) => {
    const existing = db.prepare('SELECT * FROM document_items WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Document item not found' });
    db.prepare('DELETE FROM document_items WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });

  return router;
}
