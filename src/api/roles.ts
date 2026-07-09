import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const rolesClient = axios.create({
  baseURL: `${API_BASE}/api/roles`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach the Cognito accessToken from sessionStorage before every request
rolesClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ---- Types ----

export interface RolePermissions {
  viewChannels: boolean;
  manageChannels: boolean;
  sendMessages: boolean;
  readHistory: boolean;
  connectVoice: boolean;
  speakVoice: boolean;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  icon?: string;
  position?: number;
  isOwner?: boolean;
  permissions: any; // Mapped to the new 3-state map structure
  channelAccess: Record<string, boolean>;
  createdAt?: string;
  updatedAt?: string;
}

export type RolePayload = Omit<Role, 'id' | 'createdAt' | 'updatedAt'>;

// ---- Helpers ----

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      'Something went wrong. Please try again.'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// ---- API Methods ----

/** Fetch all roles for the authenticated admin */
export async function fetchRoles(): Promise<Role[]> {
  try {
    const { data } = await rolesClient.get<{ success: boolean; data: Role[] }>('/');
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/** Create a new role */
export async function createRole(payload: RolePayload): Promise<Role> {
  try {
    const { data } = await rolesClient.post<{ success: boolean; data: Role }>('/', payload);
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/** Update an existing role by ID */
export async function updateRole(roleId: string, payload: RolePayload): Promise<Role> {
  try {
    const { data } = await rolesClient.put<{ success: boolean; data: Role }>(`/${roleId}`, payload);
    return data.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

/** Delete a role by ID */
export async function deleteRole(roleId: string): Promise<void> {
  try {
    await rolesClient.delete(`/${roleId}`);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
