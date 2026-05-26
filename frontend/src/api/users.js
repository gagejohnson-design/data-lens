import client from './api-client';

export const getMe = () =>
  client.get('/api/users/me');

export const updateMe = (data) =>
  client.put('/api/users/me', data);

export const updatePassword = (currentPassword, newPassword) =>
  client.put('/api/users/me/password', { currentPassword, newPassword });

export const deleteAccount = () =>
  client.delete('/api/users/me');

export const getAiKeyStatus = () =>
  client.get('/api/users/me/ai-key');

export const saveAiKey = (key) =>
  client.put('/api/users/me/ai-key', { key });
