const request = require('supertest');

jest.mock('../src/db', () => ({
  query: jest.fn(),
}));
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.userId = 'user-123'; next(); },
}));

const app = require('../src/app');
const pool = require('../src/db');

const MOCK_QUERY = {
  id: 'qid-1',
  question: 'Show top customers',
  sql: 'SELECT * FROM customers ORDER BY revenue DESC LIMIT 10',
  snapshot_ids: [],
  created_at: '2025-01-01T00:00:00Z',
};

beforeEach(() => jest.clearAllMocks());

describe('GET /api/saved-queries', () => {
  it('returns saved queries for the authenticated user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [MOCK_QUERY] });

    const res = await request(app).get('/api/saved-queries');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].question).toBe('Show top customers');
  });

  it('returns empty array when no queries exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/saved-queries');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /api/saved-queries', () => {
  it('creates a new saved query and returns 201', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })             // DELETE dedup
      .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // COUNT check
      .mockResolvedValueOnce({ rows: [MOCK_QUERY] });   // INSERT

    const res = await request(app)
      .post('/api/saved-queries')
      .send({ question: 'Show top customers', sql: 'SELECT * FROM customers', snapshotIds: [] });

    expect(res.status).toBe(201);
    expect(res.body.question).toBe('Show top customers');
  });

  it('returns 400 when question is missing', async () => {
    const res = await request(app)
      .post('/api/saved-queries')
      .send({ sql: 'SELECT 1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/question/);
  });

  it('returns 400 when sql is missing', async () => {
    const res = await request(app)
      .post('/api/saved-queries')
      .send({ question: 'something' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sql/);
  });

  it('evicts oldest entry when limit is reached', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })               // DELETE dedup
      .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // COUNT = at limit
      .mockResolvedValueOnce({ rows: [] })               // DELETE oldest
      .mockResolvedValueOnce({ rows: [MOCK_QUERY] });    // INSERT

    const res = await request(app)
      .post('/api/saved-queries')
      .send({ question: 'New query', sql: 'SELECT 1' });

    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(4);
  });
});

describe('DELETE /api/saved-queries/:id', () => {
  it('deletes an existing query and returns 200', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'qid-1' }] });

    const res = await request(app).delete('/api/saved-queries/qid-1');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted');
  });

  it('returns 404 when query does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/saved-queries/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('DELETE /api/saved-queries (clear all)', () => {
  it('clears all queries for the user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/saved-queries');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All queries cleared');
  });
});
