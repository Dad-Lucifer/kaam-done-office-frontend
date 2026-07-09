import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Trash2, Search, Check, Loader, RefreshCw,
  Users, Hash, Volume2, Folder, Clock, Eye, Crown,
  ChevronRight, AlertTriangle, X, Save, Brain, Rocket,
} from 'lucide-react';
import './PermissionsComponent.css';

import {
  PERMISSION_CATEGORIES,
  type PermissionState,
  type PermissionKey,
  type PermissionMap,
  type ResolvedPermissionMap,
  type AuditLog,
  fetchCategoryOverrides,
  upsertCategoryOverride,
  fetchChannelOverrides,
  upsertChannelOverride,
  resolveUserPermissions,
  fetchAuditLogs,
} from '../../../api/permissions';

import {
  fetchRoles,
  createRole as apiCreateRole,
  updateRole as apiUpdateRole,
  deleteRole as apiDeleteRole,
  type Role,
  type RolePayload,
} from '../../../api/roles';

import { fetchMembers, type TeamMember } from '../../../api/members';
import { fetchChannels, type TextChannel } from '../../../api/channels';
import { fetchVoiceChannels } from '../../../api/voiceChannels';
import { fetchCategories, type Category } from '../../../api/categories';
import { fetchTaskChannels, type TaskChannel } from '../../../api/taskChannels';
import { getAiHrChannels, type AiHrChannel } from '../../../api/aiHr';
import { useSubscription } from '../../../context/SubscriptionContext';
import SubscriptionLimitModal from '../SubscriptionLimitModal';
import UpgradeModal from '../UpgradeModal';

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#99aab5', '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63',
  '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#607d8b', '#11806a',
  '#1f8b4c', '#206694', '#71368a', '#ad1457', '#c27c0e', '#a84300', '#992d22',
];

const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  VIEW_WORKSPACE:      'Can view the workspace',
  EDIT_WORKSPACE:      'Can edit workspace settings',
  DELETE_WORKSPACE:    'Can delete the workspace',
  MANAGE_WORKSPACE:    'Full workspace management access',
  VIEW_MEMBERS:        'Can see the member list',
  INVITE_MEMBERS:      'Can invite new members',
  EDIT_MEMBERS:        'Can edit member profiles',
  REMOVE_MEMBERS:      'Can kick members from workspace',
  MANAGE_ROLES:        'Can create, edit, and delete roles',
  VIEW_CATEGORY:       'Can see categories',
  CREATE_CATEGORY:     'Can create new categories',
  EDIT_CATEGORY:       'Can rename and edit categories',
  DELETE_CATEGORY:     'Can delete categories',
  VIEW_TEXT_CHANNEL:   'Can see text channels',
  CREATE_TEXT_CHANNEL: 'Can create text channels',
  EDIT_TEXT_CHANNEL:   'Can rename and configure text channels',
  DELETE_TEXT_CHANNEL: 'Can delete text channels',
  READ_MESSAGES:       'Can read message history',
  SEND_MESSAGES:       'Can send messages in text channels',
  DELETE_MESSAGES:     'Can delete other members\' messages',
  PIN_MESSAGES:        'Can pin messages in channels',
  MANAGE_MESSAGES:     'Full message management (pin, delete, etc.)',
  VIEW_VOICE_CHANNEL:  'Can see voice channels',
  CREATE_VOICE_CHANNEL:'Can create voice channels',
  EDIT_VOICE_CHANNEL:  'Can rename and configure voice channels',
  DELETE_VOICE_CHANNEL:'Can delete voice channels',
  JOIN_VOICE:          'Can join voice channels',
  MUTE_MEMBERS:        'Can server-mute members in voice',
  DEAFEN_MEMBERS:      'Can server-deafen members in voice',
  MOVE_MEMBERS:        'Can move members between voice channels',
  KICK_MEMBERS:        'Can kick members from voice channels',
  ADMINISTRATOR:       'Grants ALL permissions — bypasses all permission checks',
  // Task Manager
  CREATE_TASK:         'Can create new tasks and missions',
  EDIT_TASK:           'Can edit task details, subtasks, and attachments',
  DELETE_TASK:         'Can permanently delete tasks',
  ASSIGN_TASK:         'Can assign tasks to users and roles',
  MANAGE_TASKS:        'Full task management — includes delete, reassign, and private task access',
  COMMENT_TASK:        'Can post and delete comments on tasks',
  TRACK_TIME:          'Can start and stop time tracking on tasks',
  VIEW_PRIVATE_TASKS:  'Can view tasks marked as Private',
  // AI-HR
  USE_AI_HR:           'Can send messages and interact with the AI-HR assistant',
  VIEW_AI_HR_HISTORY:  'Can read the full AI-HR conversation history for this channel',
  MANAGE_AI_HR:        'Can clear conversations and manage AI-HR channel settings',
};

type TabId = 'roles' | 'matrix' | 'category-overrides' | 'channel-overrides' | 'inspector' | 'audit';

// Channel type extended to support Task Manager and AI-HR specialty channels
type ChannelType = 'text' | 'voice' | 'task' | 'ai-hr';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'roles',             label: 'Roles',              icon: <Shield size={14} /> },
  { id: 'category-overrides', label: 'Category Overrides', icon: <Folder size={14} /> },
  { id: 'channel-overrides', label: 'Channel Overrides',  icon: <Hash size={14} /> },
  { id: 'inspector',         label: 'User Inspector',      icon: <Eye size={14} /> },
  { id: 'audit',             label: 'Audit Log',           icon: <Clock size={14} /> },
];

const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: 'easeOut' as const },
};

// ── Helper functions ──────────────────────────────────────────────────────────

function formatPermissionKey(key: string): string {
  return key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    ROLE_CREATED: 'created role',
    ROLE_UPDATED: 'updated role',
    ROLE_DELETED: 'deleted role',
    PERMISSION_CHANGED: 'changed permissions on',
    OVERRIDE_SET: 'set override on',
    OVERRIDE_REMOVED: 'removed override from',
    MEMBER_ROLE_ASSIGNED: 'assigned role to',
  };
  return map[action] || action.toLowerCase().replace(/_/g, ' ');
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getSourceClass(source: string): string {
  if (source === 'OWNER') return 'owner';
  if (source === 'ADMINISTRATOR') return 'admin';
  if (source === 'CHANNEL_OVERRIDE') return 'channel';
  if (source === 'CATEGORY_OVERRIDE') return 'category';
  if (source === 'WORKSPACE_ROLE') return 'workspace';
  return 'default';
}

