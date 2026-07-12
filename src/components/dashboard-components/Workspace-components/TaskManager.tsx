import React, {
  useState, useEffect, useCallback, useMemo, useRef, memo,
} from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Plus, Search, Filter, LayoutGrid, Columns, BarChart2,
  Flag, Clock, Users, Tag, Calendar, ChevronDown, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Zap, Target, Activity,
  Trash2, Edit2, X, Send, Play, Square,
  Paperclip, MessageSquare, Award, Shield,
  Eye, RefreshCw, Loader, ArrowRight, Lock, Unlock, Star, Rocket,
  Maximize2, Minimize2,
} from 'lucide-react';
import './TaskManager.css';
import {
  useTasks, useTask, useTaskActions, useTaskTimer,
  useTaskAnalytics, useTaskSearch, formatDuration, isOverdue,
  calcSubtaskProgress,
} from '../../../hooks/useTaskManager';
import { fetchMembers, type TeamMember } from '../../../api/members';
import { fetchRoles, type Role } from '../../../api/roles';
import type { Task, TaskStatus, TaskPriority, Subtask, TaskComment, ActivityLog } from '../../../api/tasks';

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = 'mission' | 'Drag' | 'analytics';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  isTeamMember: boolean;
}

interface TaskManagerProps {
  currentUser: CurrentUser | null;
  channelId: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  BACKLOG:     { label: 'Backlog',     color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: <Circle size={12} /> },
  PLANNED:     { label: 'Planned',     color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  icon: <Target size={12} /> },
  ASSIGNED:    { label: 'Assigned',    color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', icon: <Users size={12} /> },
  IN_PROGRESS: { label: 'In Progress', color: '#7C3AED', bg: 'rgba(124,58,237,0.18)',  icon: <Zap size={12} /> },
  REVIEW:      { label: 'Review',      color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  icon: <Eye size={12} /> },
  BLOCKED:     { label: 'Blocked',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   icon: <AlertCircle size={12} /> },
  COMPLETED:   { label: 'Completed',   color: '#10B981', bg: 'rgba(16,185,129,0.12)',  icon: <CheckCircle2 size={12} /> },
  CANCELLED:   { label: 'Cancelled',   color: '#374151', bg: 'rgba(55,65,81,0.12)',    icon: <X size={12} /> },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; glow: string }> = {
  CRITICAL: { label: 'Critical', color: '#FF3B3B', glow: 'rgba(255,59,59,0.4)' },
  HIGH:     { label: 'High',     color: '#FF7A00', glow: 'rgba(255,122,0,0.35)' },
  MEDIUM:   { label: 'Medium',   color: '#7C3AED', glow: 'rgba(124,58,237,0.3)' },
  LOW:      { label: 'Low',      color: '#10B981', glow: 'rgba(16,185,129,0.25)' },
};

const ORDERED_STATUSES: TaskStatus[] = [
  'BACKLOG','PLANNED','ASSIGNED','IN_PROGRESS','REVIEW','BLOCKED','COMPLETED','CANCELLED',
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  TASK_CREATED:      <Rocket size={12} className="text-purple-400" />,
  TASK_UPDATED:      <Edit2 size={12} className="text-blue-400" />,
  STATUS_CHANGED:    <ArrowRight size={12} className="text-amber-400" />,
  TASK_ASSIGNED:     <Users size={12} className="text-green-400" />,
  COMMENT_ADDED:     <MessageSquare size={12} className="text-sky-400" />,
  SUBTASK_CREATED:   <Plus size={12} className="text-violet-400" />,
  SUBTASK_COMPLETED: <CheckCircle2 size={12} className="text-green-400" />,
  FILE_UPLOADED:     <Paperclip size={12} className="text-orange-400" />,
  TIMER_STARTED:     <Play size={12} className="text-green-400" />,
  TIMER_STOPPED:     <Square size={12} className="text-red-400" />,
};

// ── Sub-components ────────────────────────────────────────────────────────────

// Progress Ring
const ProgressRing = memo(({ progress, size = 48, strokeWidth = 3, color = '#7C3AED' }: {
  progress: number; size?: number; strokeWidth?: number; color?: string;
}) => {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} className="progress-ring" viewBox={`0 0 ${size} ${size}`}>
      <circle className="progress-ring-track" cx={size/2} cy={size/2} r={r} />
      <circle
        className="progress-ring-fill"
        cx={size/2} cy={size/2} r={r}
        stroke={color}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
      />
      <text
        x={size/2} y={size/2}
        textAnchor="middle" dominantBaseline="middle"
        fill="white" fontSize={size < 48 ? 8 : 11} fontWeight={700}
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {progress}%
      </text>
    </svg>
  );
});

// Status Badge
const StatusBadge = memo(({ status }: { status: TaskStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="status-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.icon}{cfg.label}
    </span>
  );
});

