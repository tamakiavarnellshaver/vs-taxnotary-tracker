import React from 'react';
import { useEffect, useState } from 'react';
import { api } from './api/client';
import ClientList from './components/ClientList';
import ClientForm from './components/ClientForm';
import ClientDetail from './components/ClientDetail';
import './App.css';

function App() {
  const [clients, setClients] = useState([]);
  const [serviceFilter, setServiceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);

  async function refresh() {
    try {
      const params = {};
      if (serviceFilter) params.service_type = serviceFilter;
      if (search) params.q = search;
      const data = await api.listClients(params);
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceFilter, search]);

  return (
    <div className="app">
      <header>
        <h1>VS TaxNotary — Client Tracker</h1>
        <p className="subtitle">Tax prep, notary, virtual notary &amp; loan signing clients in one place</p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <main>
        <section className="panel">
          <ClientForm onCreated={refresh} />
          <ClientList
            clients={clients}
            serviceFilter={serviceFilter}
            onServiceFilterChange={setServiceFilter}
            search={search}
            onSearchChange={setSearch}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </section>

        <section className="panel">
          {selectedId ? (
            <ClientDetail clientId={selectedId} onChanged={refresh} />
          ) : (
            <p className="empty-hint">Select a client to view appointments and document checklist.</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
