import React from 'react';
import { useState } from 'react';
import { api } from '../api/client';

const SERVICE_TYPES = [
  { value: 'tax_prep', label: 'Tax Prep' },
  { value: 'notary', label: 'Notary' },
  { value: 'virtual_notary', label: 'Virtual Notary' },
  { value: 'loan_signing', label: 'Loan Signing' },
];

export default function ClientForm({ onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceType, setServiceType] = useState('tax_prep');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.createClient({ name, email, phone, service_type: serviceType });
      setName('');
      setEmail('');
      setPhone('');
      setServiceType('tax_prep');
      onCreated();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <h2>Add Client</h2>
      {formError && <div className="error-banner">{formError}</div>}
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
        {SERVICE_TYPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add Client'}
      </button>
    </form>
  );
}

export { SERVICE_TYPES };
