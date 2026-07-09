import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const aiHrClient = axios.create({
  baseURL: `${API_BASE}/api/ai-hr`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000, // Free AI models can be slow — allow up to 2 minutes
});

aiHrClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiHrChannel {
  roomId: string;
  name: string;
  categoryId: string;
  adminUserId: string;
  createdAt: string;
  type: 'ai-hr';
}

export interface ConversationMessage {
  id?: string;
  roomId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AiHrChatResponse {
  message: ConversationMessage;
  suggestedQuestions: string[];
  contextStats: {
    tasksLoaded: number;
    channelsLoaded: number;
    overdueCount: number;
    completionRate: number;
    totalHoursTracked: number;
    modelUsed: string;
    tablesQueried: string[];
  };
}

// ── Channels API ──────────────────────────────────────────────────────────────

export async function getAiHrChannels(): Promise<AiHrChannel[]> {
  const { data } = await aiHrClient.get<{ success: boolean; data: AiHrChannel[] }>('/channels');
  return data.data;
}

export async function createAiHrChannel(name: string, categoryId: string = 'root'): Promise<AiHrChannel> {
  const { data } = await aiHrClient.post<{ success: boolean; data: AiHrChannel }>('/channels', { name, categoryId });
  return data.data;
}

export async function deleteAiHrChannel(roomId: string): Promise<void> {
  await aiHrClient.delete(`/channels/${roomId}`);
}

// ── Chat API ──────────────────────────────────────────────────────────────────

export async function getAiHrChatHistory(roomId: string): Promise<ConversationMessage[]> {
  const { data } = await aiHrClient.get<{ success: boolean; data: ConversationMessage[] }>(`/chat/${roomId}`);
  return data.data;
}

export async function sendAiHrMessage(
  roomId: string,
  message: string
): Promise<AiHrChatResponse> {
  const { data } = await aiHrClient.post<{ success: boolean; data: AiHrChatResponse }>('/chat', {
    roomId,
    message,
  });
  return data.data;
}
