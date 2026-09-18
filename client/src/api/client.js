const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  listClients: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/clients${qs ? `?${qs}` : ''}`);
  },
  createClient: (payload) => request('/clients', { method: 'POST', body: JSON.stringify(payload) }),
  updateClient: (id, payload) => request(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteClient: (id) => request(`/clients/${id}`, { method: 'DELETE' }),

  listAppointments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/appointments${qs ? `?${qs}` : ''}`);
  },
  createAppointment: (payload) => request('/appointments', { method: 'POST', body: JSON.stringify(payload) }),
  updateAppointmentStatus: (id, status) =>
    request(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  listDocuments: (clientId) => request(`/clients/${clientId}/documents`),
  addDocument: (clientId, label) =>
    request(`/clients/${clientId}/documents`, { method: 'POST', body: JSON.stringify({ label }) }),
  setDocumentReceived: (id, received) =>
    request(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ received }) }),
};
