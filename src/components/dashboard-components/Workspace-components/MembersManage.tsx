import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, MoreVertical, X, Users, Eye, EyeOff, Trash2, Loader, RefreshCw, Edit2, Check, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './MembersManage.css';

import {
  fetchMembers,
  createMember as apiCreateMember,
  updateMember as apiUpdateMember,
  deleteMember as apiDeleteMember,
  type TeamMember,
} from '../../../api/members';

import { fetchRoles, type Role } from '../../../api/roles';
import { useSubscription } from '../../../context/SubscriptionContext';
import SubscriptionLimitModal from '../SubscriptionLimitModal';
import UpgradeModal from '../UpgradeModal';

// ─── MembersManage ────────────────────────────────────────────────────────────

const MembersManage: React.FC = () => {
  // ── Data state ────────────────────────────────────────────────────────────
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  // ── Async state ───────────────────────────────────────────────────────────
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { canCreate, refetch: refetchSubscription } = useSubscription();

  // Inline role-edit state
  const [editingRoleFor, setEditingRoleFor] = useState<string | null>(null); // memberId
  const [editRoleId, setEditRoleId] = useState<string>('');

  // ── Create-user form state ────────────────────────────────────────────────
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');   // displayed only — not sent to backend (no auth for team members yet)
  const [selectedRoleId, setSelectedRoleId] = useState('');

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.');
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const data = await fetchRoles();
      setRoles(data);
    } catch {
      // Non-fatal — roles section just shows "no roles"
      setRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
    loadRoles();
  }, [loadMembers, loadRoles]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const roleById = (id: string | null) => roles.find((r) => r.id === id) ?? null;

  const resetCreateForm = () => {
    setNewUsername('');
    setNewEmail('');
    setNewPassword('');
    setSelectedRoleId('');
    setShowPassword(false);
    setIsCreatingUser(false);
  };

  // ── Create member ─────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;

    if (!canCreate('teamMember')) {
      setShowLimitModal(true);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const role = roleById(selectedRoleId);
      const created = await apiCreateMember({
        username: newUsername.trim(),
        password: newPassword,
        email: newEmail.trim() || undefined,
        roleId: role?.id ?? null,
        roleName: role?.name ?? null,
      });
      setMembers((prev) => [...prev, created]);
      resetCreateForm();
      refetchSubscription();
    } catch (err: any) {
      if (err?.response?.status === 402) {
        setShowLimitModal(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create member.');
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Delete member ─────────────────────────────────────────────────────────
  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Remove this member? This cannot be undone.')) return;
    setDeletingId(memberId);
    setError(null);
    try {
      await apiDeleteMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Inline role reassign ──────────────────────────────────────────────────
  const startEditRole = (member: TeamMember) => {
    setEditingRoleFor(member.id);
    setEditRoleId(member.roleId ?? '');
  };

  const confirmEditRole = async (memberId: string) => {
    const role = roleById(editRoleId);
    try {
      const updated = await apiUpdateMember(memberId, {
        roleId: role?.id ?? null,
        roleName: role?.name ?? null,
      });
      setMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setEditingRoleFor(null);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredMembers = members.filter((m) =>
    m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingMembers || loadingRoles;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="mm-container">
      {/* ── Error banner ── */}
      {error && (
        <div className="mm-error-banner" role="alert">
          <span>{error}</span>
          <button className="mm-error-dismiss" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="mm-header">
        <div>
          <h1 className="mm-title">Server Members</h1>
          <p className="mm-subtitle">Manage users, assign roles, and moderate access to your workspace.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="mm-btn-secondary mm-btn-icon"
            onClick={() => { loadMembers(); loadRoles(); }}
            title="Refresh"
            disabled={isLoading}
          >
            <RefreshCw size={15} className={isLoading ? 'mm-spin' : ''} />
          </button>
          <button className="mm-btn-primary" onClick={() => setIsCreatingUser(true)}>
            <UserPlus size={16} />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* ════════════ CREATE USER MODAL ════════════ */}
      <AnimatePresence>
        {isCreatingUser && (
          <motion.div 
            className="mm-modal-overlay" 
            onClick={(e) => e.target === e.currentTarget && resetCreateForm()}
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="mm-modal"
              initial={{ opacity: 0, y: 40, scale: 0.95, rotateX: 10 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="mm-modal-header mm-creative-header">
                <div className="mm-modal-title-wrap">
                  <div className="mm-creative-icon-wrap">
                    <UserPlus size={28} className="mm-creative-icon" />
                  </div>
                  <div>
                    <h2>Enlist Member</h2>
                    <p>Grant a new operative access to the workspace</p>
                  </div>
                </div>
                <button className="mm-modal-close" onClick={resetCreateForm}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="mm-modal-form">
                <div className="mm-creative-grid">
                  {/* Avatar Preview */}
                  <div className="mm-creative-avatar">
                    <div className="mm-avatar-preview">
                      {newUsername ? newUsername.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="mm-avatar-glow"></div>
                  </div>

                  <div className="mm-creative-inputs">
                    {/* Username */}
                    <motion.div 
                      className="mm-form-group"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <label className="mm-label">Username <span className="mm-required">*</span></label>
                      <input
                        type="text"
                        className="mm-input"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g. shadow_blade"
                        required
                        autoFocus
                      />
                    </motion.div>

                    {/* Email (optional) */}
                    <motion.div 
                      className="mm-form-group"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <label className="mm-label">Email <span className="mm-optional">(optional)</span></label>
                      <input
                        type="email"
                        className="mm-input"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="operative@mainframe.com"
                      />
                    </motion.div>

                    {/* Password */}
                    <motion.div 
                      className="mm-form-group"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label className="mm-label">Security Key <span className="mm-required">*</span></label>
                      <div className="mm-password-input-wrapper">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="mm-input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Passcode (min 6 chars)"
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          className="mm-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </motion.div>

                    {/* Assign Role */}
                    <motion.div 
                      className="mm-form-group"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <label className="mm-label">Clearance Level <span className="mm-optional">(optional)</span></label>
                      <div className="mm-role-wrapper">
                        <Shield size={16} className="mm-role-shield" />
                        {loadingRoles ? (
                          <div className="mm-no-roles"><Loader size={14} className="mm-spin" /> Scanning clearance levels…</div>
                        ) : roles.length > 0 ? (
                          <select
                            className="mm-select mm-select-with-icon"
                            value={selectedRoleId}
                            onChange={(e) => setSelectedRoleId(e.target.value)}
                          >
                            <option value="">Civilian (No Role)</option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="mm-no-roles">
                            <span>⚠ No roles found. Create roles in the Roles tab first.</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>

                <motion.div 
                  className="mm-modal-footer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <button type="button" className="mm-btn-secondary" onClick={resetCreateForm} disabled={saving}>
                    Abort
                  </button>
                  <button type="submit" className="mm-btn-primary" disabled={saving}>
                    {saving
                      ? <><Loader size={14} className="mm-spin" style={{ marginRight: 6 }} />Authorizing…</>
                      : <><UserPlus size={14} />Authorize Access</>}
                  </button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar ── */}
      <div className="mm-toolbar">
        <div className="mm-search">
          <Search size={16} className="mm-search-icon" />
          <input
            type="text"
            placeholder="Search members"
            className="mm-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {!isLoading && (
          <span className="mm-count">{filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Members list ── */}
      <div className="mm-list">
        <div className="mm-list-header">
          <div className="mm-col-name">NAME</div>
          <div className="mm-col-id">USER ID</div>
          <div className="mm-col-role">ROLE</div>
          <div className="mm-col-actions"></div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="mm-loading">
            <Loader size={20} className="mm-spin" />
            <span>Loading members…</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredMembers.length === 0 && (
          <div className="mm-empty-state">
            <div className="mm-empty-icon">
              <Users size={32} />
            </div>
            <h3>{searchQuery ? 'No members match your search.' : 'No members yet'}</h3>
            {!searchQuery && <p>Click "Create User" to add members to your workspace.</p>}
          </div>
        )}

        {/* Member rows */}
        {!isLoading && filteredMembers.map((member) => (
          <div key={member.id} className="mm-list-item">
            {/* Avatar + name */}
            <div className="mm-col-name">
              <div className="mm-avatar">{member.username.charAt(0).toUpperCase()}</div>
              <div className="mm-name-group">
                <span className="mm-username">{member.username}</span>
                {member.email && <span className="mm-email">{member.email}</span>}
              </div>
            </div>

            {/* Short ID */}
            <div className="mm-col-id">
              <span className="mm-badge" title={member.id}>{member.id.slice(0, 8).toUpperCase()}</span>
            </div>

            {/* Role — inline edit */}
            <div className="mm-col-role">
              {editingRoleFor === member.id ? (
                <div className="mm-role-edit-row">
                  <select
                    className="mm-select mm-role-select"
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(e.target.value)}
                    autoFocus
                  >
                    <option value="">No role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <button
                    className="mm-action-btn mm-confirm-btn"
                    title="Confirm"
                    onClick={() => confirmEditRole(member.id)}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="mm-action-btn"
                    title="Cancel"
                    onClick={() => setEditingRoleFor(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  className={`mm-role-badge ${!member.roleName ? 'mm-role-badge--none' : ''}`}
                  onClick={() => startEditRole(member)}
                  title="Click to change role"
                  style={member.roleId ? {
                    borderColor: `${roleById(member.roleId)?.color ?? '#9b5de5'}55`,
                    color: roleById(member.roleId)?.color ?? '#d1b3ff',
                    backgroundColor: `${roleById(member.roleId)?.color ?? '#9b5de5'}18`,
                  } : {}}
                >
                  <Edit2 size={11} style={{ marginRight: 4, opacity: 0.6 }} />
                  {member.roleName ?? 'No Role'}
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="mm-col-actions">
              <button
                className="mm-action-btn mm-action-btn--delete"
                title="Remove member"
                disabled={deletingId === member.id}
                onClick={() => handleDeleteMember(member.id)}
              >
                {deletingId === member.id
                  ? <Loader size={14} className="mm-spin" />
                  : <Trash2 size={14} />}
              </button>
              <button className="mm-action-btn" onClick={(e) => e.stopPropagation()}>
                <MoreVertical size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          setShowUpgradeModal(true);
        }}
        resourceName="Team Members"
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

export default MembersManage;
