import client from './api-client';

export const getSavedQueries = () =>
  client.get('/api/saved-queries');

export const saveQuery = (question, sql, snapshotIds = []) =>
  client.post('/api/saved-queries', { question, sql, snapshotIds });

export const deleteQuery = (id) =>
  client.delete(`/api/saved-queries/${id}`);

export const clearAllQueries = () =>
  client.delete('/api/saved-queries');
