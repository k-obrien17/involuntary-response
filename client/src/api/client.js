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
  create: (note) => api.post('/admin/invites', { note }),
  list: () => api.get('/admin/invites'),
  revoke: (id) => api.delete(`/admin/invites/${id}`),
};

export const users = {
  listContributors: () => api.get('/admin/contributors'),
  deactivate: (id) => api.put(`/admin/contributors/${id}/deactivate`),
  activate: (id) => api.put(`/admin/contributors/${id}/activate`),
  promote: (id) => api.put(`/admin/contributors/${id}/promote`),
};

export default api;
