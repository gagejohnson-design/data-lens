import client from './api-client';

export const register = (name, email, password) =>
  client.post('/api/auth/register', { name, email, password });

export const login = (email, password) =>
  client.post('/api/auth/login', { email, password });

export const logout = () =>
  client.post('/api/auth/logout');

export const refresh = () =>
  client.post('/api/auth/refresh');
