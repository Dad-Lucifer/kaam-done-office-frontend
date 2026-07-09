import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const taskChannelClient = axios.create({
  baseURL: `${API_BASE}/api/task-channels`,
  headers: { 'Content-Type': 'application/json' },
});

taskChannelClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskChannel {
  roomId: string;
  adminUserId: string;
  name: string;
  description: string;
  createdAt: string;
  categoryId?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch all task channels that belong to the authenticated admin's workspace.
 */
export async function fetchTaskChannels(): Promise<TaskChannel[]> {
  const { data } = await taskChannelClient.get('/');
  return data.data || [];
}

/**
 * Create a new task channel.
 * @param name        Display name of the channel.
 * @param description Optional short description.
 */
export async function createTaskChannel(
  name: string,
  description = '',
  categoryId?: string
): Promise<TaskChannel> {
  const { data } = await taskChannelClient.post('/', { name, description, ...(categoryId && { categoryId }) });
  return data.data;
}

/**
 * Permanently delete a task channel by its roomId.
 */
export async function deleteTaskChannel(roomId: string): Promise<void> {
  await taskChannelClient.delete(`/${roomId}`);
}
