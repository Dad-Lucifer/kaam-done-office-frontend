import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${API_BASE}/api/auth`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ---- Types ----

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MemberLoginPayload {
  username: string;
  password: string;
}

export interface VerifyOTPPayload {
  email: string;
  code: string;
}

export interface ResendOTPPayload {
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  isTeamMember: boolean;
}

// ---- Helpers ----

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors.map((e: any) => e.message).join(', ');
    }
    return (
      data?.message ||
      error.message ||
      'Something went wrong. Please try again.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// ---- API Methods ----

export async function signupUser(payload: SignupPayload): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/signup', payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/login', payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function memberLogin(payload: MemberLoginPayload): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/member-login', payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function verifyOTP(payload: VerifyOTPPayload): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/verify', payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function resendOTP(payload: ResendOTPPayload): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/resend', payload);
    return data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function fetchMe(token: string): Promise<{ success: boolean; data: UserProfile }> {
  try {
    const { data } = await apiClient.get('/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data as { success: boolean; data: UserProfile };
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