function getSourceLabel(source: string): string {
  const map: Record<string, string> = {
    OWNER: 'Owner',
    ADMINISTRATOR: 'Admin',
    CHANNEL_OVERRIDE: 'Channel',
    CATEGORY_OVERRIDE: 'Category',
    WORKSPACE_ROLE: 'Role',
    DEFAULT: 'Default',
  };
  return map[source] || source;
}

// ── StateSelector ─────────────────────────────────────────────────────────────

interface StateSelectorProps {
  value: PermissionState;
  onChange: (state: PermissionState) => void;
  disabled?: boolean;
}

const StateSelector = memo(({ value, onChange, disabled }: StateSelectorProps) => (
  <div className="pm-state-selector">
    {(['ALLOW', 'DENY', 'INHERIT'] as PermissionState[]).map((state) => (
      <button
        key={state}
        className={`pm-state-btn ${state.toLowerCase()} ${value === state ? 'active' : ''}`}
        onClick={() => !disabled && onChange(state)}
        disabled={disabled}
        title={state}
        type="button"
      >
        {state === 'ALLOW' && <Check size={9} />}
        {state === 'DENY'  && <X size={9} />}
        {state === 'INHERIT' && '—'}
        {state === 'ALLOW' ? 'Allow' : state === 'DENY' ? 'Deny' : 'Inherit'}
      </button>
    ))}
  </div>
));
StateSelector.displayName = 'StateSelector';

// ── PermissionsComponent ──────────────────────────────────────────────────────

const PermissionsComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('roles');
  
  const { canCreate, refetch: refetchSubscription } = useSubscription();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ── Global data ────────────────────────────────────────────────────────────
  const [roles,         setRoles]         = useState<Role[]>([]);
  const [members,       setMembers]       = useState<TeamMember[]>([]);
  const [categories,    setCategories]    = useState<Category[]>([]);
  const [textChannels,  setTextChannels]  = useState<TextChannel[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<any[]>([]);
  const [taskChannels,  setTaskChannels]  = useState<TaskChannel[]>([]);
  const [aiHrChannels,  setAiHrChannels]  = useState<AiHrChannel[]>([]);

  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalError,   setGlobalError]   = useState<string | null>(null);

  // Load all workspace data on mount
  const loadAll = useCallback(async () => {
    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const [r, m, c, tc] = await Promise.all([
        fetchRoles(), fetchMembers(), fetchCategories(), fetchChannels(),
      ]);
      setRoles(r);
      setMembers(m);
      setCategories(c);
      setTextChannels(tc);
      // Voice channels — non-fatal
      try {
        const vc = await fetchVoiceChannels();
        setVoiceChannels(vc || []);
      } catch {
        setVoiceChannels([]);
      }
      // Task Manager channels — non-fatal
      try {
        const tch = await fetchTaskChannels();
        setTaskChannels(tch || []);
      } catch {
        setTaskChannels([]);
      }
      // AI-HR channels — non-fatal
      try {
        const ach = await getAiHrChannels();
        setAiHrChannels(ach || []);
      } catch {
        setAiHrChannels([]);
      }
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load workspace data.');
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Roles Tab state ────────────────────────────────────────────────────────
  const [selectedRole,   setSelectedRole]   = useState<Role | null>(null);
  const [editingRole,    setEditingRole]     = useState<Role | null>(null);
  const [roleSaving,     setRoleSaving]      = useState(false);
  const [roleDeleting,   setRoleDeleting]    = useState(false);
  const [roleError,      setRoleError]       = useState<string | null>(null);
  const [isCreatingRole, setIsCreatingRole]  = useState(false);

  const handleSelectRole = useCallback((role: Role) => {
    setSelectedRole(role);
    setEditingRole({ ...role });
    setIsCreatingRole(false);
    setRoleError(null);
  }, []);

  const handleCreateNewRole = useCallback(() => {
    if (!canCreate('role')) {
      setShowLimitModal(true);
      return;
    }

    const newRole: Role = {
      id: '',
      name: 'New Role',
      color: '#9b59b6',
      icon: null as any,
      position: roles.length,
      isOwner: false as any,
      permissions: {} as any,
      channelAccess: {},
    };
    setSelectedRole(null);
    setEditingRole(newRole);
    setIsCreatingRole(true);
    setRoleError(null);
  }, [roles.length, canCreate]);

  const handleSaveRole = useCallback(async () => {
    if (!editingRole) return;
    setRoleSaving(true);
    setRoleError(null);
    try {
      const payload: RolePayload = {
        name: editingRole.name,
        color: editingRole.color,
        permissions: editingRole.permissions,
        channelAccess: editingRole.channelAccess,
      };
      if (isCreatingRole) {
        const created = await apiCreateRole(payload);
        setRoles((prev) => [...prev, created]);
        setSelectedRole(created);
        setEditingRole({ ...created });
        setIsCreatingRole(false);
      } else {
        const updated = await apiUpdateRole(editingRole.id, payload);
        setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        setSelectedRole(updated);
        setEditingRole({ ...updated });
      }
      refetchSubscription();
    } catch (err: any) {
      if (err?.response?.status === 402) {
        setShowLimitModal(true);
      } else {
        setRoleError(err instanceof Error ? err.message : 'Failed to save role.');
      }
    } finally {
      setRoleSaving(false);
    }
  }, [editingRole, isCreatingRole, canCreate, refetchSubscription]);

  const handleDeleteRole = useCallback(async () => {
    if (!editingRole?.id || (editingRole as any).isOwner) return;
    if (!window.confirm(`Delete role "${editingRole.name}"? This cannot be undone.`)) return;
    setRoleDeleting(true);
    setRoleError(null);
    try {
      await apiDeleteRole(editingRole.id);
      setRoles((prev) => prev.filter((r) => r.id !== editingRole.id));
      setEditingRole(null);
      setSelectedRole(null);
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to delete role.');
    } finally {
      setRoleDeleting(false);
    }
  }, [editingRole]);

  // ── Category Overrides Tab state ───────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [catOverrideRoleId,  setCatOverrideRoleId]  = useState<string>('');
  const [catOverrides,       setCatOverrides]        = useState<Record<string, Partial<PermissionMap>>>({});
  const [localCatOverride,   setLocalCatOverride]    = useState<Partial<PermissionMap>>({});
  const [catOverrideLoading, setCatOverrideLoading]  = useState(false);
  const [catOverrideSaving,  setCatOverrideSaving]   = useState(false);
  const [catOverrideError,   setCatOverrideError]    = useState<string | null>(null);

  const loadCatOverrides = useCallback(async (catId: string) => {
    if (!catId) return;
    setCatOverrideLoading(true);
    setCatOverrideError(null);
    try {
      const data = await fetchCategoryOverrides(catId);
      setCatOverrides(data);
    } catch (err) {
      setCatOverrideError(err instanceof Error ? err.message : 'Failed to load overrides.');
    } finally {
      setCatOverrideLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCategoryId) loadCatOverrides(selectedCategoryId);
  }, [selectedCategoryId, loadCatOverrides]);

  useEffect(() => {
    setLocalCatOverride(catOverrides[catOverrideRoleId] || {});
  }, [catOverrideRoleId, catOverrides]);

  const handleCatOverrideChange = useCallback((key: PermissionKey, state: PermissionState) => {
    setLocalCatOverride((prev) => ({ ...prev, [key]: state }));
  }, []);

  const handleCatOverrideSave = useCallback(async () => {
    if (!selectedCategoryId || !catOverrideRoleId) return;
    setCatOverrideSaving(true);
    setCatOverrideError(null);
    try {
      await upsertCategoryOverride(selectedCategoryId, catOverrideRoleId, localCatOverride);
      setCatOverrides((prev) => ({ ...prev, [catOverrideRoleId]: localCatOverride }));
    } catch (err) {
      setCatOverrideError(err instanceof Error ? err.message : 'Failed to save override.');
    } finally {
      setCatOverrideSaving(false);
    }
  }, [selectedCategoryId, catOverrideRoleId, localCatOverride]);

  // ── Channel Overrides Tab state ────────────────────────────────────────────
  const [channelType,        setChannelType]        = useState<ChannelType>('text');
  const [selectedChannelId,  setSelectedChannelId]  = useState<string>('');
  const [chanOverrideRoleId, setChanOverrideRoleId] = useState<string>('');
  const [chanOverrides,      setChanOverrides]       = useState<Record<string, Partial<PermissionMap>>>({});
  const [localChanOverride,  setLocalChanOverride]   = useState<Partial<PermissionMap>>({});
  const [chanOverrideLoading,setChanOverrideLoading] = useState(false);
  const [chanOverrideSaving, setChanOverrideSaving]  = useState(false);
  const [chanOverrideError,  setChanOverrideError]   = useState<string | null>(null);

  const activeChannels = useMemo(() => {
    if (channelType === 'text')  return textChannels;
    if (channelType === 'voice') return voiceChannels;
    if (channelType === 'task')  return taskChannels;
    if (channelType === 'ai-hr') return aiHrChannels;
    return [];
  }, [channelType, textChannels, voiceChannels, taskChannels, aiHrChannels]);

  const loadChanOverrides = useCallback(async (channelId: string, type: ChannelType) => {
    if (!channelId) return;
    setChanOverrideLoading(true);
    setChanOverrideError(null);
    try {
      const data = await fetchChannelOverrides(channelId, type);
      setChanOverrides(data);
    } catch (err) {
      setChanOverrideError(err instanceof Error ? err.message : 'Failed to load overrides.');
    } finally {
      setChanOverrideLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChannelId) loadChanOverrides(selectedChannelId, channelType);
  }, [selectedChannelId, channelType, loadChanOverrides]);

  useEffect(() => {
    setLocalChanOverride(chanOverrides[chanOverrideRoleId] || {});
  }, [chanOverrideRoleId, chanOverrides]);

  const handleChanOverrideChange = useCallback((key: PermissionKey, state: PermissionState) => {
    setLocalChanOverride((prev) => ({ ...prev, [key]: state }));
  }, []);

  const handleChanOverrideSave = useCallback(async () => {
    if (!selectedChannelId || !chanOverrideRoleId) return;
    setChanOverrideSaving(true);
    setChanOverrideError(null);
    try {
      await upsertChannelOverride(selectedChannelId, chanOverrideRoleId, localChanOverride, channelType);
      setChanOverrides((prev) => ({ ...prev, [chanOverrideRoleId]: localChanOverride }));
    } catch (err) {
      setChanOverrideError(err instanceof Error ? err.message : 'Failed to save override.');
    } finally {
      setChanOverrideSaving(false);
    }
  }, [selectedChannelId, chanOverrideRoleId, localChanOverride, channelType]);

  // ── Inspector Tab state ────────────────────────────────────────────────────
  const [inspectorSearch,   setInspectorSearch]   = useState('');
  const [inspectorMemberId, setInspectorMemberId] = useState<string>('');
  const [resolvedPerms,     setResolvedPerms]      = useState<ResolvedPermissionMap | null>(null);
  const [inspectorLoading,  setInspectorLoading]   = useState(false);
  const [inspectorError,    setInspectorError]     = useState<string | null>(null);

  const filteredMembers = useMemo(() =>
    members.filter((m) =>
      m.username.toLowerCase().includes(inspectorSearch.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(inspectorSearch.toLowerCase())
    ),
    [members, inspectorSearch]
  );

  const handleInspectMember = useCallback(async (memberId: string) => {
    setInspectorMemberId(memberId);
    setInspectorLoading(true);
    setInspectorError(null);
    setResolvedPerms(null);
    try {
      const data = await resolveUserPermissions(memberId);
      setResolvedPerms(data);
    } catch (err) {
      setInspectorError(err instanceof Error ? err.message : 'Failed to resolve permissions.');
    } finally {
      setInspectorLoading(false);
    }
  }, []);

  // ── Audit Log Tab state ────────────────────────────────────────────────────
  const [auditLogs,    setAuditLogs]    = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError,   setAuditError]   = useState<string | null>(null);
  const [auditFrom,    setAuditFrom]    = useState('');
  const [auditTo,      setAuditTo]      = useState('');

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const params: { from?: string; to?: string } = {};
      if (auditFrom) params.from = new Date(auditFrom).toISOString();
      if (auditTo)   params.to   = new Date(auditTo).toISOString();
      const data = await fetchAuditLogs(params);
      setAuditLogs(data);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Failed to load audit logs.');
    } finally {
      setAuditLoading(false);
    }
  }, [auditFrom, auditTo]);

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, loadAuditLogs]);

  // ── Helper: find role by id ────────────────────────────────────────────────
  const roleById = useCallback((id: string) => roles.find((r) => r.id === id), [roles]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pm-container">
      {/* Header */}
      <div className="pm-header">
        <div>
          <h1 className="pm-title">Permission Management</h1>
          <p className="pm-subtitle">
            Manage roles, permissions, and access controls across your workspace.
          </p>
        </div>
        <button className="pm-btn-secondary pm-btn-icon" onClick={loadAll} title="Refresh all data" disabled={globalLoading}>
          <RefreshCw size={15} className={globalLoading ? 'pm-spin' : ''} />
        </button>
      </div>

      {/* Global error */}
      <AnimatePresence>
        {globalError && (
          <motion.div className="pm-error-banner" {...fadeSlide}>
            <span><AlertTriangle size={14} style={{ marginRight: 6 }} />{globalError}</span>
            <button className="pm-error-dismiss" onClick={() => setGlobalError(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="pm-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`pm-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <AnimatePresence mode="wait">
        {/* ════════════ ROLES TAB ════════════ */}
        {activeTab === 'roles' && (
          <motion.div key="roles" {...fadeSlide}>
            <AnimatePresence>
              {roleError && (
                <motion.div className="pm-error-banner" {...fadeSlide}>
                  <span>{roleError}</span>
                  <button className="pm-error-dismiss" onClick={() => setRoleError(null)}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pm-split">
              {/* Left: Role list */}
              <div className="pm-left">
                <button className="pm-btn-primary" style={{ marginBottom: 8 }} onClick={handleCreateNewRole}>
                  <Plus size={14} /> Create Role
                </button>
                <div className="pm-panel-label">Roles ({roles.length})</div>
                <div className="pm-role-list">
                  {globalLoading && (
                    <div className="pm-loading"><Loader size={16} className="pm-spin" /><span>Loading…</span></div>
                  )}
                  {!globalLoading && roles.length === 0 && (
                    <div className="pm-empty-state" style={{ padding: '24px 12px' }}>
                      <p>No roles yet. Create your first role.</p>
                    </div>
                  )}
                  {roles.map((role) => (
                    <motion.div
                      key={role.id}
                      className={`pm-role-item ${(selectedRole?.id === role.id || (isCreatingRole && !role.id)) ? 'active' : ''}`}
                      onClick={() => handleSelectRole(role)}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="pm-role-color-dot" style={{ backgroundColor: role.color }} />
                      <span className="pm-role-name" style={{ color: role.color }}>{role.name}</span>
                      {(role as any).isOwner && (
                        <span className="pm-owner-badge"><Crown size={9} /> Owner</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: Role editor */}
              <div className="pm-right">
                {!editingRole && !isCreatingRole ? (
                  <div className="pm-empty-state">
                    <Shield size={40} />
                    <h3>Select a role to edit</h3>
                    <p>Choose a role from the list, or create a new one.</p>
                  </div>
                ) : editingRole && (
                  <div className="pm-editor-card">
                    <h2 className="pm-editor-title">
                      {isCreatingRole ? 'New Role' : (
                        <span style={{ color: editingRole.color }}>{editingRole.name}</span>
                      )}
                    </h2>

                    {/* Name */}
                    <div className="pm-form-group">
                      <label className="pm-label">Role Name</label>
                      <input
                        className="pm-input"
                        style={{ maxWidth: 360 }}
                        value={editingRole.name}
                        onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                        disabled={(editingRole as any).isOwner}
                        placeholder="e.g. Moderator"
                      />
                    </div>

                    {/* Color */}
                    <div className="pm-form-group">
                      <label className="pm-label">Role Color</label>
                      <div className="pm-color-picker">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`pm-color-btn ${editingRole.color === color ? 'selected' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => !((editingRole as any).isOwner) && setEditingRole({ ...editingRole, color })}
                            disabled={(editingRole as any).isOwner}
                          >
                            {editingRole.color === color && <Check size={12} color="#fff" style={{ mixBlendMode: 'difference' }} />}
                          </button>
                        ))}
                      </div>
                      <div className="pm-color-custom" style={{ marginTop: 10 }}>
                        <div className="pm-color-btn" style={{ backgroundColor: editingRole.color, width: 36, height: 36 }} />
                        <input
                          className="pm-input-color"
                          value={editingRole.color}
                          onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                          disabled={(editingRole as any).isOwner}
                          placeholder="#hex"
                        />
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="pm-form-group">
                      <label className="pm-label">Icon (emoji)</label>
                      <input
                        className="pm-input pm-input-sm"
                        value={(editingRole as any).icon || ''}
                        onChange={(e) => setEditingRole({ ...editingRole, icon: e.target.value } as any)}
                        disabled={(editingRole as any).isOwner}
                        placeholder="🛡️"
                        maxLength={2}
                      />
                    </div>

                    {/* Position */}
                    <div className="pm-form-group">
                      <label className="pm-label">Hierarchy Position</label>
                      <input
                        type="number"
                        className="pm-input pm-input-sm"
                        value={(editingRole as any).position ?? 0}
                        onChange={(e) => setEditingRole({ ...editingRole, position: parseInt(e.target.value, 10) || 0 } as any)}
                        disabled={(editingRole as any).isOwner}
                        min={0}
                      />
                      <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Lower number = higher priority in conflict resolution.
                      </p>
                    </div>

                    {(editingRole as any).isOwner && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)', borderRadius: 8, marginBottom: 20 }}>
                        <Crown size={14} color="#d4af37" />
                        <span style={{ fontSize: '0.82rem', color: '#d4af37', fontWeight: 600 }}>
                          This is the protected Owner role. It cannot be modified or deleted.
                        </span>
                      </div>
                    )}

                    {/* Permissions Matrix injected into Role Editor */}
                    <div style={{ marginTop: 24, marginBottom: 24 }}>
                      <div className="pm-panel-label" style={{ marginBottom: 12 }}>Workspace Permissions</div>
                      <div className="pm-matrix">
                        {Object.entries(PERMISSION_CATEGORIES).map(([catKey, catDef]) => (
                          <div key={catKey} className="pm-matrix-category">
                            <div className="pm-matrix-category-title">
                              {catKey === 'WORKSPACE'      && <Shield size={12} />}
                              {catKey === 'MEMBERS'        && <Users size={12} />}
                              {catKey === 'CATEGORIES'     && <Folder size={12} />}
                              {catKey === 'TEXT_CHANNELS'  && <Hash size={12} />}
                              {catKey === 'VOICE_CHANNELS' && <Volume2 size={12} />}
                              {catKey === 'ADMINISTRATIVE' && <AlertTriangle size={12} />}
                              {catKey === 'TASKS'          && <Rocket size={12} style={{ color: '#f59e0b' }} />}
                              {catKey === 'AI_HR'          && <Brain size={12} style={{ color: '#8b5cf6' }} />}
                              {catDef.label}
                            </div>
                            {catDef.keys.map((permKey) => (
                              <div key={permKey} className="pm-matrix-row">
                                <div className="pm-perm-info">
                                  <div className="pm-perm-name">{formatPermissionKey(permKey)}</div>
                                  <div className="pm-perm-desc">{PERMISSION_DESCRIPTIONS[permKey]}</div>
                                </div>
                                <StateSelector
                                  value={(editingRole.permissions[permKey] as PermissionState) || 'INHERIT'}
                                  onChange={(state) => setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [permKey]: state } } as any)}
                                  disabled={(editingRole as any).isOwner}
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        className="pm-btn-primary"
                        onClick={handleSaveRole}
                        disabled={roleSaving || (editingRole as any).isOwner}
                      >
                        {roleSaving ? <Loader size={13} className="pm-spin" /> : <Save size={13} />}
                        {roleSaving ? 'Saving…' : 'Save Changes'}
                      </button>

                      {!isCreatingRole && !(editingRole as any).isOwner && (
                        <button
                          className="pm-btn-danger"
                          onClick={handleDeleteRole}
                          disabled={roleDeleting}
                        >
                          {roleDeleting ? <Loader size={13} className="pm-spin" /> : <Trash2 size={13} />}
                          Delete Role
                        </button>
                      )}

                      <button
                        className="pm-btn-secondary"
                        onClick={() => { setEditingRole(null); setSelectedRole(null); setIsCreatingRole(false); }}
                        disabled={roleSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ CATEGORY OVERRIDES TAB ════════════ */}
        {activeTab === 'category-overrides' && (
          <motion.div key="cat-overrides" {...fadeSlide}>
            <AnimatePresence>
              {catOverrideError && (
                <motion.div className="pm-error-banner" {...fadeSlide}>
                  <span>{catOverrideError}</span>
                  <button className="pm-error-dismiss" onClick={() => setCatOverrideError(null)}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pm-split">
              {/* Left: Category list */}
              <div className="pm-left">
                <div className="pm-panel-label">Categories</div>
                <div className="pm-entity-list">
                  {categories.length === 0 && (
                    <div className="pm-empty-state" style={{ padding: 20 }}><p>No categories found.</p></div>
                  )}
                  {categories.map((cat) => (
                    <div
                      key={cat.categoryId}
                      className={`pm-entity-item ${selectedCategoryId === cat.categoryId ? 'active' : ''}`}
                      onClick={() => { setSelectedCategoryId(cat.categoryId); setCatOverrideRoleId(''); }}
                    >
                      <Folder size={13} />
                      {cat.name}
                      {selectedCategoryId === cat.categoryId && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Override editor */}
              <div className="pm-right">
                {!selectedCategoryId ? (
                  <div className="pm-empty-state">
                    <Folder size={40} />
                    <h3>Select a category</h3>
                    <p>Choose a category to configure role-specific permission overrides.</p>
                  </div>
                ) : (
                  <div className="pm-override-section">
                    <div className="pm-override-header">
                      <h3>Overrides for: <span style={{ color: 'var(--purple-light, #c5a3ff)' }}>{categories.find(c => c.categoryId === selectedCategoryId)?.name}</span></h3>
                      {catOverrideLoading && <Loader size={14} className="pm-spin" />}
                    </div>

                    {/* Role selector */}
                    <div>
                      <div className="pm-panel-label" style={{ marginBottom: 8 }}>Select Role to Override</div>
                      <div className="pm-override-role-tabs">
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            className={`pm-override-role-btn ${catOverrideRoleId === role.id ? 'active' : ''}`}
                            onClick={() => setCatOverrideRoleId(role.id)}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: role.color, flexShrink: 0 }} />
                            {role.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!catOverrideRoleId ? (
                      <div className="pm-override-empty">Select a role above to configure overrides.</div>
                    ) : (
                      <>
                        <div className="pm-matrix-category">
                          <div className="pm-matrix-category-title"><Folder size={12} /> Category Permissions</div>
                          {PERMISSION_CATEGORIES.CATEGORIES.keys.map((permKey) => (
                            <div key={permKey} className="pm-matrix-row">
                              <div className="pm-perm-info">
                                <div className="pm-perm-name">{formatPermissionKey(permKey)}</div>
                                <div className="pm-perm-desc">{PERMISSION_DESCRIPTIONS[permKey]}</div>
                              </div>
                              <StateSelector
                                value={(localCatOverride[permKey] as PermissionState) || 'INHERIT'}
                                onChange={(state) => handleCatOverrideChange(permKey, state)}
                              />
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                          <button className="pm-btn-primary" onClick={handleCatOverrideSave} disabled={catOverrideSaving}>
                            {catOverrideSaving ? <Loader size={13} className="pm-spin" /> : <Save size={13} />}
                            {catOverrideSaving ? 'Saving…' : 'Save Override'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ CHANNEL OVERRIDES TAB ════════════ */}
        {activeTab === 'channel-overrides' && (
          <motion.div key="chan-overrides" {...fadeSlide}>
            <AnimatePresence>
              {chanOverrideError && (
                <motion.div className="pm-error-banner" {...fadeSlide}>
                  <span>{chanOverrideError}</span>
                  <button className="pm-error-dismiss" onClick={() => setChanOverrideError(null)}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Channel type toggle */}
            <div className="pm-channel-type-toggle">
              <button
                className={`pm-channel-type-btn ${channelType === 'text' ? 'active' : ''}`}
                onClick={() => { setChannelType('text'); setSelectedChannelId(''); setChanOverrideRoleId(''); }}
              >
                <Hash size={13} /> Text Channels
              </button>
              <button
                className={`pm-channel-type-btn ${channelType === 'voice' ? 'active' : ''}`}
                onClick={() => { setChannelType('voice'); setSelectedChannelId(''); setChanOverrideRoleId(''); }}
              >
                <Volume2 size={13} /> Voice Channels
              </button>
              <button
                className={`pm-channel-type-btn pm-channel-type-btn--task ${channelType === 'task' ? 'active' : ''}`}
                onClick={() => { setChannelType('task'); setSelectedChannelId(''); setChanOverrideRoleId(''); }}
              >
                <Rocket size={13} /> Task Manager
              </button>
              <button
                className={`pm-channel-type-btn pm-channel-type-btn--aihr ${channelType === 'ai-hr' ? 'active' : ''}`}
                onClick={() => { setChannelType('ai-hr'); setSelectedChannelId(''); setChanOverrideRoleId(''); }}
              >
                <Brain size={13} /> AI-HR
              </button>
            </div>

            <div className="pm-split">
              {/* Left: Channel list */}
              <div className="pm-left">
                <div className="pm-panel-label">
                  {channelType === 'text'  && 'Text'}
                  {channelType === 'voice' && 'Voice'}
                  {channelType === 'task'  && 'Task Manager'}
                  {channelType === 'ai-hr' && 'AI-HR'}
                  {' '}Channels
                </div>
                <div className="pm-entity-list">
                  {activeChannels.length === 0 && (
                    <div className="pm-empty-state" style={{ padding: 20 }}>
                      <p>
                        {channelType === 'task'  && 'No Task Manager channels found.'}
                        {channelType === 'ai-hr' && 'No AI-HR channels found.'}
                        {(channelType === 'text' || channelType === 'voice') && 'No channels found.'}
                      </p>
                    </div>
                  )}
                  {(activeChannels as any[]).map((ch) => (
                    <div
                      key={ch.roomId}
                      className={`pm-entity-item ${selectedChannelId === ch.roomId ? 'active' : ''}`}
                      onClick={() => { setSelectedChannelId(ch.roomId); setChanOverrideRoleId(''); }}
                    >
                      {channelType === 'text'  && <Hash size={13} />}
                      {channelType === 'voice' && <Volume2 size={13} />}
                      {channelType === 'task'  && <Rocket size={13} style={{ color: '#f59e0b' }} />}
                      {channelType === 'ai-hr' && <Brain size={13} style={{ color: '#8b5cf6' }} />}
                      {ch.name}
                      {selectedChannelId === ch.roomId && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Override editor */}
              <div className="pm-right">
                {!selectedChannelId ? (
                  <div className="pm-empty-state">
                    {channelType === 'text'  && <Hash size={40} />}
                    {channelType === 'voice' && <Volume2 size={40} />}
                    {channelType === 'task'  && <Rocket size={40} style={{ color: '#f59e0b', opacity: 0.5 }} />}
                    {channelType === 'ai-hr' && <Brain size={40} style={{ color: '#8b5cf6', opacity: 0.5 }} />}
                    <h3>Select a channel</h3>
                    <p>Choose a channel to configure role-specific permission overrides.</p>
                  </div>
                ) : (
                  <div className="pm-override-section">
                    <div className="pm-override-header">
                      <h3>
                        Overrides for:{' '}
                        <span style={{ color: 'var(--purple-light, #c5a3ff)' }}>
                          {(activeChannels as any[]).find((c) => c.roomId === selectedChannelId)?.name}
                        </span>
                        {channelType === 'task' && (
                          <span className="pm-channel-type-badge pm-channel-type-badge--task">
                            <Rocket size={10} /> Task Manager
                          </span>
                        )}
                        {channelType === 'ai-hr' && (
                          <span className="pm-channel-type-badge pm-channel-type-badge--aihr">
                            <Brain size={10} /> AI-HR
                          </span>
                        )}
                      </h3>
                      {chanOverrideLoading && <Loader size={14} className="pm-spin" />}
                    </div>

                    {/* Role selector */}
                    <div>
                      <div className="pm-panel-label" style={{ marginBottom: 8 }}>Select Role to Override</div>
                      <div className="pm-override-role-tabs">
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            className={`pm-override-role-btn ${chanOverrideRoleId === role.id ? 'active' : ''}`}
                            onClick={() => setChanOverrideRoleId(role.id)}
                          >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: role.color, flexShrink: 0 }} />
                            {role.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!chanOverrideRoleId ? (
                      <div className="pm-override-empty">Select a role above to configure overrides.</div>
                    ) : (
                      <>
                        {/* ── Text Channel permissions ── */}
                        {channelType === 'text' && (
                          <div className="pm-matrix-category">
                            <div className="pm-matrix-category-title"><Hash size={12} /> Text Channel Permissions</div>
                            {PERMISSION_CATEGORIES.TEXT_CHANNELS.keys.map((permKey) => (
                              <div key={permKey} className="pm-matrix-row">
                                <div className="pm-perm-info">
                                  <div className="pm-perm-name">{formatPermissionKey(permKey)}</div>
                                  <div className="pm-perm-desc">{PERMISSION_DESCRIPTIONS[permKey]}</div>
                                </div>
                                <StateSelector
                                  value={(localChanOverride[permKey] as PermissionState) || 'INHERIT'}
                                  onChange={(state) => handleChanOverrideChange(permKey, state)}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Voice Channel permissions ── */}
                        {channelType === 'voice' && (
                          <div className="pm-matrix-category">
                            <div className="pm-matrix-category-title"><Volume2 size={12} /> Voice Channel Permissions</div>
                            {PERMISSION_CATEGORIES.VOICE_CHANNELS.keys.map((permKey) => (
                              <div key={permKey} className="pm-matrix-row">
                                <div className="pm-perm-info">
                                  <div className="pm-perm-name">{formatPermissionKey(permKey)}</div>
                                  <div className="pm-perm-desc">{PERMISSION_DESCRIPTIONS[permKey]}</div>
                                </div>
                                <StateSelector
                                  value={(localChanOverride[permKey] as PermissionState) || 'INHERIT'}
                                  onChange={(state) => handleChanOverrideChange(permKey, state)}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Task Manager Channel permissions ── */}
                        {channelType === 'task' && (
                          <div className="pm-matrix-category pm-matrix-category--task">
                            <div className="pm-matrix-category-title" style={{ color: '#f59e0b' }}>
                              <Rocket size={12} /> Task Manager Permissions
                            </div>
                            <p className="pm-matrix-category-hint">
                              Controls what roles can do inside this specific Task Manager channel.
                            </p>
                            {PERMISSION_CATEGORIES.TASKS.keys.map((permKey) => (
                              <div key={permKey} className="pm-matrix-row">
                                <div className="pm-perm-info">
                                  <div className="pm-perm-name">{formatPermissionKey(permKey)}</div>
                                  <div className="pm-perm-desc">{PERMISSION_DESCRIPTIONS[permKey]}</div>
                                </div>
                                <StateSelector
                                  value={(localChanOverride[permKey] as PermissionState) || 'INHERIT'}
                                  onChange={(state) => handleChanOverrideChange(permKey, state)}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── AI-HR Channel permissions ── */}
                        {channelType === 'ai-hr' && (
                          <div className="pm-matrix-category pm-matrix-category--aihr">
                            <div className="pm-matrix-category-title" style={{ color: '#8b5cf6' }}>
                              <Brain size={12} /> AI-HR Permissions
                            </div>
                            <p className="pm-matrix-category-hint">
                              Controls which roles can interact with the AI-HR assistant in this channel.
                            </p>
                            {PERMISSION_CATEGORIES.AI_HR.keys.map((permKey) => (
                              <div key={permKey} className="pm-matrix-row">
                                <div className="pm-perm-info">
                                  <div className="pm-perm-name">{formatPermissionKey(permKey)}</div>
                                  <div className="pm-perm-desc">{PERMISSION_DESCRIPTIONS[permKey]}</div>
                                </div>
                                <StateSelector
                                  value={(localChanOverride[permKey] as PermissionState) || 'INHERIT'}
                                  onChange={(state) => handleChanOverrideChange(permKey, state)}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                          <button className="pm-btn-primary" onClick={handleChanOverrideSave} disabled={chanOverrideSaving}>
                            {chanOverrideSaving ? <Loader size={13} className="pm-spin" /> : <Save size={13} />}
                            {chanOverrideSaving ? 'Saving…' : 'Save Override'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ USER INSPECTOR TAB ════════════ */}
        {activeTab === 'inspector' && (
          <motion.div key="inspector" {...fadeSlide}>
            <AnimatePresence>
              {inspectorError && (
                <motion.div className="pm-error-banner" {...fadeSlide}>
                  <span>{inspectorError}</span>
                  <button className="pm-error-dismiss" onClick={() => setInspectorError(null)}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pm-inspector-search">
              <Search size={15} className="pm-inspector-search-icon" />
              <input
                type="text"
                placeholder="Search members by name or email…"
                value={inspectorSearch}
                onChange={(e) => setInspectorSearch(e.target.value)}
              />
            </div>

            <div className="pm-split">
              {/* Left: Member list */}
              <div className="pm-left">
                <div className="pm-panel-label">Members ({filteredMembers.length})</div>
                <div className="pm-member-list" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {globalLoading && <div className="pm-loading"><Loader size={14} className="pm-spin" /><span>Loading…</span></div>}
                  {!globalLoading && filteredMembers.length === 0 && (
                    <div className="pm-empty-state" style={{ padding: 20 }}>
                      <p>{inspectorSearch ? 'No members match your search.' : 'No members found.'}</p>
                    </div>
                  )}
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`pm-member-item ${inspectorMemberId === member.id ? 'selected' : ''}`}
                      onClick={() => handleInspectMember(member.id)}
                    >
                      <div className="pm-member-avatar">{member.username.charAt(0).toUpperCase()}</div>
                      <div className="pm-member-info">
                        <div className="pm-member-name">{member.username}</div>
                        {member.email && <div className="pm-member-email">{member.email}</div>}
                      </div>
                      {inspectorMemberId === member.id && <Eye size={13} style={{ color: 'var(--purple)', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Resolved permissions */}
              <div className="pm-right">
                {!inspectorMemberId ? (
                  <div className="pm-empty-state">
                    <Eye size={40} />
                    <h3>Select a member to inspect</h3>
                    <p>Choose a member to see their fully resolved permissions, including all role, category, and channel overrides.</p>
                  </div>
                ) : inspectorLoading ? (
                  <div className="pm-loading"><Loader size={18} className="pm-spin" /><span>Resolving permissions…</span></div>
                ) : resolvedPerms ? (
                  <>
                    {/* Member info header */}
                    {(() => {
                      const m = members.find((x) => x.id === inspectorMemberId);
                      const memberRoles = m?.roleId ? [roleById(m.roleId)].filter(Boolean) : [];
                      return m ? (
                        <div className="pm-inspector-profile">
                          <div className="pm-inspector-profile-bg"></div>
                          <div className="pm-inspector-profile-content">
                            <div className="pm-inspector-avatar">
                              {m.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="pm-inspector-details">
                              <h2 className="pm-inspector-username">{m.username}</h2>
                              <div className="pm-inspector-email">{m.email || 'No email provided'}</div>
                              <div className="pm-inspector-roles">
                                {memberRoles.length === 0 && <span className="pm-role-pill-empty">No roles assigned</span>}
                                {memberRoles.map((role: any) => (
                                  <span key={role.id} className="pm-role-pill" style={{ color: role.color, borderColor: `${role.color}44`, background: `${role.color}18` }}>
                                    {role.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="pm-resolved-table">
                      <div className="pm-resolved-header">
                        <div>Permission</div>
                        <div>State</div>
                        <div>Source</div>
                      </div>
                      <div className="pm-resolved-body">
                        {Object.entries(PERMISSION_CATEGORIES).map(([catKey, catDef]) => (
                          <React.Fragment key={catKey}>
                            <div className="pm-resolved-category-label">
                              {catDef.label}
                            </div>
                            {catDef.keys.map((permKey) => {
                              const rp = resolvedPerms[permKey];
                              if (!rp) return null;
                              return (
                                <div key={permKey} className="pm-resolved-row">
                                  <div className="pm-resolved-perm">
                                    <div className="pm-resolved-perm-name">{formatPermissionKey(permKey)}</div>
                                    <div className="pm-resolved-perm-desc">{PERMISSION_DESCRIPTIONS[permKey]}</div>
                                  </div>
                                  <div className="pm-resolved-state-col">
                                    <span className={`pm-state-badge pm-state-${rp.state.toLowerCase()}`}>
                                      {rp.state}
                                    </span>
                                  </div>
                                  <div className="pm-resolved-source-col">
                                    <span className={`pm-source-badge ${getSourceClass(rp.source)}`}>
                                      {getSourceLabel(rp.source)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="pm-inspector-legend">
                      <span className="pm-legend-title">Sources:</span>
                      {[
                        { cls: 'owner',    label: 'Owner — Bypasses all checks' },
                        { cls: 'admin',    label: 'Administrator — Grants all' },
                        { cls: 'channel',  label: 'Channel Override' },
                        { cls: 'category', label: 'Category Override' },
                        { cls: 'workspace',label: 'Workspace Role' },
                        { cls: 'default',  label: 'Default Deny' },
                      ].map(({ cls, label }) => (
                        <span key={cls} className={`pm-source-badge ${cls}`} style={{ fontSize: '0.7rem' }}>{label}</span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════ AUDIT LOG TAB ════════════ */}
        {activeTab === 'audit' && (
          <motion.div key="audit" {...fadeSlide}>
            <AnimatePresence>
              {auditError && (
                <motion.div className="pm-error-banner" {...fadeSlide}>
                  <span>{auditError}</span>
                  <button className="pm-error-dismiss" onClick={() => setAuditError(null)}>✕</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filters */}
            <div className="pm-audit-filters-container">
              <div className="pm-audit-filters">
                <div className="pm-audit-filter-group">
                  <span className="pm-audit-filter-label">From</span>
                  <input className="pm-audit-input" type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} />
                </div>
                <div className="pm-audit-filter-group">
                  <span className="pm-audit-filter-label">To</span>
                  <input className="pm-audit-input" type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} />
                </div>
                <div className="pm-audit-filter-actions">
                  <button className="pm-btn-secondary pm-audit-btn" onClick={loadAuditLogs} disabled={auditLoading}>
                    <RefreshCw size={13} className={auditLoading ? 'pm-spin' : ''} />
                    {auditLoading ? 'Loading…' : 'Refresh'}
                  </button>
                  {(auditFrom || auditTo) && (
                    <button className="pm-btn-icon pm-audit-clear-btn" onClick={() => { setAuditFrom(''); setAuditTo(''); }} title="Clear filters">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {auditLoading ? (
              <div className="pm-loading pm-audit-loading">
                <Loader size={24} className="pm-spin pm-glow-icon" />
                <span className="pm-glowing-text">Scanning Audit Trails…</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="pm-empty-state pm-audit-empty">
                <div className="pm-audit-empty-icon-wrapper">
                  <Clock size={48} className="pm-empty-icon" />
                </div>
                <h3 className="pm-audit-empty-title">Clean Slate</h3>
                <p className="pm-audit-empty-desc">No permission changes have been logged yet. The timeline awaits.</p>
              </div>
            ) : (
              <div className="pm-audit-timeline">
                {auditLogs.map((log) => (
                  <div key={log.logId} className="pm-audit-item" data-action={log.action}>
                    <div className="pm-audit-timeline-line"></div>
                    <div className="pm-audit-dot">
                      <Shield size={14} className="pm-audit-dot-icon" />
                    </div>
                    
                    <div className="pm-audit-card">
                      <div className="pm-audit-card-header">
                        <div className="pm-audit-identity">
                          <span className="pm-audit-actor">{log.actorName}</span>
                          <span className="pm-audit-action">{formatAction(log.action)}</span>
                          <span className="pm-audit-target">{log.targetName || log.targetId}</span>
                          <span className="pm-audit-target-type">{log.targetType}</span>
                        </div>
                        <div className="pm-audit-time-badge" title={new Date(log.createdAt).toLocaleString()}>
                          <Clock size={12} />
                          {timeAgo(log.createdAt)}
                        </div>
                      </div>

                      {log.changes && log.changes.length > 0 && (
                        <div className="pm-audit-changes">
                          {log.changes.slice(0, 6).map((change, i) => (
                            <div key={i} className={`pm-audit-change-chip pm-change-${change.after.toLowerCase()}`}>
                              <span className="pm-change-key">{formatPermissionKey(change.field)}</span>
                              <div className="pm-change-flow">
                                <span className="pm-change-val pm-before">{String(change.before)}</span>
                                <ChevronRight size={12} className="pm-change-arrow" />
                                <span className="pm-change-val pm-after">{String(change.after)}</span>
                              </div>
                            </div>
                          ))}
                          {log.changes.length > 6 && (
                            <div className="pm-audit-change-chip pm-change-more">
                              <span className="pm-change-more-text">+{log.changes.length - 6} more overrides</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          setShowUpgradeModal(true);
        }}
        resourceName="Roles"
      />

      {showUpgradeModal && (
        <UpgradeModal 
          onClose={() => setShowUpgradeModal(false)}
          onSuccess={async () => {
            await refetchSubscription();
            setShowUpgradeModal(false);
          }}
        />
      )}
    </div>
  );
};

export default PermissionsComponent;
