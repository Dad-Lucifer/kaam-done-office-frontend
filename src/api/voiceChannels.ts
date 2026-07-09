import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const voiceChannelClient = axios.create({
  baseURL: `${API_BASE}/api/voice/channels`,
  headers: { 'Content-Type': 'application/json' },
});

voiceChannelClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceChannel {
  roomId: string;
  adminUserId: string;
  name: string;
  description: string;
  createdAt: string;
  categoryId?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch all voice channels that belong to the authenticated admin's workspace.
 */
export async function fetchVoiceChannels(): Promise<VoiceChannel[]> {
  const { data } = await voiceChannelClient.get('/');
  return data.data || [];
}

/**
 * Create a new voice channel.
 * @param name        Display name of the channel.
 * @param description Optional short description.
 */
export async function createVoiceChannel(
  name: string,
  description = '',
  categoryId?: string
): Promise<VoiceChannel> {
  const { data } = await voiceChannelClient.post('/', { name, description, ...(categoryId && { categoryId }) });
  return data.data;
}

/**
 * Permanently delete a voice channel by its roomId.
 */
export async function deleteVoiceChannel(roomId: string): Promise<void> {
  await voiceChannelClient.delete(`/${roomId}`);
}
