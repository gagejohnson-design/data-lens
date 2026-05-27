import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AiQuery from '../components/explorer/AiQuery';

// Mock context
vi.mock('../context/SnapshotContext', () => ({
  useSnapshot: () => ({
    mergedSnapshot: {
      id: 'snap-1',
      name: 'Test Snapshot',
      snapshot_data: { tables: [{ name: 'orders', columns: [] }] },
    },
    sessionSnapshots: [{ id: 'snap-1' }],
  }),
}));

// Mock API modules
vi.mock('../api/ai', () => ({
  queryAi: vi.fn().mockResolvedValue({
    data: { sql: 'SELECT * FROM orders', question: 'Show me all orders' },
  }),
}));

vi.mock('../api/queries', () => ({
  getSavedQueries: vi.fn().mockResolvedValue({ data: [] }),
  saveQuery: vi.fn().mockResolvedValue({
    data: { id: 'q1', question: 'Show me all orders', sql: 'SELECT * FROM orders', created_at: new Date().toISOString() },
  }),
  deleteQuery: vi.fn().mockResolvedValue({}),
  clearAllQueries: vi.fn().mockResolvedValue({}),
}));

// Silence clipboard API warnings in jsdom
beforeEach(() => {
  Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
});

describe('AiQuery component', () => {
  it('renders the question input and submit button', () => {
    render(<AiQuery />);
    expect(screen.getByPlaceholderText(/Show me customers/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate sql/i })).toBeInTheDocument();
  });

  it('disables submit button when input is empty', () => {
    render(<AiQuery />);
    expect(screen.getByRole('button', { name: /generate sql/i })).toBeDisabled();
  });

  it('enables submit when question is typed', () => {
    render(<AiQuery />);
    const input = screen.getByPlaceholderText(/Show me customers/i);
    fireEvent.change(input, { target: { value: 'Show me all orders' } });
    expect(screen.getByRole('button', { name: /generate sql/i })).not.toBeDisabled();
  });

  it('shows generated SQL after submit', async () => {
    render(<AiQuery />);
    const input = screen.getByPlaceholderText(/Show me customers/i);
    fireEvent.change(input, { target: { value: 'Show me all orders' } });
    fireEvent.click(screen.getByRole('button', { name: /generate sql/i }));

    await waitFor(() => {
      expect(screen.getByText(/SELECT \* FROM orders/i)).toBeInTheDocument();
    });
  });

  it('fills input when example query is clicked', () => {
    render(<AiQuery />);
    const example = screen.getByText(/Show me the top 10 customers/i);
    fireEvent.click(example);
    const input = screen.getByPlaceholderText(/Show me customers/i);
    expect(input.value).toContain('top 10 customers');
  });

  it('shows error message on API failure', async () => {
    const { queryAi } = await import('../api/ai');
    queryAi.mockRejectedValueOnce({ response: { data: { error: 'AI quota exceeded' } } });

    render(<AiQuery />);
    fireEvent.change(screen.getByPlaceholderText(/Show me customers/i), { target: { value: 'something' } });
    fireEvent.click(screen.getByRole('button', { name: /generate sql/i }));

    await waitFor(() => {
      expect(screen.getByText(/AI quota exceeded/i)).toBeInTheDocument();
    });
  });

  it('shows history panel with entries when history button clicked', async () => {
    const { getSavedQueries } = await import('../api/queries');
    getSavedQueries.mockResolvedValueOnce({
      data: [{ id: 'q1', question: 'Old query', sql: 'SELECT 1', created_at: new Date().toISOString() }],
    });

    render(<AiQuery />);

    await waitFor(() => {
      expect(screen.getByText(/History \(1\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/History \(1\)/i));
    expect(screen.getByText('Old query')).toBeInTheDocument();
  });
});
