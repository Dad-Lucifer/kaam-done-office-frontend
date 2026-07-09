import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const voiceClient = axios.create({
  baseURL: `${API_BASE}/api/voice`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

export interface VoiceTokenResponse {
  success: boolean;
  token: string;
  url: string;
  identity: string;
}

/**
 * Request a LiveKit JWT for the given room.
 * Reads the access token from sessionStorage (set by the auth flow).
 */
export async function fetchVoiceToken(
  roomName: string,
  username?: string
): Promise<VoiceTokenResponse> {
  const accessToken = sessionStorage.getItem('accessToken') || '';

  const { data } = await voiceClient.post<VoiceTokenResponse>(
    '/token',
    { roomName, username },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!data.success) {
    throw new Error('Server failed to generate voice token.');
  }

  return data;
}
