import client from './api-client';

export const uploadFiles = (files) => {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  return client.post('/api/connect/upload', form);
};

// Legacy single-file alias
export const uploadFile = (file) => uploadFiles([file]);
