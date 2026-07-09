import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const auditClient = axios.create({
  baseURL: `${API_BASE}/api/audit-logs`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

auditClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// -- Types ----------------------------------------------------------------------

export interface AttendanceRecord {
  logId: string;
  memberId: string;
  username: string;
  date: string;          // "YYYY-MM-DD"
  dayOfWeek: string;     // "Monday" … "Sunday"
  loginAt: string;       // ISO 8601
  logoutAt: string | null;
  workingHoursMs: number | null;
  workingHours: number | null;
  isActive: boolean;
}

export interface AttendanceStats {
  totalSessions: number;
  completedSessions: number;
  totalHours: number;
  avgHoursPerDay: number;
}

export interface MemberAttendanceData {
  memberId: string;
  records: AttendanceRecord[];
  stats: AttendanceStats;
}

export interface TaskAssignmentSummary {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  progress: number;
  subtasks: { total: number; completed: number };
  assignedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SubtaskCompletion {
  logId?: string;
  taskId: string;
  taskTitle: string;
  subtaskId: string;
  subtaskTitle: string;
  completedAt: string;
}

export interface MemberTaskSummary {
  memberId: string;
  username: string;
  tasksAssigned: TaskAssignmentSummary[];
  recentCompletions: SubtaskCompletion[];
  taskCount: number;
  totalSubtasks: number;
  completedSubtasks: number;
  subtaskCompletionRate: number;
}

export interface AttendanceFilters {
  dateFrom?: string;
  dateTo?: string;
  memberId?: string;
  limit?: number;
}

export interface TaskActivityFilters {
  memberId?: string;
  status?: string;
  limit?: number;
}

// -- Error helper ---------------------------------------------------------------

function extractError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message || error.message || 'Request failed.';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

// -- API Methods ----------------------------------------------------------------

/** Fetch all attendance logs for the workspace */
export async function fetchAttendanceLogs(
  filters: AttendanceFilters = {}
): Promise<{ data: AttendanceRecord[]; count: number }> {
  try {
    const { data } = await auditClient.get<{ success: boolean; data: AttendanceRecord[]; count: number }>(
      '/attendance',
      { params: filters }
    );
    return { data: data.data, count: data.count };
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Fetch attendance records for a specific member */
export async function fetchMemberAttendance(
  memberId: string,
  filters: Omit<AttendanceFilters, 'memberId'> = {}
): Promise<MemberAttendanceData> {
  try {
    const { data } = await auditClient.get<{ success: boolean; data: MemberAttendanceData }>(
      `/attendance/${memberId}`,
      { params: filters }
    );
    return data.data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Fetch task activity grouped by member */
export async function fetchTaskActivity(
  filters: TaskActivityFilters = {}
): Promise<{ data: MemberTaskSummary[]; totalTasks: number }> {
  try {
    const { data } = await auditClient.get<{ success: boolean; data: MemberTaskSummary[]; totalTasks: number }>(
      '/tasks',
      { params: filters }
    );
    return { data: data.data, totalTasks: data.totalTasks };
  } catch (error) {
    throw new Error(extractError(error));
  }
}

/** Team member logout — closes open attendance session */
export async function memberLogout(): Promise<{ logoutAt: string; workingHours: number }> {
  try {
    const authClient = axios.create({
      baseURL: `${API_BASE}/api/auth`,
      headers: { 'Content-Type': 'application/json' },
    });
    authClient.interceptors.request.use((config) => {
      const token = sessionStorage.getItem('memberToken') || sessionStorage.getItem('accessToken');
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });
    const { data } = await authClient.post<{ success: boolean; data: { logoutAt: string; workingHours: number } }>(
      '/member-logout'
    );
    return data.data;
  } catch (error) {
    throw new Error(extractError(error));
  }
}

