import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const tasksClient = axios.create({
  baseURL: `${API_BASE}/api/tasks`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

tasksClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus   = 'BACKLOG' | 'PLANNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
export type TaskVisibility = 'PUBLIC' | 'PRIVATE';

export interface Subtask {
  subtaskId: string;
  title: string;
  completed: boolean;
  assignedUsers: string[];
  subtasks: Subtask[];
  createdAt: string;
}

export interface TaskComment {
  commentId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
}

export interface ActivityLog {
  logId: string;
  type: string;
  actorId: string;
  actorName: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface TimeSession {
  sessionId: string;
  memberId: string;
  memberName: string;
  startedAt: string;
  stoppedAt: string | null;
  durationMs: number;
}

export interface TaskAttachment {
  attachmentId: string;
  fileName: string;
  s3Key: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string;
  contentType: string;
}

export interface RecurrenceRule {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  interval: number;
  endDate: string | null;
  daysOfWeek: number[];
}

export interface Task {
  taskId: string;
  workspaceId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  visibility: TaskVisibility;
  assignedUsers: string[];
  assignedRoles: string[];
  subtasks: Subtask[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activityLogs: ActivityLog[];
  tags: string[];
  estimatedHours: number;
  trackedHours: number;
  trackedTime: TimeSession[];
  dueDate: string | null;
  startDate: string | null;
  recurrenceRule: RecurrenceRule | null;
  parentTaskId: string | null;
  progress: number;
  createdBy: string;
  updatedAt: string;
  channelId?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  visibility?: TaskVisibility;
  assignedUsers?: string[];
  assignedRoles?: string[];
  tags?: string[];
  estimatedHours?: number;
  dueDate?: string | null;
  startDate?: string | null;
  recurrenceRule?: RecurrenceRule | null;
  parentTaskId?: string | null;
  channelId?: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  visibility?: TaskVisibility;
  tags?: string[];
  estimatedHours?: number;
  dueDate?: string | null;
  startDate?: string | null;
  recurrenceRule?: RecurrenceRule | null;
}

export interface TaskListFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  visibility?: TaskVisibility;
  assignedTo?: string;
  search?: string;
  channelId?: string;
  limit?: number;
  lastKey?: string;
}

export interface TaskAnalytics {
  totalTasks: number;
  statusCounts: Record<TaskStatus, number>;
  priorityCounts: Record<TaskPriority, number>;
  totalTrackedHours: number;
  completedThisWeek: number;
  overdueCount: number;
  completionRate: number;
  topMembers: { memberId: string; memberName: string; totalHours: number }[];
}

export interface TimeBreakdown {
  totalHours: number;
  byMember: { memberId: string; memberName: string; totalMs: number; totalHours: number; sessions: TimeSession[] }[];
  sessions: TimeSession[];
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

export async function fetchTasks(filters: TaskListFilters = {}): Promise<{ tasks: Task[]; nextCursor: string | null }> {
  try {
    const { data } = await tasksClient.get<{ success: boolean; data: Task[]; nextCursor: string | null }>('/', { params: filters });
    return { tasks: data.data, nextCursor: data.nextCursor };
  } catch (error) { throw new Error(extractError(error)); }
}

export async function fetchTask(taskId: string): Promise<Task> {
  try {
    const { data } = await tasksClient.get<{ success: boolean; data: Task }>(`/${taskId}`);
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  try {
    const { data } = await tasksClient.post<{ success: boolean; data: Task }>('/', payload);
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function updateTask(taskId: string, payload: UpdateTaskPayload): Promise<Task> {
  try {
    const { data } = await tasksClient.patch<{ success: boolean; data: Task }>(`/${taskId}`, payload);
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function deleteTask(taskId: string): Promise<void> {
  try {
    await tasksClient.delete(`/${taskId}`);
  } catch (error) { throw new Error(extractError(error)); }
}

export async function changeTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  try {
    const { data } = await tasksClient.patch<{ success: boolean; data: Task }>(`/${taskId}/status`, { status });
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function assignTask(taskId: string, assignedUsers: string[], assignedRoles: string[]): Promise<Task> {
  try {
    const { data } = await tasksClient.patch<{ success: boolean; data: Task }>(`/${taskId}/assign`, { assignedUsers, assignedRoles });
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function addComment(taskId: string, content: string): Promise<TaskComment> {
  try {
    const { data } = await tasksClient.post<{ success: boolean; data: TaskComment }>(`/${taskId}/comments`, { content });
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function deleteComment(taskId: string, commentId: string): Promise<void> {
  try {
    await tasksClient.delete(`/${taskId}/comments/${commentId}`);
  } catch (error) { throw new Error(extractError(error)); }
}

export async function createSubtask(taskId: string, title: string, parentSubtaskId?: string, assignedUsers?: string[]): Promise<Subtask> {
  try {
    const { data } = await tasksClient.post<{ success: boolean; data: Subtask }>(`/${taskId}/subtasks`, { title, parentSubtaskId, assignedUsers });
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function updateSubtask(taskId: string, subtaskId: string, updates: { title?: string; completed?: boolean; assignedUsers?: string[] }): Promise<{ subtaskId: string; progress: number }> {
  try {
    const { data } = await tasksClient.patch<{ success: boolean; data: { subtaskId: string; progress: number } }>(`/${taskId}/subtasks/${subtaskId}`, updates);
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function startTimer(taskId: string): Promise<TimeSession> {
  try {
    const { data } = await tasksClient.post<{ success: boolean; data: TimeSession }>(`/${taskId}/time/start`);
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function stopTimer(taskId: string): Promise<{ trackedHours: number; sessions: TimeSession[] }> {
  try {
    const { data } = await tasksClient.post<{ success: boolean; data: { trackedHours: number; sessions: TimeSession[] } }>(`/${taskId}/time/stop`);
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function getTimeSessions(taskId: string): Promise<TimeBreakdown> {
  try {
    const { data } = await tasksClient.get<{ success: boolean; data: TimeBreakdown }>(`/${taskId}/time`);
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function presignAttachment(taskId: string, fileName: string, contentType: string): Promise<{ uploadUrl: string; attachment: TaskAttachment }> {
  try {
    const { data } = await tasksClient.post<{ success: boolean; data: { uploadUrl: string; attachment: TaskAttachment } }>(`/${taskId}/attachments/presign`, { fileName, contentType });
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}

export async function fetchTaskAnalytics(): Promise<TaskAnalytics> {
  try {
    const { data } = await tasksClient.get<{ success: boolean; data: TaskAnalytics }>('/analytics');
    return data.data;
  } catch (error) { throw new Error(extractError(error)); }
}
