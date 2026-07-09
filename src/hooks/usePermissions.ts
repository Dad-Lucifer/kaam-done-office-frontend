import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchRolePermissions,
  updateRolePermissions,
  fetchAuditLogs,
  type PermissionMap,
  type PermissionKey,
  type PermissionState,
  type AuditLog,
} from '../api/permissions';

// ── usePermissions ─────────────────────────────────────────────────────────────

interface UsePermissionsResult {
  permissions: PermissionMap | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isDirty: boolean;
  updatePermission: (key: PermissionKey, state: PermissionState) => void;
  savePermissions: () => Promise<void>;
  resetPermissions: () => void;
  refetch: () => void;
}

/**
 * Manages the full permission map for a single role.
 * Tracks dirty state and provides optimistic local updates.
 */
export function usePermissions(roleId: string | null): UsePermissionsResult {
  const [serverPermissions, setServerPermissions] = useState<PermissionMap | null>(null);
  const [localPermissions, setLocalPermissions]   = useState<PermissionMap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fetchCount = useRef(0);

  const loadPermissions = useCallback(async () => {
    if (!roleId) {
      setServerPermissions(null);
      setLocalPermissions(null);
      return;
    }
    const id = ++fetchCount.current;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchRolePermissions(roleId);
      if (id === fetchCount.current) {
        setServerPermissions(data);
        setLocalPermissions(data);
      }
    } catch (err) {
      if (id === fetchCount.current) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions.');
      }
    } finally {
      if (id === fetchCount.current) setIsLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const updatePermission = useCallback((key: PermissionKey, state: PermissionState) => {
    setLocalPermissions(prev => prev ? { ...prev, [key]: state } : prev);
  }, []);

  const savePermissions = useCallback(async () => {
    if (!roleId || !localPermissions) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await updateRolePermissions(roleId, localPermissions);
      setServerPermissions(saved);
      setLocalPermissions(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [roleId, localPermissions]);

  const resetPermissions = useCallback(() => {
    setLocalPermissions(serverPermissions);
  }, [serverPermissions]);

  const isDirty = JSON.stringify(localPermissions) !== JSON.stringify(serverPermissions);

  return {
    permissions: localPermissions,
    isLoading,
    isSaving,
    error,
    isDirty,
    updatePermission,
    savePermissions,
    resetPermissions,
    refetch: loadPermissions,
  };
}

// ── useAuditLogs ──────────────────────────────────────────────────────────────

interface UseAuditLogsResult {
  logs: AuditLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches audit logs for the workspace with optional date range filtering.
 */
export function useAuditLogs(params?: { from?: string; to?: string; limit?: number }): UseAuditLogsResult {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const paramsKey = JSON.stringify(params);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs(params);
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return { logs, isLoading, error, refetch: loadLogs };
}