// Priority Indicator
const PriorityDot = memo(({ priority }: { priority: TaskPriority }) => {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: cfg.color }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.glow}` }} />
      {cfg.label}
    </span>
  );
});

// Avatar Stack
const AvatarStack = memo(({ userIds, members, max = 3 }: { userIds: string[]; members: TeamMember[]; max?: number }) => {
  const shown = userIds.slice(0, max);
  const extra = userIds.length - max;
  return (
    <div className="avatar-stack-container">
      {shown.map((uid, i) => {
        const m = members.find(m => m.id === uid);
        const letter = (m?.username || uid || '?')[0].toUpperCase();
        return (
          <div key={uid} className="avatar-stack-item w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-violet-400 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ zIndex: shown.length - i }}>
            {letter}
          </div>
        );
      })}
      {extra > 0 && (
        <div className="avatar-stack-item w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/80 backdrop-blur-md z-0">
          +{extra}
        </div>
      )}
    </div>
  );
});

// Skeleton Card
const SkeletonCard = () => (
  <div className="glass rounded-2xl p-4 space-y-3">
    <div className="skeleton h-4 w-3/4" />
    <div className="skeleton h-3 w-1/2" />
    <div className="flex items-center justify-between mt-2">
      <div className="skeleton h-5 w-16 rounded-full" />
      <div className="skeleton h-8 w-8 rounded-full" />
    </div>
  </div>
);

// ── Mission Card ──────────────────────────────────────────────────────────────

const MissionCard = memo(({ task, members, onClick, onStatusChange, dragging }: {
  task: Task;
  members: TeamMember[];
  onClick: () => void;
  onStatusChange: (status: TaskStatus) => void;
  dragging?: boolean;
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const overdue = isOverdue(task);
  const priCfg = PRIORITY_CONFIG[task.priority];
  const progress = task.progress || calcSubtaskProgress(task.subtasks);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`mission-card p-4 cursor-pointer group ${dragging ? 'drag-ghost' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowStatusMenu(false); }}
      onClick={onClick}
    >
      {/* Priority stripe */}
      <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-70"
        style={{ background: `linear-gradient(90deg, ${priCfg.color}, transparent)` }} />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PriorityDot priority={task.priority} />
            {task.visibility === 'PRIVATE' && <Lock size={11} className="text-amber-400 flex-shrink-0" />}
            {overdue && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">OVERDUE</span>}
          </div>
          <h3 className="text-[14px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-purple-200 transition-colors">
            {task.title}
          </h3>
        </div>
        {/* Progress Ring */}
        <div className="flex-shrink-0 relative">
          <ProgressRing progress={progress} size={44} color={priCfg.color} />
        </div>
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag-pill px-1.5 py-0.5 rounded-md text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20">
              #{tag}
            </span>
          ))}
          {task.tags.length > 3 && <span className="text-[10px] text-white/30">+{task.tags.length - 3}</span>}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        {/* Status badge — click to change */}
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowStatusMenu(v => !v); }}
            className="hover:opacity-80 transition-opacity"
          >
            <StatusBadge status={task.status} />
          </button>
          <AnimatePresence>
            {showStatusMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                className="absolute top-full left-0 mt-1 z-50 glass rounded-xl py-1 min-w-[140px] shadow-2xl border border-white/10"
                onClick={e => e.stopPropagation()}
              >
                {ORDERED_STATUSES.map(s => (
                  <button key={s} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors text-left"
                    onClick={() => { onStatusChange(s); setShowStatusMenu(false); }}>
                    <StatusBadge status={s} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {/* Assignees */}
          {task.assignedUsers.length > 0 && (
            <AvatarStack userIds={task.assignedUsers} members={members} />
          )}
          {/* Due date */}
          {task.dueDate && (
            <span className={`text-[11px] flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-white/40'}`}>
              <Calendar size={10} />
              {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {/* Time tracked */}
          {task.trackedHours > 0 && (
            <span className="text-[11px] text-white/40 flex items-center gap-1">
              <Clock size={10} />{task.trackedHours}h
            </span>
          )}
        </div>
      </div>

      {/* Hover quick stats */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/05 flex items-center justify-between text-[11px] text-white/40">
              <span className="flex items-center gap-1"><MessageSquare size={10} />{task.comments.length}</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={10} />{task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
              <span className="flex items-center gap-1"><Paperclip size={10} />{task.attachments.length}</span>
              <span className="flex items-center gap-1"><Activity size={10} />{task.activityLogs.length} events</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// ── Subtask Tree ──────────────────────────────────────────────────────────────

const SubtaskItem = memo(({ subtask, depth, taskId, onToggle, onAdd }: {
  subtask: Subtask; depth: number; taskId: string;
  onToggle: (subtaskId: string, completed: boolean) => void;
  onAdd: (parentSubtaskId: string) => void;
}) => {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const hasChildren = subtask.subtasks && subtask.subtasks.length > 0;

  return (
    <div className={depth > 0 ? 'ml-5 subtask-indent' : ''}>
      <div className="flex items-center gap-2 py-1.5 group/st">
        <button onClick={() => onToggle(subtask.subtaskId, !subtask.completed)}
          className="text-white/40 hover:text-purple-400 transition-colors flex-shrink-0">
          {subtask.completed
            ? <CheckCircle2 size={15} className="text-green-400" />
            : <Circle size={15} />}
        </button>
        {hasChildren && (
          <button onClick={() => setExpanded(v => !v)} className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        <span className={`text-[13px] flex-1 ${subtask.completed ? 'line-through text-white/30' : 'text-white/80'}`}>
          {subtask.title}
        </span>
        <button onClick={() => setAdding(v => !v)}
          className="opacity-0 group-hover/st:opacity-100 text-white/30 hover:text-purple-400 transition-all">
          <Plus size={12} />
        </button>
      </div>
      {adding && (
        <div className="ml-7 flex items-center gap-2 py-1">
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Subtask title…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[12px] text-white outline-none focus:border-purple-500/50"
            onKeyDown={e => {
              if (e.key === 'Enter' && newTitle.trim()) { onAdd(subtask.subtaskId); setAdding(false); setNewTitle(''); }
              if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
            }} />
        </div>
      )}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {subtask.subtasks.map(child => (
              <SubtaskItem key={child.subtaskId} subtask={child} depth={depth + 1} taskId={taskId} onToggle={onToggle} onAdd={onAdd} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── Activity Timeline ─────────────────────────────────────────────────────────

const ActivityTimeline = memo(({ logs }: { logs: ActivityLog[] }) => {
  const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 30);
  return (
    <div className="space-y-0">
      {sorted.map((log, i) => (
        <div key={log.logId} className="relative flex gap-3 pb-4">
          {i < sorted.length - 1 && <div className="activity-line" />}
          <div className="w-6 h-6 rounded-full glass flex items-center justify-center flex-shrink-0 z-10 border border-white/08">
            {ACTIVITY_ICONS[log.type] || <Activity size={11} className="text-white/40" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[12px] text-white/70 leading-snug">
              <span className="font-medium text-white/90">{log.actorName}</span>
              {' '}{formatActivityMessage(log)}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      ))}
      {sorted.length === 0 && (
        <p className="text-[12px] text-white/30 text-center py-4">No activity yet</p>
      )}
    </div>
  );
});

function formatActivityMessage(log: ActivityLog): string {
  switch (log.type) {
    case 'TASK_CREATED':      return 'created this mission';
    case 'TASK_UPDATED':      return 'updated task details';
    case 'STATUS_CHANGED':    return `changed status from ${log.data.from} → ${log.data.to}`;
    case 'TASK_ASSIGNED':     return 'updated assignees';
    case 'COMMENT_ADDED':     return 'posted a comment';
    case 'SUBTASK_CREATED':   return `created subtask "${log.data.title}"`;
    case 'SUBTASK_COMPLETED': return 'completed a subtask';
    case 'SUBTASK_REOPENED':  return 'reopened a subtask';
    case 'FILE_UPLOADED':     return `uploaded "${log.data.fileName}"`;
    case 'TIMER_STARTED':     return 'started time tracking';
    case 'TIMER_STOPPED':     return `stopped timer (${log.data.trackedHours}h tracked)`;
    default:                  return log.type.replace(/_/g, ' ').toLowerCase();
  }
}

// ── Discussion Feed ───────────────────────────────────────────────────────────

const DiscussionFeed = memo(({ comments, members: _members, currentUser, taskId: _taskId, onAdd, onDelete }: {
  comments: TaskComment[]; members: TeamMember[]; currentUser: CurrentUser | null;
  taskId: string;
  onAdd: (content: string) => void;
  onDelete: (commentId: string) => void;
}) => {
  const [draft, setDraft] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [comments.length]);

  const sorted = [...comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="flex flex-col h-full">
      <div ref={feedRef} className="flex-1 overflow-y-auto discussion-scrollbar space-y-3 pr-1">
        {sorted.map(c => {
          const isOwn = c.authorId === currentUser?.id;
          return (
            <motion.div key={c.commentId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="group flex gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-violet-400 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5">
                {(c.authorName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[12px] font-semibold text-white/90">{c.authorName}</span>
                  <span className="text-[10px] text-white/30">
                    {new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="glass-light rounded-xl rounded-tl-none px-3 py-2 text-[13px] text-white/80 leading-relaxed">
                  {c.content}
                </div>
              </div>
              {isOwn && (
                <button onClick={() => onDelete(c.commentId)}
                  className="opacity-0 group-hover:opacity-100 mt-1 text-white/20 hover:text-red-400 transition-all flex-shrink-0">
                  <Trash2 size={12} />
                </button>
              )}
            </motion.div>
          );
        })}
        {sorted.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={28} className="text-white/15 mx-auto mb-2" />
            <p className="text-[12px] text-white/30">No messages yet. Start the discussion.</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex items-end gap-2 flex-shrink-0">
        <div className="flex-1 glass-light rounded-xl px-3 py-2 flex items-end gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Write a message…"
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-white outline-none resize-none placeholder-white/30 leading-relaxed"
            style={{ maxHeight: 120 }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && draft.trim()) {
                e.preventDefault();
                onAdd(draft.trim());
                setDraft('');
              }
            }}
          />
        </div>
        <button
          onClick={() => { if (draft.trim()) { onAdd(draft.trim()); setDraft(''); } }}
          disabled={!draft.trim()}
          className="w-9 h-9 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Send size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
});

// ── Timer Control ─────────────────────────────────────────────────────────────

const TimerControl = memo(({ taskId, trackedTime, trackedHours }: {
  taskId: string; trackedTime: Task['trackedTime']; trackedHours: number;
}) => {
  const myId = sessionStorage.getItem('memberId') || '';
  const activeSession = trackedTime.find(s => s.memberId === myId && !s.stoppedAt) || null;
  const { isRunning, elapsedMs, isLoading, handleStart, handleStop } = useTaskTimer(taskId, activeSession);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isRunning && <span className="timer-dot" />}
        <span className={`text-[14px] font-mono font-semibold ${isRunning ? 'text-green-400 timer-active' : 'text-white/60'}`}>
          {formatDuration(elapsedMs)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <button onClick={handleStart} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 rounded-lg text-[12px] text-green-400 font-medium transition-colors disabled:opacity-40">
            {isLoading ? <Loader size={12} className="animate-spin" /> : <Play size={12} />}
            Start
          </button>
        ) : (
          <button onClick={handleStop} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-lg text-[12px] text-red-400 font-medium transition-colors disabled:opacity-40">
            {isLoading ? <Loader size={12} className="animate-spin" /> : <Square size={12} />}
            Stop
          </button>
        )}
      </div>
      <span className="text-[12px] text-white/40 flex items-center gap-1">
        <Clock size={11} />{trackedHours}h total
      </span>
    </div>
  );
});

// ── Task Detail Panel ─────────────────────────────────────────────────────────

const TaskDetailPanel = memo(({ taskId, members, roles, currentUser, onClose, onTaskUpdated, isExpanded, onToggleExpand }: {
  taskId: string;
  members: TeamMember[];
  roles: Role[];
  currentUser: CurrentUser | null;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) => {
  const { task, isLoading, error, refetch, setTask } = useTask(taskId);
  const { setStatus, postComment, removeComment, toggleSubtask, addSubtask } = useTaskActions(
    t => { setTask(t); onTaskUpdated(t); }, undefined
  );

  const [activeTab, setActiveTab] = useState<'discussion' | 'activity'>('discussion');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [autoCompleted, setAutoCompleted] = useState(false);
  const autoCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddComment = useCallback(async (content: string) => {
    if (!task) return;
    const c = await postComment(task.taskId, content);
    if (c) setTask(prev => prev ? { ...prev, comments: [...prev.comments, c] } : prev);
  }, [task, postComment, setTask]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!task) return;
    const ok = await removeComment(task.taskId, commentId);
    if (ok) setTask(prev => prev ? { ...prev, comments: prev.comments.filter(c => c.commentId !== commentId) } : prev);
  }, [task, removeComment, setTask]);

  const handleToggleSubtask = useCallback(async (subtaskId: string, completed: boolean) => {
    if (!task) return;
    const res = await toggleSubtask(task.taskId, subtaskId, completed);
    if (!res) return;

    refetch();

    // ── Auto-complete: promote task to COMPLETED when all subtasks are done ──
    // The server computes progress recursively across the whole subtask tree.
    // When progress reaches 100 on a completion action, every subtask is done.
    if (
      completed &&
      res.progress === 100 &&
      task.subtasks.length > 0 &&
      task.status !== 'COMPLETED'
    ) {
      await setStatus(task.taskId, 'COMPLETED');

      // Show a brief toast notification so the user knows the task was auto-promoted.
      setAutoCompleted(true);
      if (autoCompleteTimerRef.current) clearTimeout(autoCompleteTimerRef.current);
      autoCompleteTimerRef.current = setTimeout(() => setAutoCompleted(false), 4000);
    }
  }, [task, toggleSubtask, refetch, setStatus]);

  const handleAddSubtask = useCallback(async (parentSubtaskId?: string) => {
    if (!task || !newSubtaskTitle.trim()) return;
    await addSubtask(task.taskId, newSubtaskTitle.trim(), parentSubtaskId);
    setNewSubtaskTitle('');
    setAddingSubtask(false);
    refetch();
  }, [task, newSubtaskTitle, addSubtask, refetch]);

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader size={24} className="animate-spin text-purple-400" />
    </div>
  );

  if (error || !task) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-red-400 text-sm">{error || 'Task not found.'}</p>
    </div>
  );

  const priCfg = PRIORITY_CONFIG[task.priority];
  const progress = task.progress || calcSubtaskProgress(task.subtasks);

  return (
    <div className="flex flex-col h-full relative">
      {/* Mission Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-white/06 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ background: `radial-gradient(ellipse at 20% 50%, ${priCfg.glow}, transparent 60%)` }} />
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PriorityDot priority={task.priority} />
              <StatusBadge status={task.status} />
              {task.visibility === 'PRIVATE' && (
                <span className="flex items-center gap-1 text-[11px] text-amber-400">
                  <Lock size={10} /> Private
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onToggleExpand && (
                <button onClick={onToggleExpand} className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/05">
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              )}
              <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/05">
                <X size={18} />
              </button>
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-3 leading-tight">{task.title}</h2>
          <div className="flex items-center gap-4 flex-wrap">
            <TimerControl taskId={task.taskId} trackedTime={task.trackedTime} trackedHours={task.trackedHours} />
            {task.dueDate && (
              <span className={`text-[12px] flex items-center gap-1.5 ${isOverdue(task) ? 'text-red-400' : 'text-white/50'}`}>
                <Calendar size={12} />
                Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Three-column body */}
      <div className="flex-1 overflow-hidden flex">

        {/* LEFT — Task Info */}
        <div className="w-64 flex-shrink-0 border-r border-white/06 overflow-y-auto task-scroll p-4 space-y-5">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Description</h4>
              <p className="text-[13px] text-white/70 leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Assignees */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Assignees</h4>
            {task.assignedUsers.length === 0 && task.assignedRoles.length === 0 ? (
              <p className="text-[12px] text-white/30">Unassigned</p>
            ) : (
              <div className="space-y-1.5">
                {task.assignedUsers.map(uid => {
                  const m = members.find(m => m.id === uid);
                  return (
                    <div key={uid} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-violet-400 flex items-center justify-center text-[10px] font-bold text-white">
                        {(m?.username || uid)[0].toUpperCase()}
                      </div>
                      <span className="text-[12px] text-white/70">{m?.username || uid}</span>
                    </div>
                  );
                })}
                {task.assignedRoles.map(rid => {
                  const r = roles.find(r => r.id === rid);
                  return (
                    <div key={rid} className="flex items-center gap-2">
                      <Shield size={14} className="text-purple-400" />
                      <span className="text-[12px] text-white/70">{r?.name || rid}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md text-[11px] text-purple-300 bg-purple-500/10 border border-purple-500/20">#{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Hours */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Time</h4>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Estimated</span>
                <span className="text-white/80 font-medium">{task.estimatedHours}h</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-white/40">Tracked</span>
                <span className="text-green-400 font-medium">{task.trackedHours}h</span>
              </div>
              {task.estimatedHours > 0 && (
                <div className="w-full bg-white/05 rounded-full h-1.5 mt-1">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-400 transition-all duration-700"
                    style={{ width: `${Math.min((task.trackedHours / task.estimatedHours) * 100, 100)}%` }} />
                </div>
              )}
            </div>
          </div>

          {/* Recurrence */}
          {task.recurrenceRule && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Recurrence</h4>
              <span className="text-[12px] text-blue-400 capitalize">
                {task.recurrenceRule.frequency.toLowerCase()} ×{task.recurrenceRule.interval}
              </span>
            </div>
          )}

          {/* Status Changer */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Change Status</h4>
            <div className="space-y-1">
              {ORDERED_STATUSES.map(s => (
                <button key={s} onClick={() => setStatus(task.taskId, s)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors ${task.status === s ? 'bg-white/08' : 'hover:bg-white/04'}`}>
                  <StatusBadge status={s} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER — Discussion */}
        <div className="flex-1 flex flex-col border-r border-white/06 overflow-hidden">
          <div className="flex items-center gap-1 px-4 py-2.5 border-b border-white/05 flex-shrink-0">
            <button onClick={() => setActiveTab('discussion')}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors ${activeTab === 'discussion' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}>
              Discussion
            </button>
            <button onClick={() => setActiveTab('activity')}
              className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors ${activeTab === 'activity' ? 'bg-purple-500/20 text-purple-300' : 'text-white/40 hover:text-white/60'}`}>
              Activity
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-4">
            {activeTab === 'discussion' ? (
              <DiscussionFeed
                comments={task.comments} members={members}
                currentUser={currentUser} taskId={task.taskId}
                onAdd={handleAddComment} onDelete={handleDeleteComment}
              />
            ) : (
              <div className="h-full overflow-y-auto task-scroll">
                <ActivityTimeline logs={task.activityLogs} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Progress + Subtasks */}
        <div className="w-72 flex-shrink-0 overflow-y-auto task-scroll p-4 space-y-5">
          {/* Progress */}
          <div className="text-center">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Mission Progress</h4>
            <div className="flex justify-center">
              <ProgressRing progress={progress} size={88} strokeWidth={5} color={priCfg.color} />
            </div>
            <p className="text-[12px] text-white/40 mt-2">
              {task.subtasks.filter(s => s.completed).length} of {task.subtasks.length} subtasks done
            </p>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Subtasks</h4>
              <button onClick={() => setAddingSubtask(v => !v)}
                className="text-white/30 hover:text-purple-400 transition-colors">
                <Plus size={14} />
              </button>
            </div>

            {addingSubtask && (
              <div className="flex gap-2 mb-3">
                <input autoFocus value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)}
                  placeholder="Subtask title…"
                  className="flex-1 bg-white/05 border border-white/10 rounded-lg px-2 py-1.5 text-[12px] text-white outline-none focus:border-purple-500/50"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddSubtask();
                    if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtaskTitle(''); }
                  }} />
              </div>
            )}

            <div className="space-y-0.5">
              {task.subtasks.map(st => (
                <SubtaskItem key={st.subtaskId} subtask={st} depth={0}
                  taskId={task.taskId} onToggle={handleToggleSubtask} onAdd={handleAddSubtask} />
              ))}
              {task.subtasks.length === 0 && !addingSubtask && (
                <p className="text-[12px] text-white/25 text-center py-3">No subtasks yet</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          {task.attachments.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Attachments</h4>
              <div className="space-y-1.5">
                {task.attachments.map(att => (
                  <div key={att.attachmentId} className="flex items-center gap-2 p-2 glass-light rounded-lg">
                    <Paperclip size={12} className="text-purple-400 flex-shrink-0" />
                    <span className="text-[11px] text-white/70 truncate">{att.fileName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="flex-shrink-0 px-6 py-2 border-t border-white/05">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/05 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${priCfg.color}, ${priCfg.glow.replace('0.', '0.7').replace('rgba','rgb')})` }} />
          </div>
          <span className="text-[11px] text-white/40">{progress}% complete</span>
        </div>
      </div>

      {/* ── Auto-complete toast notification ── */}
      <AnimatePresence>
        {autoCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15))',
              border: '1px solid rgba(16,185,129,0.4)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 0 32px rgba(16,185,129,0.25)',
            }}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.5)' }}>
              <CheckCircle2 size={13} className="text-green-400" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-green-300 leading-tight">Mission Accomplished!</p>
              <p className="text-[10px] text-green-400/70 leading-tight">All subtasks done — task moved to Completed</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── drag Card ───────────────────────────────────────────────────────────────

const dragCard = memo(({ task, members, onClick, dragging, dense }: {
  task: Task;
  members: TeamMember[];
  onClick: () => void;
  dragging?: boolean;
  dense?: boolean;
}) => {
  const priCfg = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-[rgba(30,30,36,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.05)] rounded-xl cursor-pointer group hover:bg-[rgba(40,40,48,0.8)] transition-colors hover:border-[rgba(255,255,255,0.1)] relative overflow-hidden ${dragging ? 'opacity-50 scale-95 border-purple-500/50' : ''} ${dense ? 'p-2' : 'p-3'}`}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-1 h-full opacity-70"
        style={{ background: `linear-gradient(180deg, ${priCfg.color}, transparent)` }} />

      <div className="pl-2">
        <div className={`flex justify-between items-start gap-2 ${dense ? 'mb-1' : 'mb-2'}`}>
          <h4 className={`font-bold text-white/90 leading-snug group-hover:text-purple-300 transition-colors ${dense ? 'text-[11px] whitespace-nowrap overflow-hidden text-ellipsis' : 'text-[13px] line-clamp-2'}`} title={dense ? task.title : undefined}>
            {task.title}
          </h4>
        </div>
        
        <div className={`flex items-center justify-between ${dense ? 'mt-1' : 'mt-3'}`}>
          <div className="flex items-center gap-1.5">
            <PriorityDot priority={task.priority} />
            {overdue && <AlertCircle size={dense ? 10 : 12} className="text-red-400" />}
          </div>
          {!dense && (
            <div className="flex-shrink-0">
              <AvatarStack userIds={task.assignedUsers} members={members} max={2} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ── drag Board ──────────────────────────────────────────────────────────────

type dragTab = 'all' | 'planning' | 'execution' | 'done';

const drag_TABS: { id: dragTab; label: string; statuses: TaskStatus[] }[] = [
  { id: 'all', label: 'All Columns', statuses: ORDERED_STATUSES },
  { id: 'planning', label: 'Planning', statuses: ['BACKLOG', 'PLANNED', 'ASSIGNED'] },
  { id: 'execution', label: 'Execution', statuses: ['IN_PROGRESS', 'REVIEW', 'BLOCKED'] },
  { id: 'done', label: 'Done', statuses: ['COMPLETED', 'CANCELLED'] },
];

const dragBoard = memo(({ tasks, members, onTaskClick, onStatusChange }: {
  tasks: Task[];
  members: TeamMember[];
  onTaskClick: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [activeTab, setActiveTab] = useState<dragTab>('all');

  const visibleStatuses = useMemo(() => {
    return drag_TABS.find(t => t.id === activeTab)?.statuses || ORDERED_STATUSES;
  }, [activeTab]);

  const columns = useMemo(() => visibleStatuses.map(s => ({
    status: s,
    tasks: tasks.filter(t => t.status === s),
  })), [tasks, visibleStatuses]);

  const isAllColumnsMode = activeTab === 'all';

  return (
    <div className="h-full flex flex-col overflow-hidden drag-container">
      {/* Tabs */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2">
          {drag_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold tracking-wider uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(124,58,237,0.15)]' : 'text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto drag-scroll relative">
        <div className={`flex h-full p-4 ${isAllColumnsMode ? 'gap-2 w-full min-w-full' : 'gap-5'}`} style={{ width: isAllColumnsMode ? '100%' : 'max-content' }}>
          <AnimatePresence mode="popLayout">
            {columns.map(col => {
              const cfg = STATUS_CONFIG[col.status];
              const slug = col.status.toLowerCase().replace('_', '-');
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, ease: 'circOut' }}
                  key={col.status}
                  className={`flex flex-col bg-[rgba(20,20,24,0.3)] backdrop-blur-sm border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden relative drag-col-${slug} group/column transition-all duration-300 ${isAllColumnsMode ? 'flex-1 hover:flex-[1.5] flex-shrink' : 'w-[300px] flex-shrink-0'}`}
                  onDragOver={e => { e.preventDefault(); setDragOverStatus(col.status); }}
                  onDrop={() => {
                    if (draggedTaskId && col.status !== tasks.find(t => t.taskId === draggedTaskId)?.status) {
                      onStatusChange(draggedTaskId, col.status);
                    }
                    setDraggedTaskId(null);
                    setDragOverStatus(null);
                  }}
                  onDragLeave={() => setDragOverStatus(null)}
                >
                  {/* Glowing Top Border */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60" style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />

                  {/* Column Header */}
                  <div className={`px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)] transition-colors ${dragOverStatus === col.status ? 'bg-purple-500/10' : ''}`}>
                    <div className={`flex items-center ${isAllColumnsMode ? 'gap-1.5' : 'gap-2.5'} overflow-hidden`}>
                      <span style={{ color: cfg.color }} className="drop-shadow-lg flex-shrink-0">{cfg.icon}</span>
                      <span className={`text-[13px] font-black uppercase tracking-wider text-white/90 truncate transition-all duration-300 ${isAllColumnsMode ? 'opacity-0 w-0 group-hover/column:opacity-100 group-hover/column:w-auto xl:opacity-100 xl:w-auto' : ''}`}>{cfg.label}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                      {col.tasks.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className={`flex-1 overflow-y-auto task-scroll p-2 space-y-2 transition-colors ${dragOverStatus === col.status ? 'bg-purple-500/5 ring-inset ring-2 ring-purple-500/40' : ''}`}>
                    <AnimatePresence>
                      {col.tasks.map(task => (
                        <div key={task.taskId} draggable
                          onDragStart={() => setDraggedTaskId(task.taskId)}
                          onDragEnd={() => setDraggedTaskId(null)}>
                          <dragCard
                            task={task} members={members}
                            onClick={() => onTaskClick(task.taskId)}
                            dragging={draggedTaskId === task.taskId}
                            dense={isAllColumnsMode}
                          />
                        </div>
                      ))}
                    </AnimatePresence>
                    {col.tasks.length === 0 && (
                      <div className={`text-center py-6 text-[10px] font-bold uppercase tracking-widest text-white/20 border-2 border-dashed rounded-xl transition-colors ${dragOverStatus === col.status ? 'border-purple-500/50 text-purple-400' : 'border-white/10'}`}>
                        {dragOverStatus === col.status ? 'Drop Here' : (isAllColumnsMode ? 'Empty' : 'Empty')}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

// ── Analytics Dashboard ───────────────────────────────────────────────────────

const AnalyticsDashboard = memo(({ analytics, tasks: _tasks }: {
  analytics: ReturnType<typeof useTaskAnalytics>['analytics'];
  tasks: Task[];
}) => {
  if (!analytics) return (
    <div className="flex items-center justify-center h-full">
      <Loader size={24} className="animate-spin text-purple-400" />
    </div>
  );

  const maxStatus = Math.max(...Object.values(analytics.statusCounts));

  return (
    <div className="h-full overflow-y-auto task-scroll p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Missions', value: analytics.totalTasks, icon: <Rocket size={18} />, color: '#7C3AED', glow: 'rgba(124,58,237,0.3)' },
          { label: 'Completed', value: analytics.statusCounts.COMPLETED || 0, icon: <CheckCircle2 size={18} />, color: '#10B981', glow: 'rgba(16,185,129,0.3)' },
          { label: 'Hours Tracked', value: `${analytics.totalTrackedHours}h`, icon: <Clock size={18} />, color: '#F59E0B', glow: 'rgba(245,158,11,0.3)' },
          { label: 'Overdue', value: analytics.overdueCount, icon: <AlertCircle size={18} />, color: '#EF4444', glow: 'rgba(239,68,68,0.3)' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-4 relative overflow-hidden widget-card">
            <div className="absolute inset-0 opacity-10"
              style={{ background: `radial-gradient(circle at 80% 20%, ${kpi.glow}, transparent 60%)` }} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold text-white" style={{ textShadow: `0 0 20px ${kpi.glow}` }}>{kpi.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-[13px] font-semibold text-white/80 mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-purple-400" /> Status Breakdown
          </h3>
          <div className="space-y-2.5">
            {ORDERED_STATUSES.map(s => {
              const count = analytics.statusCounts[s] || 0;
              const cfg = STATUS_CONFIG[s];
              const pct = maxStatus > 0 ? (count / maxStatus) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className="w-20 text-[11px]" style={{ color: cfg.color }}>{cfg.label}</div>
                  <div className="flex-1 bg-white/05 rounded-full h-1.5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-1.5 rounded-full analytics-bar" style={{ background: cfg.color }} />
                  </div>
                  <span className="text-[11px] text-white/50 w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="glass rounded-2xl p-4">
          <h3 className="text-[13px] font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Flag size={15} className="text-orange-400" /> Priority Distribution
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {(['CRITICAL','HIGH','MEDIUM','LOW'] as TaskPriority[]).map(p => {
              const count = analytics.priorityCounts[p] || 0;
              const cfg = PRIORITY_CONFIG[p];
              const pct = analytics.totalTasks > 0 ? Math.round((count / analytics.totalTasks) * 100) : 0;
              return (
                <div key={p} className="glass-light rounded-xl p-3 text-center">
                  <div className="w-12 h-12 mx-auto mb-2">
                    <ProgressRing progress={pct} size={48} color={cfg.color} />
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
                  <p className="text-[10px] text-white/40">{count} tasks</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Contributors */}
      {analytics.topMembers.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-[13px] font-semibold text-white/80 mb-4 flex items-center gap-2">
            <Award size={15} className="text-amber-400" /> Top Contributors
          </h3>
          <div className="space-y-2.5">
            {analytics.topMembers.map((m, i) => (
              <div key={m.memberId} className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  {i === 0 ? <Star size={14} className="text-amber-400" />
                    : <span className="text-[11px] text-white/40">#{i+1}</span>}
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-violet-400 flex items-center justify-center text-[11px] font-bold text-white">
                  {(m.memberName || '?')[0].toUpperCase()}
                </div>
                <span className="flex-1 text-[12px] text-white/70">{m.memberName}</span>
                <div className="flex items-center gap-1 text-[12px] text-green-400">
                  <Clock size={11} />{m.totalHours}h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Rate */}
      <div className="glass rounded-2xl p-6 flex items-center gap-6">
        <div className="flex-shrink-0">
          <ProgressRing progress={analytics.completionRate} size={80} strokeWidth={6} color="#10B981" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-1">Completion Rate</h3>
          <p className="text-[13px] text-white/50">{analytics.completedThisWeek} completed this week · {analytics.overdueCount} overdue</p>
        </div>
      </div>
    </div>
  );
});

// ── Mention Field ───────────────────────────────────────────────────────────

const MentionField = memo(({ value, onChange, placeholder, rows, className, members, roles, asInput = false }: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  members: TeamMember[];
  roles: Role[];
  asInput?: boolean;
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  const filteredItems = useMemo(() => {
    if (!showMentions) return [];
    const q = mentionQuery.toLowerCase();
    const matchedMembers = members.filter(m => m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)).map(m => ({ type: 'member', id: m.id, name: m.username }));
    const matchedRoles = roles.filter(r => r.name.toLowerCase().includes(q)).map(r => ({ type: 'role', id: r.roleId, name: r.name }));
    return [...matchedMembers, ...matchedRoles].slice(0, 8);
  }, [showMentions, mentionQuery, members, roles]);

  const insertMention = useCallback((name: string) => {
    const before = value.substring(0, mentionIndex);
    const after = value.substring(inputRef.current?.selectionEnd || value.length);
    const newValue = before + '@' + name + ' ' + after;
    onChange(newValue);
    setShowMentions(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = before.length + name.length + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [value, mentionIndex, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (showMentions && filteredItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(s => (s + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(s => (s - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredItems[selectedIndex].name);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
  }, [showMentions, filteredItems, selectedIndex, insertMention]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
    
    if (match) {
      const query = match[1];
      const index = textBeforeCursor.lastIndexOf('@');
      setMentionQuery(query);
      setMentionIndex(index);
      setSelectedIndex(0);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, [onChange]);

  return (
    <div className="relative w-full">
      {asInput ? (
        <input
          ref={inputRef as any}
          value={value}
          onChange={handleChange as any}
          onKeyDown={handleKeyDown as any}
          placeholder={placeholder}
          className={className}
          onBlur={() => setTimeout(() => setShowMentions(false), 200)}
        />
      ) : (
        <textarea
          ref={inputRef as any}
          value={value}
          onChange={handleChange as any}
          onKeyDown={handleKeyDown as any}
          placeholder={placeholder}
          rows={rows}
          className={className}
          onBlur={() => setTimeout(() => setShowMentions(false), 200)}
        />
      )}
      
      <AnimatePresence>
        {showMentions && filteredItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 top-[100%] mt-2 bg-[rgba(20,20,24,0.95)] border border-[rgba(255,255,255,0.15)] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl"
          >
            <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Mention Suggestions</span>
              <span className="text-[10px] text-white/30 font-medium">Use ↑↓ and Enter</span>
            </div>
            <div className="p-2 flex flex-col max-h-[220px] overflow-y-auto custom-scrollbar">
              {filteredItems.map((item, i) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={(e) => { e.preventDefault(); insertMention(item.name); }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-xl transition-all ${i === selectedIndex ? 'bg-gradient-to-r from-purple-500/20 to-transparent text-white border-l-2 border-purple-400' : 'text-white/70 hover:bg-white/5 border-l-2 border-transparent'}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-inner ${item.type === 'role' ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/20' : 'bg-gradient-to-br from-blue-500/20 to-sky-500/10 text-blue-400 border border-blue-500/20'}`}>
                    {item.type === 'role' ? <Shield size={14} /> : <Users size={14} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[14px] leading-tight truncate">{item.name}</span>
                    <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">{item.type}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── Create Task Modal ─────────────────────────────────────────────────────────

const CreateTaskModal = memo(({ members, roles, channelId, onClose, onCreated }: {
  members: TeamMember[];
  roles: Role[];
  channelId: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('BACKLOG');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Custom dropdown states
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const { createNewTask, isSaving, error } = useTaskActions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const task = await createNewTask({
      title: title.trim(), description,
      priority, status, visibility,
      dueDate: dueDate || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      estimatedHours: Number(estimatedHours) || 0,
      channelId,
    });
    if (task) { onCreated(task); onClose(); }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 150 } }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }} 
        animate={{ opacity: 1, backdropFilter: 'blur(20px)' }} 
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020204]/70 p-4 perspective-1000 overflow-hidden"
      >
        {/* Dynamic Background Elements - isolated to prevent scrollbar jitter */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-full blur-[150px]" 
          />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute right-0 bottom-0 w-[600px] h-[600px] bg-gradient-to-tl from-pink-600/20 to-transparent rounded-full blur-[120px]" 
          />
        </div>

        {/* Scrollable Container for Modal */}
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden task-scroll flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.8, y: 50, opacity: 0, rotateX: 20 }} 
            animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }} 
            exit={{ scale: 0.9, y: 30, opacity: 0, rotateX: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="relative w-full max-w-2xl bg-[rgba(15,15,20,0.85)] backdrop-blur-3xl border border-[rgba(255,255,255,0.1)] shadow-[0_30px_100px_rgba(0,0,0,0.8),0_0_40px_rgba(124,58,237,0.3)] rounded-3xl overflow-hidden my-auto"
          >
            {/* Animated top border glow */}
            <motion.div 
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-[length:200%_auto] opacity-80" 
            />

            <div className="px-8 py-6 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] relative z-10 bg-gradient-to-b from-white/[0.03] to-transparent">
              <div className="flex items-center gap-5">
                 <motion.div 
                    whileHover={{ rotate: 180, scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-[0_0_30px_rgba(217,70,239,0.5)] border border-white/20 relative group"
                 >
                    <Rocket size={26} className="text-white z-10 group-hover:animate-bounce" />
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity"></div>
                 </motion.div>
                 <div>
                   <h3 className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight">INITIATE OPERATION</h3>
                   <p className="text-[12px] text-purple-300/80 uppercase tracking-[0.25em] font-bold mt-1">Define Mission Parameters</p>
                 </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors border border-white/5 hover:border-red-500/30"
              >
                <X size={18} />
              </motion.button>
            </div>

            <motion.form 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              onSubmit={handleSubmit} 
              className="p-8 space-y-6 relative z-10"
            >
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </motion.div>
            )}

            <div className="space-y-5">
              <motion.div variants={itemVariants} className="relative group">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500 ${focusedField === 'title' ? 'opacity-50 duration-200' : ''}`}></div>
                <input value={title} onChange={e => setTitle(e.target.value)} required
                  onFocus={() => setFocusedField('title')} onBlur={() => setFocusedField(null)}
                  placeholder="Operation Codename…"
                  className="relative w-full bg-[rgba(10,10,12,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl px-5 py-4 text-[18px] font-bold text-white placeholder-white/20 outline-none focus:border-purple-500/50 transition-all shadow-inner" />
              </motion.div>

              <motion.div variants={itemVariants} className="relative group">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-500 ${focusedField === 'desc' ? 'opacity-40 duration-200' : ''}`}></div>
                <div className="relative bg-[rgba(10,10,12,0.6)] backdrop-blur-md border border-[rgba(255,255,255,0.08)] rounded-2xl transition-all shadow-inner focus-within:border-purple-500/50">
                  <div onFocus={() => setFocusedField('desc')} onBlur={() => setFocusedField(null)}>
                    <MentionField 
                      value={description} onChange={setDescription}
                      asInput={false}
                      placeholder="Mission Briefing (optional)… Type @ to tag members/roles" rows={3}
                      members={members} roles={roles}
                      className="w-full bg-transparent px-5 py-4 text-[14px] text-white placeholder-white/20 outline-none resize-none rounded-2xl block" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Backdrop to close dropdowns when clicking outside */}
            {(isPriorityOpen || isStatusOpen) && (
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => { setIsPriorityOpen(false); setIsStatusOpen(false); }}
              />
            )}

            {/* Custom Dropdowns for Priority and Status */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-5 relative">
              
              {/* Priority Custom Select */}
              <div className="relative z-30">
                <label className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-1.5"><Target size={12} /> Priority Level</label>
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => { setIsPriorityOpen(!isPriorityOpen); setIsStatusOpen(false); }}
                >
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500 ${isPriorityOpen ? 'opacity-50' : ''}`}></div>
                  <div className={`relative bg-[rgba(10,10,12,0.8)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3.5 flex items-center justify-between transition-all group-hover:border-purple-500/50 shadow-inner ${isPriorityOpen ? 'border-purple-500/50 bg-[rgba(20,15,30,0.8)]' : ''}`}>
                    <span className="text-[14px] font-bold text-white flex items-center gap-2">
                       <PriorityDot priority={priority} />
                    </span>
                    <ChevronDown size={16} className={`text-white/50 transition-transform duration-300 ${isPriorityOpen ? 'rotate-180 text-white' : ''}`} />
                  </div>
                  
                  <AnimatePresence>
                    {isPriorityOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[rgba(20,20,24,0.95)] backdrop-blur-2xl border border-[rgba(255,255,255,0.15)] rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 p-1.5"
                      >
                        {(['CRITICAL','HIGH','MEDIUM','LOW'] as TaskPriority[]).map(p => (
                          <motion.div 
                            key={p} 
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setPriority(p); setIsPriorityOpen(false); }}
                            className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 transition-colors ${priority === p ? 'bg-white/5' : ''}`}
                          >
                            <PriorityDot priority={p} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Status Custom Select */}
              <div className="relative z-20">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1.5"><Activity size={12} /> Initial Status</label>
                <div 
                  className="relative group cursor-pointer"
                  onClick={() => { setIsStatusOpen(!isStatusOpen); setIsPriorityOpen(false); }}
                >
                  <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-sky-500 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-500 ${isStatusOpen ? 'opacity-50' : ''}`}></div>
                  <div className={`relative bg-[rgba(10,10,12,0.8)] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3.5 flex items-center justify-between transition-all group-hover:border-blue-500/50 shadow-inner ${isStatusOpen ? 'border-blue-500/50 bg-[rgba(15,20,30,0.8)]' : ''}`}>
                    <span className="text-[14px] font-bold text-white flex items-center gap-2">
                       <StatusBadge status={status} />
                    </span>
                    <ChevronDown size={16} className={`text-white/50 transition-transform duration-300 ${isStatusOpen ? 'rotate-180 text-white' : ''}`} />
                  </div>
                  
                  <AnimatePresence>
                    {isStatusOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[rgba(20,20,24,0.95)] backdrop-blur-2xl border border-[rgba(255,255,255,0.15)] rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50 p-1.5 max-h-[200px] overflow-y-auto custom-scrollbar"
                      >
                        {ORDERED_STATUSES.map(s => (
                          <motion.div 
                            key={s} 
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { setStatus(s); setIsStatusOpen(false); }}
                            className={`px-3 py-2.5 rounded-lg cursor-pointer flex items-center gap-2 transition-colors ${status === s ? 'bg-white/5' : ''}`}
                          >
                            <StatusBadge status={s} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-5 relative z-10">
              <div className="relative group">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500 ${focusedField === 'date' ? 'opacity-40 duration-200' : ''}`}></div>
                <div className="relative bg-[rgba(10,10,12,0.6)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 focus-within:border-purple-500/50 transition-all">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1 block">Deadline Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    onFocus={() => setFocusedField('date')} onBlur={() => setFocusedField(null)}
                    className="w-full bg-transparent text-[14px] font-medium text-white outline-none [color-scheme:dark]" />
                </div>
              </div>
              <div className="relative group">
                <div className={`absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500 ${focusedField === 'time' ? 'opacity-40 duration-200' : ''}`}></div>
                <div className="relative bg-[rgba(10,10,12,0.6)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 focus-within:border-purple-500/50 transition-all">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1 block">Est. Time (Hours)</label>
                  <input type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)}
                    onFocus={() => setFocusedField('time')} onBlur={() => setFocusedField(null)}
                    placeholder="0.0" min="0" step="0.5"
                    className="w-full bg-transparent text-[14px] font-bold text-white outline-none placeholder-white/20" />
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative group z-0">
               <div className={`absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition duration-500 ${focusedField === 'tags' ? 'opacity-40 duration-200' : ''}`}></div>
               <div className="relative bg-[rgba(10,10,12,0.6)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 focus-within:border-purple-500/50 transition-all">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1 block">Tags (comma separated)</label>
                 <div className="flex items-center gap-2">
                   <Tag size={14} className="text-white/30" />
                   <div className="w-full" onFocus={() => setFocusedField('tags')} onBlur={() => setFocusedField(null)}>
                     <MentionField
                       asInput={true}
                       value={tags} onChange={setTags}
                       placeholder="frontend, urgent, @member…"
                       members={members} roles={roles}
                       className="w-full bg-transparent text-[14px] text-white placeholder-white/20 outline-none" />
                   </div>
                 </div>
               </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center gap-3 pt-2">
              <motion.button type="button" 
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setVisibility(v => v === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border text-[12px] font-bold tracking-wider uppercase transition-all overflow-hidden relative group ${visibility === 'PRIVATE' ? 'border-amber-500/50 text-amber-400' : 'border-[rgba(255,255,255,0.08)] text-white/40'}`}
              >
                <div className={`absolute inset-0 transition-opacity duration-300 ${visibility === 'PRIVATE' ? 'bg-amber-500/15 opacity-100' : 'bg-white/5 opacity-0 group-hover:opacity-100'}`}></div>
                <div className="relative z-10 flex items-center gap-2">
                  {visibility === 'PRIVATE' ? <Lock size={15} /> : <Unlock size={15} />}
                  {visibility === 'PRIVATE' ? 'Private Operation' : 'Public Operation'}
                </div>
              </motion.button>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-6 mt-4 border-t border-[rgba(255,255,255,0.06)] relative">
              <motion.button type="submit" disabled={isSaving || !title.trim()}
                whileHover={(!isSaving && title.trim()) ? { scale: 1.02 } : {}} 
                whileTap={(!isSaving && title.trim()) ? { scale: 0.98 } : {}}
                className="w-full group relative px-6 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-[15px] font-black tracking-[0.2em] uppercase text-white rounded-xl flex items-center justify-center overflow-hidden transition-all shadow-[0_0_40px_rgba(217,70,239,0.4)] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed border border-white/20"
              >
                
                {/* Animated shimmer effect */}
                <motion.div 
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" 
                />

                <span className="relative z-10 flex items-center gap-3 drop-shadow-md">
                  {isSaving ? <Loader size={20} className="animate-spin" /> : <Rocket size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />}
                  {isSaving ? 'INITIALIZING SEQUENCE...' : 'LAUNCH OPERATION'}
                </span>
              </motion.button>
            </motion.div>
          </motion.form>
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

// ── Dashboard Widgets ─────────────────────────────────────────────────────────

const DashboardWidgets = memo(({ tasks, currentUser }: { tasks: Task[]; currentUser: CurrentUser | null }) => {
  const myId = currentUser?.id;
  const myTasks = useMemo(() => tasks.filter(t => t.assignedUsers.includes(myId || '')), [tasks, myId]);
  const overdueTasks = useMemo(() => tasks.filter(isOverdue), [tasks]);
  const activeTasks = useMemo(() => tasks.filter(t => t.status === 'IN_PROGRESS'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'COMPLETED'), [tasks]);

  const widgets = [
    { label: 'My Missions', count: myTasks.length, icon: <Target size={16} />, color: '#7C3AED', bg: 'rgba(124,58,237,0.15)' },
    { label: 'In Progress', count: activeTasks.length, icon: <Zap size={16} />, color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
    { label: 'Overdue', count: overdueTasks.length, icon: <AlertCircle size={16} />, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    { label: 'Completed', count: completedTasks.length, icon: <CheckCircle2 size={16} />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {widgets.map((w, i) => (
        <motion.div key={w.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="stat-widget p-5 group">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border transition-transform duration-300 group-hover:scale-110" 
                 style={{ backgroundColor: w.bg, borderColor: w.color, color: w.color, boxShadow: `0 0 20px ${w.bg}` }}>
              {w.icon}
            </div>
            <span className="text-[12px] font-bold text-white/50 uppercase tracking-widest">{w.label}</span>
          </div>
          <p className="font-display text-4xl lg:text-5xl font-black text-white transition-all duration-300" 
             style={{ textShadow: `0 0 24px ${w.bg}` }}>
            {w.count}
          </p>
        </motion.div>
      ))}
    </div>
  );
});

// ── Main TaskManager Component ────────────────────────────────────────────────

const TaskManager: React.FC<TaskManagerProps> = ({ currentUser, channelId }) => {
  const [view, setView] = useState<ViewMode>('mission');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskDetailExpanded, setIsTaskDetailExpanded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Parallax background tracking
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springConfig = { damping: 40, stiffness: 150, mass: 0.8 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);
  const bgX = useTransform(springX, [0, 1], ['-2%', '2%']);
  const bgY = useTransform(springY, [0, 1], ['-2%', '2%']);

  function handleMouseMove(e: React.MouseEvent) {
    const { currentTarget, clientX, clientY } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    mouseX.set((clientX - left) / width);
    mouseY.set((clientY - top) / height);
  }

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const { tasks, isLoading, error, refetch, addTaskOptimistic, updateTaskOptimistic, removeTaskOptimistic } = useTasks({
    channelId,
    ...(filterStatus ? { status: filterStatus } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
  });

  const { query: searchQuery, setQuery: setSearchQuery, results: filteredTasks } = useTaskSearch(tasks);
  const { analytics } = useTaskAnalytics();
  const { setStatus, removeTask: _removeTask } = useTaskActions(
    t => updateTaskOptimistic(t.taskId, t),
    id => removeTaskOptimistic(id)
  );

  // Load members & roles for assignee display
  useEffect(() => {
    fetchMembers().then(setMembers).catch(console.error);
    fetchRoles().then(setRoles).catch(console.error);
  }, []);

  const handleStatusChange = useCallback(async (taskId: string, status: TaskStatus) => {
    updateTaskOptimistic(taskId, { status });
    await setStatus(taskId, status);
  }, [setStatus, updateTaskOptimistic]);

  const handleTaskCreated = useCallback((task: Task) => {
    addTaskOptimistic(task);
  }, [addTaskOptimistic]);

  return (
    <div className="mission-control-bg h-full flex flex-col relative overflow-hidden" onMouseMove={handleMouseMove}>
      <motion.div className="mission-control-glow" style={{ x: bgX, y: bgY }} />
      <div className="mission-control-grid" />
      
      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-8 pt-10 pb-6 border-b border-[rgba(255,255,255,0.06)] relative z-10 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="hero-pill w-max">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
              <span className="text-[10px] font-bold text-white/50 tracking-[0.15em] uppercase">MISSION CONTROL OS</span>
            </div>
            <h1 className="hero-title text-4xl lg:text-[56px] drop-shadow-2xl">OPERATIONS</h1>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View switcher */}
            <div className="flex items-center bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl p-1 gap-1 backdrop-blur-xl">
          {([
            { id: 'mission', icon: <LayoutGrid size={13} />, label: 'Grid' },
            { id: 'drag',  icon: <Columns size={13} />,    label: 'drag' },
            { id: 'analytics', icon: <BarChart2 size={13} />, label: 'Analytics' },
          ] as { id: ViewMode; icon: React.ReactNode; label: string }[]).map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${view === v.id ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(124,58,237,0.4)]' : 'text-white/50 hover:text-white/80'}`}>
              {v.icon}{v.label}
            </button>
          ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 w-52 backdrop-blur-xl transition-colors focus-within:border-purple-500/50">
              <Search size={14} className="text-white/30 flex-shrink-0" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search operations…"
                className="bg-transparent text-[13px] text-white placeholder-white/25 outline-none w-full font-medium" />
            </div>

            {/* Filters */}
            <div className="relative">
              <button onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] transition-colors backdrop-blur-xl font-medium ${showFilters || filterStatus || filterPriority ? 'border-purple-500/50 bg-purple-500/10 text-purple-300' : 'border-[rgba(255,255,255,0.08)] text-white/50 hover:text-white/70 bg-[rgba(255,255,255,0.03)]'}`}>
            <Filter size={13} />{filterStatus || filterPriority ? 'Filtered' : 'Filter'}
          </button>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
                className="absolute top-full right-0 mt-2 z-50 bg-[rgba(20,20,28,0.95)] backdrop-blur-3xl rounded-2xl p-4 min-w-[240px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Status</p>
                    <div className="relative bg-[#1a1a24] border border-white/10 rounded-xl focus-within:border-purple-500/50 transition-colors">
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as TaskStatus | '')}
                        className="w-full bg-transparent px-3 py-2 text-[13px] font-medium text-white outline-none cursor-pointer appearance-none z-10 relative">
                        <option value="" className="bg-[#1a1a24]">All Statuses</option>
                        {ORDERED_STATUSES.map(s => <option key={s} value={s} className="bg-[#1a1a24]">{STATUS_CONFIG[s].label}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Priority</p>
                    <div className="relative bg-[#1a1a24] border border-white/10 rounded-xl focus-within:border-purple-500/50 transition-colors">
                      <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}
                        className="w-full bg-transparent px-3 py-2 text-[13px] font-medium text-white outline-none cursor-pointer appearance-none z-10 relative">
                        <option value="" className="bg-[#1a1a24]">All Priorities</option>
                        {(['CRITICAL','HIGH','MEDIUM','LOW'] as TaskPriority[]).map(p => <option key={p} value={p} className="bg-[#1a1a24]">{p}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                  {(filterStatus || filterPriority) && (
                    <button onClick={() => { setFilterStatus(''); setFilterPriority(''); }}
                      className="w-full text-center text-[11px] text-red-400 hover:text-red-300 transition-colors">
                      Clear filters
                    </button>
                  )}
                </div>
              </motion.div>
            )}
              </AnimatePresence>
            </div>

            <button onClick={refetch} className="text-white/30 hover:text-white/60 transition-colors p-2 rounded-xl hover:bg-[rgba(255,255,255,0.05)] border border-transparent hover:border-[rgba(255,255,255,0.08)]">
              <RefreshCw size={16} />
            </button>

            {/* New Mission button */}
            <button onClick={() => setShowCreateModal(true)}
              className="group relative px-6 py-2 bg-white text-[13px] font-bold text-black rounded-xl flex items-center justify-center overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 flex items-center gap-2">
                <Rocket size={15} /> New Operation
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[13px] text-red-400">
          {error}
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'mission' && (
            <div className="flex-1 overflow-y-auto task-scroll p-4">
              <DashboardWidgets tasks={tasks} currentUser={currentUser} />

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                    <Rocket size={28} className="text-purple-400" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-white/60 mb-1">No missions found</h3>
                  <p className="text-[13px] text-white/30 mb-4">Create your first mission to get started.</p>
                  <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-[13px] text-purple-300 hover:bg-purple-600/30 transition-colors">
                    <Plus size={14} />Launch First Mission
                  </button>
                </div>
              ) : (
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {filteredTasks.map(task => (
                      <MissionCard
                        key={task.taskId}
                        task={task}
                        members={members}
                        onClick={() => setSelectedTaskId(task.taskId)}
                        onStatusChange={s => handleStatusChange(task.taskId, s)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          )}

          {view === 'drag' && (
            <dragBoard
              tasks={filteredTasks}
              members={members}
              onTaskClick={id => setSelectedTaskId(id)}
              onStatusChange={handleStatusChange}
            />
          )}

          {view === 'analytics' && (
            <AnalyticsDashboard analytics={analytics} tasks={tasks} />
          )}
        </div>

        {/* Task Detail Panel Overlay */}
        <AnimatePresence>
          {selectedTaskId && (
            <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                onClick={() => setSelectedTaskId(null)}
              />
              
              {/* Drawer */}
              <motion.div
                key={selectedTaskId}
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`h-full flex-shrink-0 border-l border-white/10 flex flex-col bg-[rgba(15,15,20,0.95)] backdrop-blur-3xl shadow-[-20px_0_50px_rgba(0,0,0,0.6)] relative pointer-events-auto z-10 task-detail-overlay transition-all duration-300 ${isTaskDetailExpanded ? 'w-[95vw] xl:w-[1200px]' : 'w-full sm:w-[500px] lg:w-[800px]'}`}
              >
                <TaskDetailPanel
                  taskId={selectedTaskId}
                  members={members}
                  roles={roles}
                  currentUser={currentUser}
                  onClose={() => setSelectedTaskId(null)}
                  onTaskUpdated={t => updateTaskOptimistic(t.taskId, t)}
                  isExpanded={isTaskDetailExpanded}
                  onToggleExpand={() => setIsTaskDetailExpanded(!isTaskDetailExpanded)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateTaskModal
            members={members}
            roles={roles}
            channelId={channelId}
            onClose={() => setShowCreateModal(false)}
            onCreated={handleTaskCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TaskManager;
