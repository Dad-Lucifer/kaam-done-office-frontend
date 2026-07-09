import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const membersClient = axios.create({
  baseURL: `${API_BASE}/api/members`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach Cognito accessToken from sessionStorage before every request
membersClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ---- Types ----

export interface TeamMember {
  id: string;
  username: string;
  email: string | null;
  roleId: string | null;
  roleName: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMemberPayload {
  username: string;
  email?: string;
  password?: string;
  roleId?: string | null;
  roleName?: string | null;
}

export interface UpdateMemberPayload {
  username?: string;
  email?: string | null;
  roleId?: string | null;
  roleName?: string | null;
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

/** Fetch all team members for the authenticated admin */
export async function fetchMembers(): Promise<TeamMember[]> {
  try {
    const { data } = await membersClient.get<{ success: boolean; data: TeamMember[] }>('/');
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/** Create a new team member */
export async function createMember(payload: CreateMemberPayload): Promise<TeamMember> {
  try {
    const { data } = await membersClient.post<{ success: boolean; data: TeamMember }>('/', payload);
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/** Update a member's role or info */
export async function updateMember(memberId: string, payload: UpdateMemberPayload): Promise<TeamMember> {
  try {
    const { data } = await membersClient.patch<{ success: boolean; data: TeamMember }>(`/${memberId}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/** Remove a team member */
export async function deleteMember(memberId: string): Promise<void> {
  try {
    await membersClient.delete(`/${memberId}`);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
