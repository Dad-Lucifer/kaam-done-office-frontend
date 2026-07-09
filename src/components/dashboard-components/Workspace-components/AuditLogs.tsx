import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, LogIn, Users, BarChart3, ChevronRight,
  RefreshCw, Download, Search, Calendar, AlertCircle,
  CheckCircle2, Activity, Zap, TrendingUp, Shield,
  ClipboardList, Timer, Target,
} from 'lucide-react';
import './AuditLogs.css';
import {
  fetchAttendanceLogs,
  fetchTaskActivity,
  type AttendanceRecord,
  type MemberTaskSummary,
} from '../../../api/auditLogs';
import { fetchMembers, type TeamMember } from '../../../api/members';

// ── Types ──────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'attendance' | 'tasks';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  isTeamMember: boolean;
}

interface AuditLogsProps {
  currentUser: CurrentUser | null;
}

const QUICK_PRESETS = [
  { label: 'Today',      days: 0  },
  { label: 'This Week',  days: 7  },
  { label: 'This Month', days: 30 },
];

const AVATAR_COLORS = ['violet','emerald','amber','rose','sky','indigo'];
function avatarColor(name: string) {
  const idx = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}
function avatarInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatDateStr(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}
function hoursClass(h: number | null) {
  if (h === null) return 'active';
  if (h >= 8) return 'high';
  if (h >= 4) return 'medium';
  return 'low';
}
function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function getPresetRange(days: number): { from: string; to: string } {
  const today = new Date();
  const from = days === 0 ? toISO(today) : toISO(new Date(today.getTime() - days * 86400000));
  return { from, to: toISO(today) };
}

// ── Main Component ─────────────────────────────────────────────────────────────

