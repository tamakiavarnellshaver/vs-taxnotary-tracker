import React from 'react';
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

export default function ClientDetail({ clientId, onChanged }) {
  const [appointments, setAppointments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [newAppointmentAt, setNewAppointmentAt] = useState('');
  const [newDocLabel, setNewDocLabel] = useState('');
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [appts, docs] = await Promise.all([
        api.listAppointments({ client_id: clientId }),
        api.listDocuments(clientId),
      ]);
      setAppointments(appts);
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function addAppointment(e) {
    e.preventDefault();
    if (!newAppointmentAt) return;
    try {
      await api.createAppointment({ client_id: clientId, scheduled_at: new Date(newAppointmentAt).toISOString() });
      setNewAppointmentAt('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.updateAppointmentStatus(id, status);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addDocument(e) {
    e.preventDefault();
    if (!newDocLabel.trim()) return;
    try {
      await api.addDocument(clientId, newDocLabel.trim());
      setNewDocLabel('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleDocument(doc) {
    try {
      await api.setDocumentReceived(doc.id, !doc.received);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="client-detail">
      {error && <div className="error-banner">{error}</div>}

      <h2>Appointments</h2>
      <form className="inline-form" onSubmit={addAppointment}>
        <input
          type="datetime-local"
          value={newAppointmentAt}
          onChange={(e) => setNewAppointmentAt(e.target.value)}
          required
        />
        <button type="submit">Schedule</button>
      </form>
      {appointments.length === 0 ? (
        <p className="empty-hint">No appointments yet.</p>
      ) : (
        <ul className="appointment-list">
          {appointments.map((a) => (
            <li key={a.id}>
              <span>{new Date(a.scheduled_at).toLocaleString()}</span>
              <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      <h2>Document Checklist</h2>
      <form className="inline-form" onSubmit={addDocument}>
        <input placeholder="e.g. W-2, Driver License" value={newDocLabel} onChange={(e) => setNewDocLabel(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      {documents.length === 0 ? (
        <p className="empty-hint">No checklist items yet.</p>
      ) : (
        <ul className="document-list">
          {documents.map((d) => (
            <li key={d.id}>
              <label>
                <input type="checkbox" checked={!!d.received} onChange={() => toggleDocument(d)} />
                {d.label}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
