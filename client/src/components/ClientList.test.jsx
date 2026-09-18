import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ClientList from './ClientList';

const clients = [
  { id: 1, name: 'Alicia Keys', service_type: 'tax_prep', email: 'alicia@example.com' },
  { id: 2, name: 'Bob Marley', service_type: 'notary', email: null },
];

describe('ClientList', () => {
  it('renders every client passed in', () => {
    render(
      <ClientList
        clients={clients}
        serviceFilter=""
        onServiceFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Alicia Keys')).toBeInTheDocument();
    expect(screen.getByText('Bob Marley')).toBeInTheDocument();
  });

  it('shows an empty hint when there are no clients', () => {
    render(
      <ClientList
        clients={[]}
        serviceFilter=""
        onServiceFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/no clients match yet/i)).toBeInTheDocument();
  });

  it('calls onSelect when a client row is clicked', () => {
    const onSelect = vi.fn();
    render(
      <ClientList
        clients={clients}
        serviceFilter=""
        onServiceFilterChange={vi.fn()}
        search=""
        onSearchChange={vi.fn()}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('Bob Marley'));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('calls onSearchChange as the search box is typed into', () => {
    const onSearchChange = vi.fn();
    render(
      <ClientList
        clients={clients}
        serviceFilter=""
        onServiceFilterChange={vi.fn()}
        search=""
        onSearchChange={onSearchChange}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/search name/i), { target: { value: 'ali' } });
    expect(onSearchChange).toHaveBeenCalledWith('ali');
  });
});
