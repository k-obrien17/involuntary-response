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

export default api;
