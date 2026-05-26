import client from './api-client';

export const listSnapshots = () =>
  client.get('/api/snapshots');

export const getSnapshot = (id) =>
  client.get(`/api/snapshots/${id}`);

export const saveSnapshot = (data) =>
  client.post('/api/snapshots', data);

export const renameSnapshot = (id, name, description) =>
  client.put(`/api/snapshots/${id}`, { name, description });

export const deleteSnapshot = (id) =>
  client.delete(`/api/snapshots/${id}`);

export const exportSnapshot = (id) =>
  client.get(`/api/snapshots/${id}/export`);

export const updateSnapshotData = (id, snapshot_data) =>
  client.patch(`/api/snapshots/${id}/data`, { snapshot_data });

export const diffSnapshots = (id, otherId) =>
  client.get(`/api/snapshots/${id}/diff/${otherId}`);

export const shareSnapshot = (id) =>
  client.post(`/api/snapshots/${id}/share`);

export const revokeShare = (id) =>
  client.delete(`/api/snapshots/${id}/share`);
