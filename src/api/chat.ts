import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${API_BASE}/api/chat`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface ChatMessage {
  roomId: string;
  timestamp: string;
  messageId: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
}

export async function fetchRoomHistory(roomId: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get(`/rooms/${roomId}/messages`);
  // Sort by timestamp ascending
  const items = data.data || [];
  return items.sort((a: ChatMessage, b: ChatMessage) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
