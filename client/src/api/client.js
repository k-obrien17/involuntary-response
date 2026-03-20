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

// 401 response interceptor — clears auth state on expired/invalid tokens
const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/register-reader', '/auth/google'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) => requestUrl.includes(ep));
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, displayName, token) =>
    api.post('/auth/register', { email, password, displayName, token }),
  registerReader: (email, password, displayName) =>
    api.post('/auth/register-reader', { email, password, displayName }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
  me: () => api.get('/auth/me'),
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
  like: (slug) => api.post(`/posts/${slug}/like`),
  addComment: (slug, body) => api.post(`/posts/${slug}/comments`, { body }),
  deleteComment: (slug, commentId) => api.delete(`/posts/${slug}/comments/${commentId}`),
  listMine: () => api.get('/posts/mine'),
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

export const analytics = {
  myStats: (sort) => api.get('/analytics/me', { params: { sort } }),
  myArtists: () => api.get('/analytics/me/artists'),
  myActivity: () => api.get('/analytics/me/activity'),
};

export const profile = {
  get: (username) =>
    api.get(`/users/${encodeURIComponent(username)}/profile`),
  updateBio: (bio) => api.put('/users/me', { bio }),
};

export default api;
