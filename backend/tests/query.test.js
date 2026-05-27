const request = require('supertest');

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.userId = 'user-123'; next(); },
}));
jest.mock('../src/middleware/rateLimiter', () => ({
  authLimiter: (_req, _res, next) => next(),
  uploadLimiter: (_req, _res, next) => next(),
  aiLimiter: (_req, _res, next) => next(),
}));

// Mock the pg Pool used inside query.js for live execution
jest.mock('pg', () => {
  const mockQuery = jest.fn().mockResolvedValue({
    rows: [{ id: 1, name: 'Alice' }],
    fields: [{ name: 'id' }, { name: 'name' }],
  });
  const MockPool = jest.fn().mockImplementation(() => ({
    query: mockQuery,
    end: jest.fn().mockResolvedValue(undefined),
  }));
  return { Pool: MockPool };
});

jest.mock('../src/routers/connect', () => ({
  router: require('express').Router(),
  decryptConnectionString: jest.fn(() => 'postgresql://user:pass@localhost:5432/db'),
}));

const app = require('../src/app');
const pool = require('../src/db');

beforeEach(() => jest.clearAllMocks());

describe('POST /api/query/run', () => {
  it('returns 400 when sql is missing', async () => {
    const res = await request(app)
      .post('/api/query/run')
      .send({ snapshotId: 'snap-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sql/i);
  });

  it('returns 400 when snapshotId is missing', async () => {
    const res = await request(app)
      .post('/api/query/run')
      .send({ sql: 'SELECT 1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/snapshotId/i);
  });

  it('returns 404 when snapshot not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/query/run')
      .send({ sql: 'SELECT 1', snapshotId: 'missing' });

    expect(res.status).toBe(404);
  });

  it('returns 400 with fileBased flag for file-based snapshots', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ source_type: 'csv', connection_string_enc: null, connection_iv: null }],
    });

    const res = await request(app)
      .post('/api/query/run')
      .send({ sql: 'SELECT 1', snapshotId: 'snap-1' });

    expect(res.status).toBe(400);
    expect(res.body.fileBased).toBe(true);
  });

  it('runs query against live postgres snapshot', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ source_type: 'postgres', connection_string_enc: 'enc', connection_iv: 'iv' }],
    });

    const res = await request(app)
      .post('/api/query/run')
      .send({ sql: 'SELECT id, name FROM users', snapshotId: 'snap-1' });

    expect(res.status).toBe(200);
    expect(res.body.rows).toBeDefined();
    expect(res.body.rowCount).toBeGreaterThanOrEqual(0);
  });
});
