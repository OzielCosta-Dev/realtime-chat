import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const http = axios.create({ baseURL: API_URL });

/**
 * A request interceptor runs on EVERY outgoing request before it leaves the
 * browser. Reading the token from localStorage here — rather than passing
 * it manually to every call — means every api/*.js function stays a plain
 * `http.get('/rooms')`, with zero auth boilerplate at each call site. This
 * is the direct consequence of last step's decision: the backend expects
 * `Authorization: Bearer <token>`, so this is the one place that header
 * gets attached.
 */
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * A response interceptor runs on every response, including error ones. A
 * 401 here means the token is missing, invalid, or expired — in every case
 * the right move is the same: drop it and send the user back to login.
 * Centralising that here means no individual page has to check for 401
 * itself.
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default http;
