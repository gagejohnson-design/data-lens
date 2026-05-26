import client from './api-client';

export const uploadFile = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/api/connect/upload', form);
};

