import http from './http.js';

export function listRooms() {
  return http.get('/rooms').then((res) => res.data);
}

export function getRoom(roomId) {
  return http.get(`/rooms/${roomId}`).then((res) => res.data);
}

export function createRoom({ name, description }) {
  return http.post('/rooms', { name, description: description || undefined }).then((res) => res.data);
}

export function joinRoom(roomId) {
  return http.post(`/rooms/${roomId}/join`).then((res) => res.data);
}
