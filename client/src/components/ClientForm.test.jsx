import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientForm from './ClientForm';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: { createClient: vi.fn() },
}));

describe('ClientForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the entered name and service type', async () => {
    api.createClient.mockResolvedValue({ id: 1, name: 'Jane Doe' });
    const onCreated = vi.fn();

    render(<ClientForm onCreated={onCreated} />);

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));

    await waitFor(() => expect(api.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Jane Doe', service_type: 'tax_prep' })
    ));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it('shows an error message when the API call fails', async () => {
    api.createClient.mockRejectedValue(new Error('name is required'));

    render(<ClientForm onCreated={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Client' }));

    expect(await screen.findByText('name is required')).toBeInTheDocument();
  });
});
