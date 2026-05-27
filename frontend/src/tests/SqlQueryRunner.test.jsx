import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SqlQueryRunner from '../components/explorer/SqlQueryRunner';

// Mock alasql for in-memory query testing
vi.mock('alasql', () => ({
  default: Object.assign(
    vi.fn((sql) => {
      if (sql.includes('ERROR')) throw new Error('SQL syntax error');
      return [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    }),
    { tables: {} }
  ),
}));

vi.mock('../api/connections', () => ({
  runQuery: vi.fn().mockResolvedValue({
    data: { rows: [{ id: 1 }], fields: ['id'], rowCount: 1 },
  }),
}));

const FILE_SNAPSHOT = {
  id: 'snap-file',
  source_type: 'csv',
  name: 'My CSV',
  snapshot_data: {
    tables: [{
      name: 'orders',
      columns: [{ name: 'id' }, { name: 'name' }],
      sample_rows: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
    }],
  },
};

const LIVE_SNAPSHOT = {
  id: 'snap-live',
  source_type: 'postgres',
  name: 'My DB',
  snapshot_data: { tables: [{ name: 'users', columns: [{ name: 'id' }], sample_rows: [] }] },
};

function makeContextValue(snapshot) {
  return {
    mergedSnapshot: snapshot,
    sessionSnapshots: [snapshot],
    primarySnapshotId: snapshot.id,
  };
}

vi.mock('../context/SnapshotContext', () => ({
  useSnapshot: vi.fn(),
}));

import { useSnapshot } from '../context/SnapshotContext';

beforeEach(() => {
  vi.clearAllMocks();
  useSnapshot.mockReturnValue(makeContextValue(FILE_SNAPSHOT));
});

describe('SqlQueryRunner — file-based snapshot', () => {
  it('renders the editor and run button', () => {
    render(<SqlQueryRunner />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run query/i })).toBeInTheDocument();
  });

  it('shows in-memory mode message', () => {
    render(<SqlQueryRunner />);
    expect(screen.getByText(/in-memory/i)).toBeInTheDocument();
  });

  it('displays table chips for each table', () => {
    render(<SqlQueryRunner />);
    expect(screen.getByText('orders')).toBeInTheDocument();
  });

  it('inserts table name into editor on chip click', () => {
    render(<SqlQueryRunner />);
    fireEvent.click(screen.getByText('orders'));
    expect(screen.getByRole('textbox').value).toContain('orders');
  });

  it('runs in-memory query and displays row count', async () => {
    render(<SqlQueryRunner />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SELECT * FROM orders' } });
    fireEvent.click(screen.getByRole('button', { name: /run query/i }));

    await waitFor(() => {
      expect(screen.getByText(/2 rows/i)).toBeInTheDocument();
    });
  });

  it('shows error when in-memory query throws', async () => {
    render(<SqlQueryRunner />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SELECT ERROR FROM bad' } });
    fireEvent.click(screen.getByRole('button', { name: /run query/i }));

    await waitFor(() => {
      expect(screen.getByText(/SQL syntax error/i)).toBeInTheDocument();
    });
  });

  it('clears editor and results on Clear click', async () => {
    render(<SqlQueryRunner />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SELECT * FROM orders' } });
    fireEvent.click(screen.getByRole('button', { name: /run query/i }));
    await waitFor(() => screen.getByText(/2 rows/i));

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.getByRole('textbox').value).toBe('');
    expect(screen.queryByText(/2 rows/i)).not.toBeInTheDocument();
  });
});

describe('SqlQueryRunner — live DB snapshot', () => {
  beforeEach(() => {
    useSnapshot.mockReturnValue(makeContextValue(LIVE_SNAPSHOT));
  });

  it('shows live mode message', () => {
    render(<SqlQueryRunner />);
    expect(screen.getByText(/Connected to postgres/i)).toBeInTheDocument();
  });

  it('calls runQuery API for live connections', async () => {
    const { runQuery } = await import('../api/connections');
    render(<SqlQueryRunner />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'SELECT * FROM users' } });
    fireEvent.click(screen.getByRole('button', { name: /run query/i }));

    await waitFor(() => {
      expect(runQuery).toHaveBeenCalledWith('SELECT * FROM users', 'snap-live');
    });
  });
});
