import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, displayName, token) =>
    api.post('/auth/register', { email, password, displayName, token }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
};

export const invites = {
  create: (note) => api.post('/invites', { note }),
  list: () => api.get('/invites'),
  revoke: (id) => api.patch(`/invites/${id}/revoke`),
};

export const users = {
  listContributors: () => api.get('/users/admin/contributors'),
  deactivate: (id) => api.patch(`/users/admin/${id}/deactivate`),
  activate: (id) => api.patch(`/users/admin/${id}/activate`),
  promote: (id) => api.patch(`/users/admin/${id}/promote`),
};

export const embeds = {
  resolve: (url) => api.post('/embeds/resolve', { url }),
};

export const posts = {
  list: (params) => api.get('/posts', { params }),
  create: (data) => api.post('/posts', data),
  getBySlug: (slug) => api.get(`/posts/${slug}`),
  update: (slug, data) => api.put(`/posts/${slug}`, data),
  delete: (slug) => api.delete(`/posts/${slug}`),
};

export const browse = {
  byTag: (tag, params) =>
    api.get(`/browse/tag/${encodeURIComponent(tag)}`, { params }),
  byArtist: (name, params) =>
    api.get(`/browse/artist/${encodeURIComponent(name)}`, { params }),
  byContributor: (username, params) =>
    api.get(`/browse/contributor/${encodeURIComponent(username)}`, { params }),
  explore: () => api.get('/browse/explore'),
};

export const search = {
  query: (q, params) => api.get('/search', { params: { q, ...params } }),
};

export const profile = {
  get: (username) =>
    api.get(`/users/${encodeURIComponent(username)}/profile`),
  updateBio: (bio) => api.put('/users/me', { bio }),
};

export default api;
