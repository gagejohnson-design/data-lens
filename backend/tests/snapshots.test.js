const request = require('supertest');

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.userId = 'user-123'; next(); },
}));

const app = require('../src/app');
const pool = require('../src/db');

const MOCK_SNAPSHOT = {
  id: 'snap-1',
  user_id: 'user-123',
  name: 'Test Dataset',
  description: null,
  source_type: 'csv',
  hash: 'abc123',
  snapshot_data: { tables: [{ name: 'orders', columns: [], row_count: 100 }], relationships: [] },
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/snapshots', () => {
  it('returns list of snapshots', async () => {
    pool.query.mockResolvedValueOnce({ rows: [MOCK_SNAPSHOT] });

    const res = await request(app).get('/api/snapshots');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Test Dataset');
  });
});

describe('GET /api/snapshots/:id', () => {
  it('returns a specific snapshot and logs audit', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [MOCK_SNAPSHOT] })
      .mockResolvedValueOnce({ rows: [] }); // audit insert

    const res = await request(app).get('/api/snapshots/snap-1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('snap-1');
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  it('returns 404 when snapshot not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/snapshots/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('POST /api/snapshots', () => {
  it('creates snapshot and returns 201', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // count check
      .mockResolvedValueOnce({ rows: [MOCK_SNAPSHOT] })   // INSERT
      .mockResolvedValueOnce({ rows: [] });               // audit

    const res = await request(app)
      .post('/api/snapshots')
      .send({
        name: 'Test Dataset',
        source_type: 'csv',
        snapshot_data: { tables: [], relationships: [] },
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Dataset');
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/snapshots')
      .send({ name: 'only name' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('returns 409 when snapshot limit is reached', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '10' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'old-1', name: 'Old Snap' }] });

    const res = await request(app)
      .post('/api/snapshots')
      .send({ name: 'New', source_type: 'csv', snapshot_data: { tables: [] } });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/limit/i);
    expect(res.body.oldest).toBeDefined();
  });
});

describe('DELETE /api/snapshots/:id', () => {
  it('deletes snapshot and returns success message', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'snap-1' }] })
      .mockResolvedValueOnce({ rows: [] }); // audit

    const res = await request(app).delete('/api/snapshots/snap-1');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Snapshot deleted');
  });

  it('returns 404 for non-existent snapshot', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/snapshots/missing');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/snapshots/:id/diff/:otherId', () => {
  const snapA = { ...MOCK_SNAPSHOT, id: 'a', snapshot_data: { tables: [{ name: 'orders', columns: [{ name: 'id', null_percent: 0 }], row_count: 100 }], relationships: [] } };
  const snapB = { ...MOCK_SNAPSHOT, id: 'b', snapshot_data: { tables: [{ name: 'orders', columns: [{ name: 'id', null_percent: 0 }, { name: 'status', null_percent: 5 }], row_count: 120 }, { name: 'customers', columns: [], row_count: 50 }], relationships: [] } };

  it('returns a structured diff between two snapshots', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [snapA] })
      .mockResolvedValueOnce({ rows: [snapB] });

    const res = await request(app).get('/api/snapshots/a/diff/b');

    expect(res.status).toBe(200);
    expect(res.body.diff).toBeDefined();
    const orders = res.body.diff.find(d => d.table === 'orders');
    expect(orders.status).toBe('changed');
    const customers = res.body.diff.find(d => d.table === 'customers');
    expect(customers.status).toBe('added');
  });
});
