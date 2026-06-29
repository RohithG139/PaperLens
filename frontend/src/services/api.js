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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const searchPapers = (query, maxResults = 10) =>
  api.post('/papers/search', { query, max_results: maxResults });

export const getPaperDetails = (paperId) =>
  api.get(`/papers/${paperId}`);

export const runAgentWorkflow = (query, userId, question = null) =>
  api.post('/agents/run', { query, userId, question });

export const getPaperSummary = (paperId) =>
  api.get(`/papers/${paperId}/summary`);

export const comparePapers = (paperIds) =>
  api.post('/agents/compare', { paper_ids: paperIds });

export const getAgentExecution = (executionId) =>
  api.get(`/agents/execution/${executionId}`);

export const getUserHistory = (userId) =>
  api.get(`/users/${userId}/history`);

export const getUserSavedPapers = (userId) =>
  api.get(`/users/${userId}/saved-papers`);

export const savePaper = (userId, paperId) =>
  api.post(`/users/${userId}/save-paper`, { paperId });

export const removeSavedPaper = (userId, paperId) =>
  api.delete(`/users/${userId}/saved-papers/${paperId}`);

export const getTrendingTopics = () =>
  api.get('/papers/trending');

export const getCurrentUser = () =>
  api.get('/auth/me');

export const getUserStats = (userId) =>
  api.get(`/users/${userId}/stats`);

export const deleteHistoryItem = (userId, entryId) =>
  api.delete(`/users/${userId}/history/${entryId}`);

export const indexPapers = (paperIds) =>
  api.post('/papers/index', { paper_ids: paperIds });

export default api;
