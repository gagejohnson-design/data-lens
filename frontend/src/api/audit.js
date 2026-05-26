import client from './api-client';

export const getAuditLog = () =>
  client.get('/api/audit');
