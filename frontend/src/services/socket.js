import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  const token = localStorage.getItem('token');
  socket = io('http://localhost:5000', {
    auth: {
      token: token || ''
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const onStudentDataUpdate = (callback) => {
  const sock = getSocket();
  sock.on('student_data_updated', callback);

  // Return unsubscribe function
  return () => {
    sock.off('student_data_updated', callback);
  };
};

const socketService = {
  initSocket,
  getSocket,
  closeSocket,
  onStudentDataUpdate
};

export default socketService;
