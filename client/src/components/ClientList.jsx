import React from 'react';
import { SERVICE_TYPES } from './ClientForm';

export default function ClientList({
  clients,
  serviceFilter,
  onServiceFilterChange,
  search,
  onSearchChange,
  selectedId,
  onSelect,
}) {
  return (
    <div className="client-list">
      <h2>Clients</h2>
      <div className="filters">
        <input
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select value={serviceFilter} onChange={(e) => onServiceFilterChange(e.target.value)}>
          <option value="">All services</option>
          {SERVICE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {clients.length === 0 ? (
        <p className="empty-hint">No clients match yet.</p>
      ) : (
        <ul>
          {clients.map((c) => (
            <li
              key={c.id}
              className={c.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(c.id)}
            >
              <strong>{c.name}</strong>
              <span className="tag">{c.service_type.replace('_', ' ')}</span>
              {c.email && <div className="muted">{c.email}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