const AuditLogs: React.FC<AuditLogsProps> = ({ currentUser }) => {

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [taskActivity, setTaskActivity] = useState<MemberTaskSummary[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingAtt, setLoadingAtt] = useState(false);
  const [loadingTask, setLoadingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMemberId, setFilterMemberId] = useState('');
  const [activePreset, setActivePreset] = useState(1); // "This Week"
  const [dateFrom, setDateFrom] = useState(() => getPresetRange(7).from);
  const [dateTo, setDateTo] = useState(() => getPresetRange(7).to);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [spinning, setSpinning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadAttendance = useCallback(async () => {
    setLoadingAtt(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { dateFrom, dateTo, limit: 300 };
      if (filterMemberId) params.memberId = filterMemberId;
      const res = await fetchAttendanceLogs(params);
      setAttendance(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance.');
    } finally {
      setLoadingAtt(false);
    }
  }, [dateFrom, dateTo, filterMemberId]);

  const loadTasks = useCallback(async () => {
    setLoadingTask(true);
    try {
      const params: Record<string, string | number> = { limit: 200 };
      if (filterMemberId) params.memberId = filterMemberId;
      const res = await fetchTaskActivity(params);
      setTaskActivity(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load task activity.');
    } finally {
      setLoadingTask(false);
    }
  }, [filterMemberId]);

  const loadMembers = useCallback(async () => {
    try { setMembers(await fetchMembers()); } catch { /* non-fatal */ }
  }, []);

  const refresh = useCallback(async () => {
    setSpinning(true);
    await Promise.all([loadAttendance(), loadTasks()]);
    setTimeout(() => setSpinning(false), 600);
  }, [loadAttendance, loadTasks]);

  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Auto-refresh every 60s
  useEffect(() => {
    intervalRef.current = setInterval(refresh, 60000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh]);

  // ── Quick-date presets ─────────────────────────────────────────────────────

  const applyPreset = (idx: number, days: number) => {
    const { from, to } = getPresetRange(days);
    setDateFrom(from);
    setDateTo(to);
    setActivePreset(idx);
  };

  // ── Filtered attendance ────────────────────────────────────────────────────

  const filteredAttendance = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return attendance.filter(r =>
      !q || r.username.toLowerCase().includes(q)
    );
  }, [attendance, searchQuery]);

  const filteredTaskActivity = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return taskActivity.filter(m =>
      !q || m.username.toLowerCase().includes(q)
    );
  }, [taskActivity, searchQuery]);

  // ── Overview stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const activeSessions = attendance.filter(r => r.isActive).length;
    const completed = attendance.filter(r => !r.isActive && r.workingHours !== null);
    const totalHrs = completed.reduce((s, r) => s + (r.workingHours || 0), 0);
    const avgHrs = completed.length ? parseFloat((totalHrs / completed.length).toFixed(1)) : 0;

    // Top performer by total working hours
    const byMember: Record<string, number> = {};
    completed.forEach(r => {
      byMember[r.username] = (byMember[r.username] || 0) + (r.workingHours || 0);
    });
    const topEntry = Object.entries(byMember).sort((a, b) => b[1] - a[1])[0];
    const topPerformer = topEntry ? topEntry[0] : '—';

    const totalTasks = taskActivity.reduce((s, m) => s + m.taskCount, 0);
    const completedSubtasks = taskActivity.reduce((s, m) => s + m.completedSubtasks, 0);
    const totalSubtasks = taskActivity.reduce((s, m) => s + m.totalSubtasks, 0);

    return { activeSessions, completed: completed.length, avgHrs, topPerformer, totalHrs: parseFloat(totalHrs.toFixed(1)), totalTasks, completedSubtasks, totalSubtasks };
  }, [attendance, taskActivity]);

  // ── Export CSV ─────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const rows = [
      ['Member', 'Date', 'Day', 'Login Time', 'Logout Time', 'Working Hours', 'Status'],
      ...filteredAttendance.map(r => [
        r.username,
        r.date,
        r.dayOfWeek,
        formatTime(r.loginAt),
        formatTime(r.logoutAt),
        r.workingHours !== null ? r.workingHours.toString() : 'Active',
        r.isActive ? 'Active' : 'Completed',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-logs-${dateFrom}-${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabConfig: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview',   label: 'Overview',    icon: <BarChart3 size={15} /> },
    { id: 'attendance', label: 'Attendance',  icon: <Clock size={15} />,       count: filteredAttendance.length },
    { id: 'tasks',      label: 'Task Activity', icon: <ClipboardList size={15} />, count: filteredTaskActivity.length },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  // ── Admin-only guard ───────────────────────────────────────────────────────
  // Team members must never see audit logs. The backend already returns 403,
  // but we block at render time for instant UX and complete data isolation.
  if (!currentUser || currentUser.isTeamMember) {
    return (
      <div className="al-container">
        <motion.div
          className="al-access-denied"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="al-denied-icon">
            <Shield size={38} />
          </div>
          <h2 className="al-denied-title">Admin Access Only</h2>
          <p className="al-denied-sub">
            Audit Logs are restricted to workspace administrators.<br />
            Team members cannot view attendance or task activity records.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="al-container">
      {/* Header */}
      <div className="al-header">
        <div className="al-header-left">
          <h1 className="al-title">Audit Logs</h1>
          <p className="al-subtitle">Track attendance, working hours &amp; task activity for all team members</p>
        </div>
        <div className="al-header-actions">
          {/* Workspace identity badge — each admin sees only their own data */}
          <div className="al-workspace-badge">
            <div className={`al-avatar ${avatarColor(currentUser.name)} al-avatar-sm`}>
              {avatarInitials(currentUser.name)}
            </div>
            <div className="al-workspace-info">
              <span className="al-workspace-name">{currentUser.name}</span>
              <span className="al-workspace-role">Admin · Your workspace only</span>
            </div>
          </div>
          <button className={`al-icon-btn ${spinning ? 'spinning' : ''}`} onClick={refresh} title="Refresh">
            <RefreshCw size={17} />
          </button>
          <button className="al-export-btn" onClick={exportCSV}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div className="al-error-banner" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AlertCircle size={18} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="al-tabs">
        {tabConfig.map(tab => (
          <button
            key={tab.id}
            className={`al-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && <span className="al-tab-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="al-filters">
        {/* Quick presets */}
        <div className="al-quick-dates">
          {QUICK_PRESETS.map((p, i) => (
            <button
              key={p.label}
              className={`al-quick-btn ${activePreset === i ? 'active' : ''}`}
              onClick={() => applyPreset(i, p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="al-date-range">
          <Calendar size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="date"
            className="al-filter-date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setActivePreset(-1); }}
          />
          <span className="al-date-sep">→</span>
          <input
            type="date"
            className="al-filter-date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setActivePreset(-1); }}
          />
        </div>

        {/* Member filter */}
        {members.length > 0 && (
          <div className="al-filter-group">
            <Users size={14} className="al-filter-label" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <select
              className="al-filter-select"
              value={filterMemberId}
              onChange={e => setFilterMemberId(e.target.value)}
            >
              <option value="">All Members</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.username}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        {activeTab !== 'overview' && (
          <div className="al-search-wrap">
            <Search size={15} className="al-search-icon" />
            <input
              className="al-search-input"
              placeholder="Search member..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ── TAB: OVERVIEW ────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <div className="al-overview-grid">
              <div className="al-stat-card">
                <div className="al-stat-top">
                  <div className="al-stat-icon sky"><Activity size={20} /></div>
                  <span className={`al-stat-trend ${stats.activeSessions > 0 ? 'up' : 'neu'}`}>
                    {stats.activeSessions > 0 ? `${stats.activeSessions} live` : 'none'}
                  </span>
                </div>
                <div className="al-stat-value">{stats.activeSessions}</div>
                <div className="al-stat-label">Active Sessions</div>
              </div>

              <div className="al-stat-card">
                <div className="al-stat-top">
                  <div className="al-stat-icon violet"><Clock size={20} /></div>
                  <span className="al-stat-trend neu">{dateFrom} → {dateTo}</span>
                </div>
                <div className="al-stat-value">{stats.totalHrs}h</div>
                <div className="al-stat-label">Total Hours Logged</div>
              </div>

              <div className="al-stat-card">
                <div className="al-stat-top">
                  <div className="al-stat-icon emerald"><TrendingUp size={20} /></div>
                  <span className={`al-stat-trend ${stats.avgHrs >= 8 ? 'up' : stats.avgHrs >= 4 ? 'neu' : 'down'}`}>
                    {stats.avgHrs >= 8 ? '≥8h' : stats.avgHrs >= 4 ? '4–8h' : '<4h'}
                  </span>
                </div>
                <div className="al-stat-value">{stats.avgHrs}h</div>
                <div className="al-stat-label">Avg Hours / Session</div>
              </div>

              <div className="al-stat-card">
                <div className="al-stat-top">
                  <div className="al-stat-icon amber"><Shield size={20} /></div>
                  <span className="al-stat-trend up">Top</span>
                </div>
                <div className="al-stat-value" style={{ fontSize: '1.4rem', wordBreak: 'break-word' }}>{stats.topPerformer}</div>
                <div className="al-stat-label">Top Performer</div>
              </div>

              <div className="al-stat-card">
                <div className="al-stat-top">
                  <div className="al-stat-icon violet"><Target size={20} /></div>
                  <span className="al-stat-trend neu">{stats.totalTasks} tasks</span>
                </div>
                <div className="al-stat-value">{stats.completedSubtasks}<span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)' }}>/{stats.totalSubtasks}</span></div>
                <div className="al-stat-label">Subtasks Completed</div>
              </div>

              <div className="al-stat-card">
                <div className="al-stat-top">
                  <div className="al-stat-icon emerald"><CheckCircle2 size={20} /></div>
                  <span className={`al-stat-trend ${stats.completed > 0 ? 'up' : 'neu'}`}>{stats.completed} sessions</span>
                </div>
                <div className="al-stat-value">{stats.completed}</div>
                <div className="al-stat-label">Completed Sessions</div>
              </div>
            </div>

            {/* Mini attendance preview table */}
            <div className="al-table-wrap">
              <div className="al-table-header-row">
                <span className="al-table-title">Recent Activity</span>
                <span className="al-table-count">Last {Math.min(attendance.length, 10)} records</span>
              </div>
              <div className="al-table-scroll">
                <table className="al-table">
                  <thead><tr>
                    <th>Member</th><th>Date</th><th>Day</th><th>Login</th><th>Logout</th><th>Hours</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {attendance.slice(0, 10).map(r => (
                      <tr key={r.logId}>
                        <td>
                          <div className="al-member-cell">
                            <div className={`al-avatar ${avatarColor(r.username)}`}>{avatarInitials(r.username)}</div>
                            <span className="al-member-name">{r.username}</span>
                          </div>
                        </td>
                        <td>{r.date}</td>
                        <td><span className={`al-day-badge ${r.dayOfWeek.toLowerCase()}`}>{r.dayOfWeek}</span></td>
                        <td>
                          <div className="al-time-text">{formatTime(r.loginAt)}</div>
                          <div className="al-time-date">{formatDateStr(r.loginAt)}</div>
                        </td>
                        <td>
                          {r.logoutAt
                            ? <><div className="al-time-text">{formatTime(r.logoutAt)}</div><div className="al-time-date">{formatDateStr(r.logoutAt)}</div></>
                            : <span className="al-status-dot"><span className="al-dot online" />Still Active</span>}
                        </td>
                        <td>
                          <span className={`al-hours-badge ${hoursClass(r.workingHours)}`}>
                            {r.isActive ? <><Zap size={12} /> Active</> : <><Timer size={12} /> {r.workingHours}h</>}
                          </span>
                        </td>
                        <td>
                          <div className={`al-status-dot ${r.isActive ? '' : ''}`}>
                            <span className={`al-dot ${r.isActive ? 'online' : 'offline'}`} />
                            {r.isActive ? 'Online' : 'Completed'}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {attendance.length === 0 && !loadingAtt && (
                      <tr><td colSpan={7}>
                        <div className="al-empty" style={{ padding: '40px 20px' }}>
                          <div className="al-empty-icon"><Clock size={30} /></div>
                          <div className="al-empty-title">No attendance data</div>
                          <div className="al-empty-sub">Records will appear here once team members log in.</div>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB: ATTENDANCE ──────────────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            <div className="al-table-wrap">
              <div className="al-table-header-row">
                <span className="al-table-title">Attendance Records</span>
                <span className="al-table-count">{filteredAttendance.length} entries</span>
              </div>
              {loadingAtt ? (
                <div className="al-loader">
                  <div className="al-loader-ring" />
                  Loading attendance data…
                </div>
              ) : filteredAttendance.length === 0 ? (
                <div className="al-empty">
                  <div className="al-empty-icon"><LogIn size={30} /></div>
                  <div className="al-empty-title">No records found</div>
                  <div className="al-empty-sub">Try adjusting the date range or member filter. Records are created automatically when team members log in.</div>
                </div>
              ) : (
                <div className="al-table-scroll">
                  <table className="al-table">
                    <thead><tr>
                      <th>Member</th>
                      <th>Date</th>
                      <th>Day</th>
                      <th>Login Time</th>
                      <th>Logout Time</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr></thead>
                    <tbody>
                      {filteredAttendance.map((r, idx) => (
                        <motion.tr
                          key={r.logId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                        >
                          <td>
                            <div className="al-member-cell">
                              <div className={`al-avatar ${avatarColor(r.username)}`}>{avatarInitials(r.username)}</div>
                              <span className="al-member-name">{r.username}</span>
                            </div>
                          </td>
                          <td style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.88rem' }}>{r.date}</td>
                          <td><span className={`al-day-badge ${r.dayOfWeek.toLowerCase()}`}>{r.dayOfWeek}</span></td>
                          <td>
                            <div className="al-time-text">{formatTime(r.loginAt)}</div>
                          </td>
                          <td>
                            {r.logoutAt
                              ? <div className="al-time-text">{formatTime(r.logoutAt)}</div>
                              : <span className="al-status-dot"><span className="al-dot online" />Still Active</span>}
                          </td>
                          <td>
                            <span className={`al-hours-badge ${hoursClass(r.workingHours)}`}>
                              {r.isActive
                                ? <><Zap size={12} /> Live</>
                                : <><Timer size={12} /> {r.workingHours !== null ? `${r.workingHours}h` : '—'}</>
                              }
                            </span>
                          </td>
                          <td>
                            <div className="al-status-dot">
                              <span className={`al-dot ${r.isActive ? 'online' : 'offline'}`} />
                              <span style={{ color: r.isActive ? '#34d399' : 'rgba(255,255,255,0.5)', fontSize: '0.82rem' }}>
                                {r.isActive ? 'Online' : 'Completed'}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB: TASK ACTIVITY ───────────────────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <motion.div key="tasks" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
            {loadingTask ? (
              <div className="al-loader"><div className="al-loader-ring" />Loading task activity…</div>
            ) : filteredTaskActivity.length === 0 ? (
              <div className="al-empty">
                <div className="al-empty-icon"><ClipboardList size={30} /></div>
                <div className="al-empty-title">No task assignments</div>
                <div className="al-empty-sub">Assign tasks to team members in the Task Manager to see activity here.</div>
              </div>
            ) : (
              <div className="al-task-grid">
                {filteredTaskActivity.map((m, idx) => {
                  const isExpanded = expandedCards.has(m.memberId);
                  return (
                    <motion.div
                      key={m.memberId}
                      className={`al-member-card ${isExpanded ? 'expanded' : ''}`}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                    >
                      {/* Card header */}
                      <div className="al-card-header" onClick={() => toggleCard(m.memberId)}>
                        <div className="al-card-member">
                          <div className={`al-avatar ${avatarColor(m.username)}`} style={{ width: 44, height: 44, borderRadius: 14 }}>
                            {avatarInitials(m.username)}
                          </div>
                          <div className="al-card-meta">
                            <div className="al-card-name">{m.username}</div>
                            <div className="al-card-sub">
                               <span className="al-card-sub-pill">{m.taskCount} tasks assigned</span>
                               <span className="al-card-sub-pill">{m.completedSubtasks}/{m.totalSubtasks} subtasks done</span>
                            </div>
                          </div>
                        </div>

                        <div className="al-card-stats">
                          <div className="al-card-stat">
                            <div className="al-card-stat-value accent">{m.taskCount}</div>
                            <div className="al-card-stat-label">Tasks</div>
                          </div>
                          <div className="al-card-stat">
                            <div className="al-card-stat-value success">{m.completedSubtasks}</div>
                            <div className="al-card-stat-label">Done</div>
                          </div>
                          <div className="al-completion-wrapper">
                            <div className="al-completion-header">
                              <span className="al-completion-title">Progress</span>
                              <span className="al-completion-pct">{m.subtaskCompletionRate}%</span>
                            </div>
                            <div className="al-completion-bar-track">
                              <div
                                className="al-completion-bar-fill"
                                style={{ width: `${m.subtaskCompletionRate}%` }}
                              />
                            </div>
                          </div>
                          <div className={`al-card-expand-btn ${isExpanded ? 'open' : ''}`}>
                            <ChevronRight size={18} />
                          </div>
                        </div>
                      </div>

                      {/* Expandable task list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="al-task-list">
                              <div className="al-task-section">
                                <h4 className="al-task-list-heading">Assigned Tasks</h4>
                                {m.tasksAssigned.length === 0 ? (
                                  <p className="al-empty-sub" style={{ margin: '10px 15px', fontSize: '0.8rem' }}>No tasks assigned.</p>
                                ) : (
                                  m.tasksAssigned.map(task => (
                                    <div key={task.taskId} className="al-task-item">
                                      <div className="al-task-item-content">
                                        <div className="al-task-title">{task.title}</div>
                                        <div className="al-task-meta">
                                          <span className={`al-chip status-${task.status}`}>{task.status.replace('_', ' ')}</span>
                                          <span className={`al-chip prio-${task.priority}`}>{task.priority}</span>
                                          {task.subtasks.total > 0 && (
                                            <span className="al-subtask-chip">
                                              <CheckCircle2 size={12} />
                                              <strong>{task.subtasks.completed}</strong>/{task.subtasks.total} subtasks
                                            </span>
                                          )}
                                          {task.dueDate && (
                                            <span className="al-subtask-chip">
                                              <Calendar size={12} />{task.dueDate.slice(0, 10)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="al-progress-mini">
                                        <div className="al-progress-mini-track">
                                          <div className="al-progress-mini-fill" style={{ width: `${task.progress}%` }} />
                                        </div>
                                        <span className="al-progress-mini-pct">{task.progress}%</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>

                              {m.recentCompletions && m.recentCompletions.length > 0 && (
                                <div className="al-task-section">
                                  <h4 className="al-task-list-heading success">Recent Subtask Completions</h4>
                                  {m.recentCompletions.map((comp, i) => (
                                    <div key={comp.logId || i} className="al-recent-completion">
                                      <div className="al-recent-icon">
                                        <CheckCircle2 size={18} />
                                      </div>
                                      <div className="al-recent-content">
                                        <div className="al-recent-title">
                                          {comp.subtaskTitle}
                                        </div>
                                        <div className="al-recent-meta">
                                          <span className="al-recent-meta-item">
                                            Task: <strong style={{ color: '#fff', marginLeft: 4 }}>{comp.taskTitle}</strong>
                                          </span>
                                          <span className="al-recent-meta-item" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                            • {new Date(comp.completedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AuditLogs;
