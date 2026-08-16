import http from './http.js';

export function register({ name, email, password }) {
  return http.post('/users', { name, email, password }).then((res) => res.data);
}

export function login({ email, password }) {
  return http.post('/sessions', { email, password }).then((res) => res.data);
}

export function fetchCurrentUser() {
  return http.get('/users/me').then((res) => res.data);
}
