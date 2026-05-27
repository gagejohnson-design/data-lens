const request = require('supertest');

jest.mock('../src/db', () => ({ query: jest.fn() }));
jest.mock('../src/middleware/auth', () => ({
  requireAuth: (req, _res, next) => { req.userId = 'user-123'; next(); },
}));
jest.mock('../src/middleware/rateLimiter', () => ({
  authLimiter: (_req, _res, next) => next(),
  aiLimiter: (_req, _res, next) => next(),
  uploadLimiter: (_req, _res, next) => next(),
}));
// Shared mock so we can override the response per-test without relying on instances[]
const mockAiCreate = jest.fn().mockResolvedValue({
  content: [{ text: 'SELECT * FROM orders LIMIT 10' }],
});

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockAiCreate },
  }));
});

const app = require('../src/app');
const pool = require('../src/db');

const MOCK_SNAPSHOT = {
  snapshot_data: {
    tables: [{ name: 'orders', columns: [{ name: 'id', type: 'integer', nullable: false }], row_count: 100 }],
    relationships: [],
  },
};

beforeEach(() => jest.clearAllMocks());

describe('POST /api/ai/query', () => {
  it('returns generated SQL for a valid question', async () => {
    pool.query.mockResolvedValueOnce({ rows: [MOCK_SNAPSHOT] });

    const res = await request(app)
      .post('/api/ai/query')
      .send({ question: 'Show me all orders', snapshotId: 'snap-1' });

    expect(res.status).toBe(200);
    expect(res.body.sql).toContain('SELECT');
    expect(res.body.question).toBe('Show me all orders');
  });

  it('returns 400 when question is missing', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .send({ snapshotId: 'snap-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/question/i);
  });

  it('returns 400 when question exceeds 500 characters', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .send({ question: 'x'.repeat(501), snapshotId: 'snap-1' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when no snapshotId is provided', async () => {
    const res = await request(app)
      .post('/api/ai/query')
      .send({ question: 'Show me orders' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/snapshotId/i);
  });

  it('returns 404 when snapshot does not belong to user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/ai/query')
      .send({ question: 'Show all', snapshotId: 'snap-999' });

    expect(res.status).toBe(404);
  });

  it('strips markdown fences from AI response', async () => {
    mockAiCreate.mockResolvedValueOnce({
      content: [{ text: '```sql\nSELECT 1\n```' }],
    });
    pool.query.mockResolvedValueOnce({ rows: [MOCK_SNAPSHOT] });

    const res = await request(app)
      .post('/api/ai/query')
      .send({ question: 'test', snapshotId: 'snap-1' });

    expect(res.status).toBe(200);
    expect(res.body.sql).not.toContain('```');
    expect(res.body.sql).toBe('SELECT 1');
  });
});
