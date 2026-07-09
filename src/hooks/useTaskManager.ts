import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchTasks, fetchTask, createTask, updateTask, deleteTask,
  changeTaskStatus, assignTask, addComment, deleteComment,
  createSubtask, updateSubtask, startTimer, stopTimer,
  fetchTaskAnalytics,
  type Task, type TaskListFilters, type CreateTaskPayload,
  type UpdateTaskPayload, type TaskStatus, type TaskComment,
  type TaskAnalytics, type TimeSession,
} from '../api/tasks';

// ── useTasks ─────────────────────────────────────────────────────────────────

interface UseTasksResult {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  nextCursor: string | null;
  refetch: () => void;
  loadMore: () => void;
  addTaskOptimistic: (task: Task) => void;
  updateTaskOptimistic: (taskId: string, updates: Partial<Task>) => void;
  removeTaskOptimistic: (taskId: string) => void;
}

export function useTasks(filters: TaskListFilters = {}): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const filtersKey = JSON.stringify(filters);
  const fetchCount = useRef(0);

  const load = useCallback(async (cursor?: string) => {
    const id = ++fetchCount.current;
    if (!cursor) setIsLoading(true);
    setError(null);
    try {
      const result = await fetchTasks({ ...filters, lastKey: cursor });
      if (id !== fetchCount.current) return;
      setTasks(prev => cursor ? [...prev, ...result.tasks] : result.tasks);
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (id === fetchCount.current) setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      if (id === fetchCount.current) setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => { load(); }, [load]);

  const loadMore = useCallback(() => { if (nextCursor) load(nextCursor); }, [nextCursor, load]);
  const refetch  = useCallback(() => { load(); }, [load]);

  const addTaskOptimistic    = useCallback((task: Task) => setTasks(p => [task, ...p]), []);
  const updateTaskOptimistic = useCallback((taskId: string, updates: Partial<Task>) =>
    setTasks(p => p.map(t => t.taskId === taskId ? { ...t, ...updates } : t)), []);
  const removeTaskOptimistic = useCallback((taskId: string) =>
    setTasks(p => p.filter(t => t.taskId !== taskId)), []);

  return { tasks, isLoading, error, nextCursor, refetch, loadMore, addTaskOptimistic, updateTaskOptimistic, removeTaskOptimistic };
}

// ── useTask (single task) ─────────────────────────────────────────────────────

interface UseTaskResult {
  task: Task | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  setTask: React.Dispatch<React.SetStateAction<Task | null>>;
}

export function useTask(taskId: string | null): UseTaskResult {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCount = useRef(0);

  const load = useCallback(async () => {
    if (!taskId) { setTask(null); return; }
    const id = ++fetchCount.current;
    setIsLoading(true);
    setError(null);
    try {
      const t = await fetchTask(taskId);
      if (id === fetchCount.current) setTask(t);
    } catch (err) {
      if (id === fetchCount.current) setError(err instanceof Error ? err.message : 'Failed to load task.');
    } finally {
      if (id === fetchCount.current) setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  return { task, isLoading, error, refetch: load, setTask };
}

// ── useTaskActions ────────────────────────────────────────────────────────────

interface UseTaskActionsResult {
  isSaving: boolean;
  error: string | null;
  createNewTask: (payload: CreateTaskPayload) => Promise<Task | null>;
  editTask: (taskId: string, payload: UpdateTaskPayload) => Promise<Task | null>;
  removeTask: (taskId: string) => Promise<boolean>;
  setStatus: (taskId: string, status: TaskStatus) => Promise<Task | null>;
  assign: (taskId: string, users: string[], roles: string[]) => Promise<Task | null>;
  postComment: (taskId: string, content: string) => Promise<TaskComment | null>;
  removeComment: (taskId: string, commentId: string) => Promise<boolean>;
  addSubtask: (taskId: string, title: string, parentSubtaskId?: string) => Promise<boolean>;
  toggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => Promise<{ progress: number } | null>;
}

export function useTaskActions(
  onTaskUpdated?: (task: Task) => void,
  onTaskDeleted?: (taskId: string) => void
): UseTaskActionsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(fn: () => Promise<T>): Promise<T | null> {
    setIsSaving(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  const createNewTask = useCallback((payload: CreateTaskPayload) =>
    run(() => createTask(payload)), []);

  const editTask = useCallback((taskId: string, payload: UpdateTaskPayload) =>
    run(async () => {
      const t = await updateTask(taskId, payload);
      onTaskUpdated?.(t);
      return t;
    }), [onTaskUpdated]);

  const removeTask = useCallback((taskId: string) =>
    run(async () => {
      await deleteTask(taskId);
      onTaskDeleted?.(taskId);
      return true;
    }), [onTaskDeleted]);

  const setStatus = useCallback((taskId: string, status: TaskStatus) =>
    run(async () => {
      const t = await changeTaskStatus(taskId, status);
      onTaskUpdated?.(t);
      return t;
    }), [onTaskUpdated]);

  const assign = useCallback((taskId: string, users: string[], roles: string[]) =>
    run(async () => {
      const t = await assignTask(taskId, users, roles);
      onTaskUpdated?.(t);
      return t;
    }), [onTaskUpdated]);

  const postComment = useCallback((taskId: string, content: string) =>
    run(() => addComment(taskId, content)), []);

  const removeComment = useCallback((taskId: string, commentId: string) =>
    run(async () => { await deleteComment(taskId, commentId); return true; }), []);

  const addSubtask = useCallback((taskId: string, title: string, parentSubtaskId?: string) =>
    run(async () => { await createSubtask(taskId, title, parentSubtaskId); return true; }), []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string, completed: boolean) =>
    run(() => updateSubtask(taskId, subtaskId, { completed })), []);

  return { isSaving, error, createNewTask, editTask, removeTask, setStatus, assign, postComment, removeComment, addSubtask, toggleSubtask };
}

// ── useTaskTimer ──────────────────────────────────────────────────────────────

interface UseTaskTimerResult {
  isRunning: boolean;
  elapsedMs: number;
  isLoading: boolean;
  error: string | null;
  handleStart: () => Promise<void>;
  handleStop: () => Promise<void>;
}

export function useTaskTimer(taskId: string | null, activeSession: TimeSession | null): UseTaskTimerResult {
  const [isRunning, setIsRunning]   = useState(!!activeSession);
  const [elapsedMs, setElapsedMs]   = useState(0);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync with activeSession from parent
  useEffect(() => {
    if (activeSession && !activeSession.stoppedAt) {
      setIsRunning(true);
      const start = new Date(activeSession.startedAt).getTime();
      const tick = () => setElapsedMs(Date.now() - start);
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setIsRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsedMs(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeSession]);

  const handleStart = useCallback(async () => {
    if (!taskId || isRunning) return;
    setIsLoading(true);
    setError(null);
    try {
      await startTimer(taskId);
      const start = Date.now();
      setIsRunning(true);
      intervalRef.current = setInterval(() => setElapsedMs(Date.now() - start), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer.');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, isRunning]);

  const handleStop = useCallback(async () => {
    if (!taskId || !isRunning) return;
    setIsLoading(true);
    setError(null);
    try {
      await stopTimer(taskId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
      setElapsedMs(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop timer.');
    } finally {
      setIsLoading(false);
    }
  }, [taskId, isRunning]);

  return { isRunning, elapsedMs, isLoading, error, handleStart, handleStop };
}

// ── useTaskAnalytics ──────────────────────────────────────────────────────────

interface UseTaskAnalyticsResult {
  analytics: TaskAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTaskAnalytics(): UseTaskAnalyticsResult {
  const [analytics, setAnalytics] = useState<TaskAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTaskAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { analytics, isLoading, error, refetch: load };
}

// ── useTaskSearch ─────────────────────────────────────────────────────────────

interface UseTaskSearchResult {
  results: Task[];
  isSearching: boolean;
  query: string;
  setQuery: (q: string) => void;
}

export function useTaskSearch(allTasks: Task[]): UseTaskSearchResult {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsSearching(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, 300);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return allTasks;
    const q = debouncedQuery.toLowerCase();
    return allTasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      t.status.toLowerCase().includes(q) ||
      t.priority.toLowerCase().includes(q)
    );
  }, [allTasks, debouncedQuery]);

  return { results, isSearching, query, setQuery };
}

// ── Utility: format elapsed ms ────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
  return new Date(task.dueDate) < new Date();
}

export function calcSubtaskProgress(subtasks: { completed: boolean; subtasks?: unknown[] }[]): number {
  if (!subtasks.length) return 0;
  let total = 0, done = 0;
  function walk(items: { completed: boolean; subtasks?: unknown[] }[]) {
    for (const st of items) {
      total++;
      if (st.completed) done++;
      if (st.subtasks?.length) walk(st.subtasks as { completed: boolean; subtasks?: unknown[] }[]);
    }
  }
  walk(subtasks);
  return total === 0 ? 0 : Math.round((done / total) * 100);
}
