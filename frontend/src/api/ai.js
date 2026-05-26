import client from './api-client';

export const queryAi = (question, snapshotId, snapshotIds) =>
  client.post('/api/ai/query', { question, snapshotId, snapshotIds });
