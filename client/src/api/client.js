import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  google: (credential) => api.post('/auth/google', { credential }),
};

export const artists = {
  search: (query) => api.get('/artists/search', { params: { q: query } }),
};

export const lineups = {
  getAll: () => api.get('/lineups'),
  getOne: (id) => api.get(`/lineups/${id}`),
  create: (data) => api.post('/lineups', data),
  update: (id, data) => api.put(`/lineups/${id}`, data),
  delete: (id) => api.delete(`/lineups/${id}`),
  like: (id) => api.post(`/lineups/${id}/like`),
  getLikes: (id) => api.get(`/lineups/${id}/likes`),
  getComments: (id) => api.get(`/lineups/${id}/comments`),
  addComment: (id, content) => api.post(`/lineups/${id}/comments`, { content }),
  deleteComment: (lineupId, commentId) => api.delete(`/lineups/${lineupId}/comments/${commentId}`),
};

export const stats = {
  leaderboard: (limit = 50, offset = 0) => api.get('/stats/leaderboard', { params: { limit, offset } }),
  artist: (name) => api.get(`/stats/artist/${encodeURIComponent(name)}`),
  browse: (limit = 20, offset = 0, sort = 'recent', tag) => api.get('/stats/browse', { params: { limit, offset, sort, tag } }),
  searchArtists: (q) => api.get('/stats/search-artists', { params: { q } }),
  site: () => api.get('/stats/site'),
  tags: () => api.get('/stats/tags'),
};

export const users = {
  getProfile: (username) => api.get(`/users/${encodeURIComponent(username)}`),
};

export default api;
