import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const permissionsClient = axios.create({
  baseURL: `${API_BASE}/api/permissions`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

permissionsClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type PermissionState = 'ALLOW' | 'DENY' | 'INHERIT';

export type PermissionKey =
  | 'VIEW_WORKSPACE' | 'EDIT_WORKSPACE' | 'DELETE_WORKSPACE' | 'MANAGE_WORKSPACE'
  | 'VIEW_MEMBERS' | 'INVITE_MEMBERS' | 'EDIT_MEMBERS' | 'REMOVE_MEMBERS' | 'MANAGE_ROLES'
  | 'VIEW_CATEGORY' | 'CREATE_CATEGORY' | 'EDIT_CATEGORY' | 'DELETE_CATEGORY'
  | 'VIEW_TEXT_CHANNEL' | 'CREATE_TEXT_CHANNEL' | 'EDIT_TEXT_CHANNEL' | 'DELETE_TEXT_CHANNEL'
  | 'READ_MESSAGES' | 'SEND_MESSAGES' | 'DELETE_MESSAGES' | 'PIN_MESSAGES' | 'MANAGE_MESSAGES'
  | 'VIEW_VOICE_CHANNEL' | 'CREATE_VOICE_CHANNEL' | 'EDIT_VOICE_CHANNEL' | 'DELETE_VOICE_CHANNEL'
  | 'JOIN_VOICE' | 'MUTE_MEMBERS' | 'DEAFEN_MEMBERS' | 'MOVE_MEMBERS' | 'KICK_MEMBERS'
  | 'ADMINISTRATOR'
  // Task Manager
  | 'CREATE_TASK' | 'EDIT_TASK' | 'DELETE_TASK' | 'ASSIGN_TASK'
  | 'MANAGE_TASKS' | 'COMMENT_TASK' | 'TRACK_TIME' | 'VIEW_PRIVATE_TASKS'
  // AI-HR
  | 'USE_AI_HR' | 'VIEW_AI_HR_HISTORY' | 'MANAGE_AI_HR';

export type PermissionMap = Record<PermissionKey, PermissionState>;

export interface PermissionCategoryDef {
  label: string;
  keys: PermissionKey[];
}

export const PERMISSION_CATEGORIES: Record<string, PermissionCategoryDef> = {
  WORKSPACE: {
    label: 'Workspace',
    keys: ['VIEW_WORKSPACE', 'EDIT_WORKSPACE', 'DELETE_WORKSPACE', 'MANAGE_WORKSPACE'],
  },
  MEMBERS: {
    label: 'Members',
    keys: ['VIEW_MEMBERS', 'INVITE_MEMBERS', 'EDIT_MEMBERS', 'REMOVE_MEMBERS', 'MANAGE_ROLES'],
  },
  CATEGORIES: {
    label: 'Categories',
    keys: ['VIEW_CATEGORY', 'CREATE_CATEGORY', 'EDIT_CATEGORY', 'DELETE_CATEGORY'],
  },
  TEXT_CHANNELS: {
    label: 'Text Channels',
    keys: [
      'VIEW_TEXT_CHANNEL', 'CREATE_TEXT_CHANNEL', 'EDIT_TEXT_CHANNEL', 'DELETE_TEXT_CHANNEL',
      'READ_MESSAGES', 'SEND_MESSAGES', 'DELETE_MESSAGES', 'PIN_MESSAGES', 'MANAGE_MESSAGES',
    ],
  },
  VOICE_CHANNELS: {
    label: 'Voice Channels',
    keys: [
      'VIEW_VOICE_CHANNEL', 'CREATE_VOICE_CHANNEL', 'EDIT_VOICE_CHANNEL', 'DELETE_VOICE_CHANNEL',
      'JOIN_VOICE', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS', 'KICK_MEMBERS',
    ],
  },
  ADMINISTRATIVE: {
    label: 'Administrative',
    keys: ['ADMINISTRATOR'],
  },
  TASKS: {
    label: 'Task Manager',
    keys: ['CREATE_TASK', 'EDIT_TASK', 'DELETE_TASK', 'ASSIGN_TASK', 'MANAGE_TASKS', 'COMMENT_TASK', 'TRACK_TIME', 'VIEW_PRIVATE_TASKS'],
  },
  AI_HR: {
    label: 'AI-HR Assistant',
    keys: ['USE_AI_HR', 'VIEW_AI_HR_HISTORY', 'MANAGE_AI_HR'],
  },
};

export interface ResolvedPermission {
  state: 'ALLOW' | 'DENY';
  source: 'OWNER' | 'ADMINISTRATOR' | 'CHANNEL_OVERRIDE' | 'CATEGORY_OVERRIDE' | 'WORKSPACE_ROLE' | 'DEFAULT';
}

export type ResolvedPermissionMap = Record<PermissionKey, ResolvedPermission>;

export interface AuditLog {
  logId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  createdAt: string;
}

// ── Error helper ──────────────────────────────────────────────────────────────

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message || error.message || 'Request failed.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// ── API Methods ───────────────────────────────────────────────────────────────

/** Fetch the full permission map for a role */
export async function fetchRolePermissions(roleId: string): Promise<PermissionMap> {
  try {
    const { data } = await permissionsClient.get<{ success: boolean; data: { permissions: PermissionMap } }>(`/roles/${roleId}`);
    return data.data.permissions;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Update workspace-level permissions for a role */
export async function updateRolePermissions(roleId: string, permissions: Partial<PermissionMap>): Promise<PermissionMap> {
  try {
    const { data } = await permissionsClient.put<{ success: boolean; data: { permissions: PermissionMap } }>(`/roles/${roleId}`, { permissions });
    return data.data.permissions;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Fetch all role-level permission overrides for a category */
export async function fetchCategoryOverrides(categoryId: string): Promise<Record<string, Partial<PermissionMap>>> {
  try {
    const { data } = await permissionsClient.get<{ success: boolean; data: Record<string, Partial<PermissionMap>> }>(`/categories/${categoryId}/overrides`);
    return data.data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Upsert a role's permission override on a category */
export async function upsertCategoryOverride(categoryId: string, roleId: string, permissions: Partial<PermissionMap>): Promise<void> {
  try {
    await permissionsClient.put(`/categories/${categoryId}/roles/${roleId}`, { permissions });
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Fetch all role-level permission overrides for a channel */
export async function fetchChannelOverrides(
  channelId: string,
  type: 'text' | 'voice' | 'task' | 'ai-hr' = 'text'
): Promise<Record<string, Partial<PermissionMap>>> {
  try {
    const { data } = await permissionsClient.get<{ success: boolean; data: Record<string, Partial<PermissionMap>> }>(`/channels/${channelId}/overrides`, { params: { type } });
    return data.data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Upsert a role's permission override on a channel */
export async function upsertChannelOverride(
  channelId: string,
  roleId: string,
  permissions: Partial<PermissionMap>,
  type: 'text' | 'voice' | 'task' | 'ai-hr' = 'text'
): Promise<void> {
  try {
    await permissionsClient.put(`/channels/${channelId}/roles/${roleId}`, { permissions }, { params: { type } });
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Resolve all effective permissions for a member */
export async function resolveUserPermissions(
  memberId: string,
  context?: { channelId?: string; channelType?: string; categoryId?: string }
): Promise<ResolvedPermissionMap> {
  try {
    const { data } = await permissionsClient.get<{ success: boolean; data: ResolvedPermissionMap }>(`/users/${memberId}/resolve`, { params: context });
    return data.data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Fetch audit log entries for the workspace */
export async function fetchAuditLogs(params?: { from?: string; to?: string; limit?: number }): Promise<AuditLog[]> {
  try {
    const { data } = await permissionsClient.get<{ success: boolean; data: AuditLog[] }>('/audit', { params });
    return data.data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}
