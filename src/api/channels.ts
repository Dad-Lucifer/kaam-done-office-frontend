import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${API_BASE}/api/channels`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface TextChannel {
  roomId: string;
  adminUserId: string;
  name: string;
  description: string;
  createdAt: string;
  categoryId?: string;
}

export async function fetchChannels(): Promise<TextChannel[]> {
  const { data } = await apiClient.get('/');
  return data.data || [];
}

export async function createChannel(
  name: string,
  description: string,
  categoryId?: string
): Promise<TextChannel> {
  const { data } = await apiClient.post('/', { name, description, ...(categoryId && { categoryId }) });
  return data.data;
}

export async function deleteChannel(roomId: string): Promise<void> {
  await apiClient.delete(`/${roomId}`);
}
