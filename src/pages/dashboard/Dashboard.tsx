import React, { useState, useEffect, useRef } from 'react';
import type {MouseEvent} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import {
  Hash,
  Volume2,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  LogOut,
  Bell,
  Search,
  Pin,
  Users,
  Trash2,
  Edit2,
  Rocket,
  Brain,
} from 'lucide-react';
import UserCard from '../../components/dashboard-components/UserCard';
import Category from '../../components/dashboard-components/Workspace-components/Category';
import TextChannel from '../../components/dashboard-components/Workspace-components/TextChannel';
import VoiceChannel from '../../components/dashboard-components/Workspace-components/VoiceChannel';
import EditChannel from '../../components/dashboard-components/Workspace-components/EditChannel';
import TaskManager from '../../components/dashboard-components/Workspace-components/TaskManager';
import AIHr from '../../components/dashboard-components/Workspace-components/AIHr';
import WorkspaceSettings from './WorkspaceSettings';
import { fetchChannels, createChannel, deleteChannel } from '../../api/channels';
import type { TextChannel as ITextChannel } from '../../api/channels';
import { fetchVoiceChannels, createVoiceChannel, deleteVoiceChannel } from '../../api/voiceChannels';
import type { VoiceChannel as IVoiceChannel } from '../../api/voiceChannels';
import { fetchTaskChannels, createTaskChannel, deleteTaskChannel } from '../../api/taskChannels';
import type { TaskChannel as ITaskChannel } from '../../api/taskChannels';
import { getAiHrChannels, createAiHrChannel, deleteAiHrChannel } from '../../api/aiHr';
import type { AiHrChannel } from '../../api/aiHr';
import { fetchCategories, createCategory, deleteCategory } from '../../api/categories';
import { fetchMe } from '../../api/auth';
import { memberLogout } from '../../api/auditLogs';
import { SubscriptionProvider, useSubscription } from '../../context/SubscriptionContext';

import SubscriptionLimitModal from '../../components/dashboard-components/SubscriptionLimitModal';
import UpgradeModal from '../../components/dashboard-components/UpgradeModal';
import '../../styles/globals.css';
import './Dashboard.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelEntry = { id: string; name: string; type: 'text' | 'voice' | 'task' | 'ai-hr'; topic?: string };
type CategoryEntry = { id: string; name: string; expanded: boolean; channels: ChannelEntry[] };

// ─── Component ────────────────────────────────────────────────────────────────

const DashboardInner: React.FC = () => {
  const navigate = useNavigate();
  const { channelId } = useParams<{ channelId: string }>();

  const { refetch: refetchSubscription, canCreate, isActive: _isActive } = useSubscription();
  const [userCardOpen, setUserCardOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Guard against double-fire from Enter + blur
  const committingChannelRef = useRef(false);
  const committingCategoryRef = useRef(false);

  // ── DB-backed categories (each holds its linked channels) ────────────────
  const [customCategories, setCustomCategories] = useState<CategoryEntry[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ── Add-channel pop-up inside a category ─────────────────────────────────
  const [addChannelMenu, setAddChannelMenu] = useState<{ x: number; y: number; categoryId: string } | null>(null);

  // ── Inline channel-name input ─────────────────────────────────────────────
  const [creatingChannel, setCreatingChannel] = useState<{ categoryId: string; type: 'text' | 'voice' | 'task' | 'ai-hr' } | null>(null);
  const [newChannelName, setNewChannelName] = useState('');

  // ── Right-click channel menu & edit modal ────────────────────────────────
  const [channelContextMenu, setChannelContextMenu] = useState<{
    x: number; y: number; categoryId: string; channelId: string;
  } | null>(null);
  const [editingChannel, setEditingChannel] = useState<{
    categoryId: string; channelId: string; name: string; topic?: string;
  } | null>(null);

  // ── Root channels (not inside any category) ──────────────────────────────
  const [rootChannels, setRootChannels] = useState<ChannelEntry[]>([]);
  const [creatingRootChannel, setCreatingRootChannel] = useState<{ type: 'text' | 'voice' | 'task' | 'ai-hr' } | null>(null);

  // ── Workspace / user state ───────────────────────────────────────────────
  const [workspaceMenu, setWorkspaceMenu] = useState<{ x: number; y: number } | null>(null);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; isTeamMember: boolean } | null>(null);
  const [localWorkspaceName, setLocalWorkspaceName] = useState('My Workspace');

  // ── Plan Limits Modal State ──────────────────────────────────────────────
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalResource, setLimitModalResource] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ── AIHr Singleton Prompt State ──────────────────────────────────────────
  const [existingAiHrPrompt, setExistingAiHrPrompt] = useState<{ existingChannelId: string; categoryId?: string } | null>(null);

  const handleCreateAiHrIntent = (categoryId?: string) => {
    const existingAiHrChannel = rootChannels.find((c) => c.type === 'ai-hr') || 
      customCategories.flatMap(c => c.channels).find(c => c.type === 'ai-hr');
    
    if (existingAiHrChannel) {
      setExistingAiHrPrompt({ existingChannelId: existingAiHrChannel.id, categoryId });
    } else {
      if (categoryId) {
        setCreatingChannel({ categoryId, type: 'ai-hr' });
      } else {
        setCreatingRootChannel({ type: 'ai-hr' });
      }
    }
  };

  // Spotlight Effect State for Welcome Card
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const spotlightBackground = useMotionTemplate`
    radial-gradient(
      500px circle at ${mouseX}px ${mouseY}px,
      rgba(124, 58, 237, 0.15),
      transparent 40%
    )
  `;

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  // Guard — loadAll must only run once so that locally-created channels
  // (added optimistically to state) are never overwritten by a stale fetch.
  const hasFetchedChannels = useRef(false);

  // ─── Load everything from DB on mount ─────────────────────────────────────

  useEffect(() => {
    const loadAll = async () => {
      if (hasFetchedChannels.current) return;
      hasFetchedChannels.current = true;
      const safeFetch = (fn: () => Promise<any[]>, label: string): Promise<any[]> =>
        fn().catch((err: any) => {
          console.error(`[Dashboard] Failed to load ${label}:`, err?.response?.status, err?.message);
          if (err?.response?.status === 401) {
            sessionStorage.removeItem('accessToken');
            navigate('/login', { replace: true });
          }
          return [];
        });

      const [cats, textChs, voiceChs, taskChs, aiHrChs] = await Promise.all([
        safeFetch(fetchCategories, 'categories'),
        safeFetch(fetchChannels, 'text channels'),
        safeFetch(fetchVoiceChannels, 'voice channels'),
        safeFetch(fetchTaskChannels, 'task channels'),
        safeFetch(getAiHrChannels, 'ai-hr channels'),
      ]);

      const builtCategories: CategoryEntry[] = cats.map((cat) => ({
        id: cat.categoryId,
        name: cat.name,
        expanded: true,
        channels: [
          ...textChs
            .filter((c: ITextChannel) => c.categoryId === cat.categoryId)
            .map((c: ITextChannel) => ({ id: c.roomId, name: c.name, type: 'text' as const, topic: c.description })),
          ...voiceChs
            .filter((c: IVoiceChannel) => c.categoryId === cat.categoryId)
            .map((c: IVoiceChannel) => ({ id: c.roomId, name: c.name, type: 'voice' as const, topic: c.description })),
          ...taskChs
            .filter((c: ITaskChannel) => c.categoryId === cat.categoryId)
            .map((c: ITaskChannel) => ({ id: c.roomId, name: c.name, type: 'task' as const, topic: c.description })),
          ...aiHrChs
            .filter((c: AiHrChannel) => c.categoryId === cat.categoryId)
            .map((c: AiHrChannel) => ({ id: c.roomId, name: c.name, type: 'ai-hr' as const, topic: '' })),
        ],
      }));

      setCustomCategories(builtCategories);

      const rootText = textChs
        .filter((c: ITextChannel) => !c.categoryId)
        .map((c: ITextChannel) => ({ id: c.roomId, name: c.name, type: 'text' as const, topic: c.description }));
      const rootVoice = voiceChs
        .filter((c: IVoiceChannel) => !c.categoryId)
        .map((c: IVoiceChannel) => ({ id: c.roomId, name: c.name, type: 'voice' as const, topic: c.description }));
      const rootTask = taskChs
        .filter((c: ITaskChannel) => !c.categoryId)
        .map((c: ITaskChannel) => ({ id: c.roomId, name: c.name, type: 'task' as const, topic: c.description }));
      const rootAiHr = aiHrChs
        // Root channels are saved with categoryId: '' or undefined
        .filter((c: AiHrChannel) => !c.categoryId || c.categoryId === 'root')
        .map((c: AiHrChannel) => ({ id: c.roomId, name: c.name, type: 'ai-hr' as const, topic: '' }));
      setRootChannels([...rootText, ...rootVoice, ...rootTask, ...rootAiHr]);
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only — navigate is stable and must not be a dep

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      fetchMe(token)
        .then((res) => { if (res.success && res.data) setCurrentUser(res.data); })
        .catch((err) => {
          console.error('Failed to fetch user:', err);
          if (err?.response?.status === 401) {
            sessionStorage.removeItem('accessToken');
            navigate('/login', { replace: true });
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  useEffect(() => {
    const handleGlobalClick = () => {
      setAddChannelMenu(null);
      setChannelContextMenu(null);
      setWorkspaceMenu(null);
    };
    if (addChannelMenu || channelContextMenu || workspaceMenu) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [addChannelMenu, channelContextMenu, workspaceMenu]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const toggleCustomCategory = (id: string) =>
    setCustomCategories((prev) => prev.map((cat) => cat.id === id ? { ...cat, expanded: !cat.expanded } : cat));

  const handleWorkspaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const workspaceName = localWorkspaceName;
  const displayName = currentUser?.name || 'Demo User';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const roleMessage = currentUser?.role === 'admin' ? 'Welcome admin' : currentUser?.role === 'Team member' ? 'Welcome Team member' : '';
  const isAdmin = currentUser?.role === 'admin';
  const onlineCount = 1;

  let activeChannel: (ChannelEntry & { channelId: string }) | undefined;
  if (channelId) {
    const fromRoot = rootChannels.find((c) => c.id === channelId);
    if (fromRoot) {
      activeChannel = { ...fromRoot, channelId: fromRoot.id };
    } else {
      for (const cat of customCategories) {
        const ch = cat.channels.find((c) => c.id === channelId);
        if (ch) { activeChannel = { ...ch, channelId: ch.id }; break; }
      }
    }
  }

  const handleSignOut = async () => {
    if (currentUser?.isTeamMember) {
      try {
        await memberLogout();
      } catch (e) {
        console.warn('[Dashboard] member-logout API failed (will still sign out):', e);
      }
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('isTeamMember');
    navigate('/login', { replace: true });
  };

  const handleCommitCategory = async () => {
    if (committingCategoryRef.current) return;
    if (!newCategoryName.trim()) { setCreatingCategory(false); setNewCategoryName(''); return; }
    if (!canCreate('category')) {
      setLimitModalResource('categories');
      setShowLimitModal(true);
      setCreatingCategory(false); setNewCategoryName('');
      return;
    }
    committingCategoryRef.current = true;
    try {
      const created = await createCategory(newCategoryName.trim());
      setCustomCategories((prev) => [...prev, { id: created.categoryId, name: created.name, expanded: true, channels: [] }]);
      refetchSubscription();
    } catch (err: any) {
      if (err?.response?.status === 402) {
        setLimitModalResource('categories');
        setShowLimitModal(true);
      } else {
        console.error('[Dashboard] Failed to create category:', err);
      }
    } finally {
      committingCategoryRef.current = false;
    }
    setCreatingCategory(false);
    setNewCategoryName('');
  };

  const handleCommitChannel = async (categoryId: string, type: 'text' | 'voice' | 'task', name: string) => {
    if (committingChannelRef.current) return;
    if (!name.trim()) { setCreatingChannel(null); setNewChannelName(''); return; }
    committingChannelRef.current = true;
    setCreatingChannel(null);
    setNewChannelName('');
    try {
      if (type === 'text') {
        const created = await createChannel(name.trim(), '', categoryId);
        setCustomCategories((prev) => prev.map((c) =>
          c.id === categoryId
            ? { ...c, channels: [...c.channels, { id: created.roomId, name: created.name, type: 'text' as const }] }
            : c
        ));
        refetchSubscription();
      } else if (type === 'voice') {
        const created = await createVoiceChannel(name.trim(), '', categoryId);
        setCustomCategories((prev) => prev.map((c) =>
          c.id === categoryId
            ? { ...c, channels: [...c.channels, { id: created.roomId, name: created.name, type: 'voice' as const }] }
            : c
        ));
        refetchSubscription();
      } else if (type === 'task') {
        const created = await createTaskChannel(name.trim(), '', categoryId);
        setCustomCategories((prev) => prev.map((c) =>
          c.id === categoryId
            ? { ...c, channels: [...c.channels, { id: created.roomId, name: created.name, type: 'task' as const }] }
            : c
        ));
        refetchSubscription();
      } else if (type === 'ai-hr') {
        const created = await createAiHrChannel(name.trim(), categoryId);
        setCustomCategories((prev) => prev.map((c) =>
          c.id === categoryId
            ? { ...c, channels: [...c.channels, { id: created.roomId, name: created.name, type: 'ai-hr' as const }] }
            : c
        ));
        refetchSubscription();
      }
    } catch (err: any) {
      if (err?.response?.status === 402) {
        setLimitModalResource('channels');
        setShowLimitModal(true);
      } else {
        console.error(`[Dashboard] Failed to create ${type} channel:`, err);
      }
    } finally {
      committingChannelRef.current = false;
    }
  };

  const handleCommitRootChannel = async (type: 'text' | 'voice' | 'task', name: string) => {
    if (committingChannelRef.current) return;
    if (!name.trim()) { setCreatingRootChannel(null); setNewChannelName(''); return; }
    committingChannelRef.current = true;
    setCreatingRootChannel(null);
    setNewChannelName('');
    try {
      if (type === 'text') {
        const created = await createChannel(name.trim(), '');
        setRootChannels((prev) => [...prev, { id: created.roomId, name: created.name, type: 'text' as const }]);
      } else if (type === 'voice') {
        const created = await createVoiceChannel(name.trim(), '');
        setRootChannels((prev) => [...prev, { id: created.roomId, name: created.name, type: 'voice' as const }]);
      } else if (type === 'task') {
        const created = await createTaskChannel(name.trim(), '');
        setRootChannels((prev) => [...prev, { id: created.roomId, name: created.name, type: 'task' as const }]);
      } else if (type === 'ai-hr') {
        const created = await createAiHrChannel(name.trim(), 'root');
        setRootChannels((prev) => [...prev, { id: created.roomId, name: created.name, type: 'ai-hr' as const }]);
      }
    } catch (err: any) {
      if (err?.response?.status === 402) {
        setLimitModalResource('channels');
        setShowLimitModal(true);
      } else {
        console.error(`[Dashboard] Failed to create root ${type} channel:`, err);
      }
    } finally {
      committingChannelRef.current = false;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="h-screen w-screen flex bg-[#020204] overflow-hidden relative font-sans">
      
      {/* Global Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] md:w-[800px] md:h-[800px] bg-purple-primary/10 rounded-full blur-[180px] pointer-events-none z-0"></div>

      {/* ── Workspace rail (far left) ──────────────────────────────────── */}
      <div className="w-[72px] min-w-[72px] bg-[rgba(10,10,12,0.6)] backdrop-blur-3xl border-r border-[rgba(255,255,255,0.08)] flex flex-col items-center py-4 gap-3 z-10">
        <div 
          className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-purple-primary to-purple-light border border-[rgba(255,255,255,0.1)] flex items-center justify-center font-display font-bold text-xl text-white cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(124,58,237,0.4)]"
          title={workspaceName}
        >
          <span>{workspaceName.charAt(0).toUpperCase()}</span>
        </div>
        <div className="w-8 h-[1px] bg-[rgba(255,255,255,0.08)] my-1" />
        <button className="w-12 h-12 rounded-[16px] bg-[rgba(255,255,255,0.03)] border border-dashed border-[rgba(255,255,255,0.12)] text-text-secondary flex items-center justify-center cursor-pointer transition-all hover:bg-[rgba(124,58,237,0.1)] hover:border-purple-primary hover:text-purple-light" title="Add a workspace">
          <Plus size={20} />
        </button>
      </div>

      {/* ── Channel sidebar ────────────────────────────────────────────── */}
      <div className="w-[260px] min-w-[260px] bg-[rgba(15,15,18,0.4)] backdrop-blur-xl border-r border-[rgba(255,255,255,0.06)] flex flex-col z-10">
        
        {/* Workspace header */}
        <div className="h-[52px] min-h-[52px] px-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors">
          <span className="font-display font-bold text-[15px] text-white tracking-wide truncate">{workspaceName}</span>
          {isAdmin && (
            <button
              className="text-text-secondary hover:text-white transition-colors"
              onClick={(e) => { e.stopPropagation(); setWorkspaceMenu({ x: e.clientX, y: e.clientY }); }}
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Sidebar body */}
        <div className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar" onContextMenu={handleWorkspaceContextMenu}>

          {/* Root channels */}
          <div className="space-y-[2px] mb-4">
            {rootChannels.map((ch) => (
              <button
                key={ch.id}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[14px] transition-all group ${
                  channelId === ch.id 
                    ? 'bg-[rgba(124,58,237,0.15)] text-white' 
                    : 'text-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary'
                }`}
                onClick={() => navigate(`/workspace/channel/${ch.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (isAdmin) setChannelContextMenu({ x: e.clientX, y: e.clientY, categoryId: 'root', channelId: ch.id });
                }}
              >
                {ch.type === 'text' ? (
                  <Hash size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                ) : ch.type === 'voice' ? (
                  <Volume2 size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                ) : ch.type === 'ai-hr' ? (
                  <Brain size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                ) : (
                  <Rocket size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                )}
                <span className="font-medium truncate">{ch.name}</span>
              </button>
            ))}

            {creatingRootChannel && (
              <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-[rgba(0,0,0,0.2)]">
                {creatingRootChannel.type === 'text' ? <Hash size={16} className="text-text-tertiary" /> : creatingRootChannel.type === 'voice' ? <Volume2 size={16} className="text-text-tertiary" /> : creatingRootChannel.type === 'ai-hr' ? <Brain size={16} className="text-text-tertiary" /> : <Rocket size={16} className="text-text-tertiary" />}
                <input
                  autoFocus
                  type="text"
                  value={newChannelName}
                  placeholder="new-channel"
                  className="bg-transparent border-none text-[14px] text-white outline-none w-full"
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      await handleCommitRootChannel(creatingRootChannel.type, newChannelName);
                    }
                    if (e.key === 'Escape') { setCreatingRootChannel(null); setNewChannelName(''); }
                  }}
                  onBlur={() => { setCreatingRootChannel(null); setNewChannelName(''); }}
                />
              </div>
            )}
          </div>

          {/* Categories */}
          {customCategories.map((cat) => (
            <div key={cat.id} className="mb-4">
              <button 
                className="w-full flex items-center gap-1 px-1 py-1 text-text-tertiary hover:text-text-primary transition-colors group"
                onClick={() => toggleCustomCategory(cat.id)}
              >
                {cat.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span className="flex-1 text-left text-[11px] font-bold uppercase tracking-widest">{cat.name}</span>
                {isAdmin && (
                  <Plus
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-white"
                    onClick={(e) => { e.stopPropagation(); setAddChannelMenu({ x: e.clientX, y: e.clientY, categoryId: cat.id }); }}
                  />
                )}
              </button>

              {cat.expanded && (
                <div className="mt-1 space-y-[2px]">
                  {cat.channels.map((ch) => (
                    <button
                      key={ch.id}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[14px] transition-all group ${
                        channelId === ch.id 
                          ? 'bg-[rgba(124,58,237,0.15)] text-white' 
                          : 'text-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-text-primary'
                      }`}
                      onClick={() => navigate(`/workspace/channel/${ch.id}`)}
                      onContextMenu={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (isAdmin) setChannelContextMenu({ x: e.clientX, y: e.clientY, categoryId: cat.id, channelId: ch.id });
                      }}
                    >
                      {ch.type === 'text' ? (
                        <Hash size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                      ) : ch.type === 'voice' ? (
                        <Volume2 size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                      ) : ch.type === 'ai-hr' ? (
                        <Brain size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                      ) : (
                        <Rocket size={16} className={channelId === ch.id ? 'text-purple-light' : 'text-text-tertiary group-hover:text-text-secondary transition-colors'} />
                      )}
                      <span className="font-medium truncate">{ch.name}</span>
                    </button>
                  ))}

                  {creatingChannel?.categoryId === cat.id && (
                    <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-[rgba(0,0,0,0.2)]">
                      {creatingChannel.type === 'text' ? <Hash size={16} className="text-text-tertiary" /> : creatingChannel.type === 'voice' ? <Volume2 size={16} className="text-text-tertiary" /> : creatingChannel.type === 'ai-hr' ? <Brain size={16} className="text-text-tertiary" /> : <Rocket size={16} className="text-text-tertiary" />}
                      <input
                        autoFocus
                        type="text"
                        value={newChannelName}
                        placeholder="new-channel"
                        className="bg-transparent border-none text-[14px] text-white outline-none w-full"
                        onChange={(e) => setNewChannelName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            await handleCommitChannel(cat.id, creatingChannel.type, newChannelName);
                          }
                          if (e.key === 'Escape') { setCreatingChannel(null); setNewChannelName(''); }
                        }}
                        onBlur={() => { setCreatingChannel(null); setNewChannelName(''); }}
                      />
                    </div>
                  )}

                  {cat.channels.length === 0 && creatingChannel?.categoryId !== cat.id && (
                    <div className="px-3 py-1 text-[12px] italic text-text-tertiary">
                      No channels
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {creatingCategory && (
            <div className="flex items-center gap-1 px-1 py-1 text-text-tertiary">
              <ChevronDown size={12} />
              <input
                autoFocus
                type="text"
                placeholder="CATEGORY NAME"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') await handleCommitCategory();
                  if (e.key === 'Escape') { setCreatingCategory(false); setNewCategoryName(''); committingCategoryRef.current = false; }
                }}
                onBlur={handleCommitCategory}
                className="bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-white outline-none w-full"
              />
            </div>
          )}
        </div>

        {/* User panel */}
        <div className="h-[60px] min-h-[60px] bg-[rgba(10,10,12,0.8)] border-t border-[rgba(255,255,255,0.06)] px-3 flex items-center gap-2">
          <div
            className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0 px-2 py-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            onClick={(e) => { e.stopPropagation(); setUserCardOpen(!userCardOpen); }}
          >
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-purple-primary to-purple-light flex items-center justify-center font-bold text-white text-[13px] shrink-0">
              {avatarInitial}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23A559] border-2 border-[rgba(10,10,12,0.8)] rounded-full"></div>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold text-white truncate leading-tight">{displayName}</span>
              <span className="text-[11px] text-text-tertiary leading-tight">Online</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isAdmin && (
              <button className="p-1.5 text-text-tertiary hover:text-white hover:bg-[rgba(255,255,255,0.06)] rounded-md transition-colors" title="Settings" onClick={() => setShowWorkspaceSettings(true)}><Settings size={18} strokeWidth={2.5} /></button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-transparent z-10">
        {activeChannel ? (
          activeChannel.type === 'voice' ? (
            <VoiceChannel key={activeChannel.id} channelName={activeChannel.name} />
          ) : activeChannel.type === 'task' ? (
            <TaskManager key={activeChannel.id} currentUser={currentUser} channelId={activeChannel.id} />
          ) : activeChannel.type === 'ai-hr' ? (
            <AIHr key={activeChannel.id} roomId={activeChannel.id} />
          ) : (
            <TextChannel
              key={activeChannel.id}
              roomId={activeChannel.id}
              channelName={activeChannel.name}
              channelDescription={activeChannel.topic}
              currentUserProfile={currentUser}
            />
          )
        ) : (
          <>
            {/* Top bar for Welcome screen */}
            <div className="h-[52px] min-h-[52px] px-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-[rgba(15,15,18,0.4)] backdrop-blur-md z-20">
              <div className="flex items-center gap-2">
                <Hash size={20} className="text-text-tertiary" />
                <span className="font-medium text-[15px] text-white">welcome</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-text-secondary hover:text-white transition-colors"><Bell size={18} /></button>
                <button className="text-text-secondary hover:text-white transition-colors"><Pin size={18} /></button>
                <button className="text-text-secondary hover:text-white transition-colors flex items-center gap-1.5">
                  <Users size={18} />
                  <span className="text-[13px]">{onlineCount}</span>
                </button>
                <div className="ml-2 flex items-center gap-2 px-2.5 py-1.5 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)] rounded-md text-text-tertiary hover:text-text-secondary hover:border-[rgba(255,255,255,0.12)] transition-all cursor-text w-[160px]">
                  <Search size={14} />
                  <span className="text-[13px]">Search</span>
                </div>
              </div>
            </div>

            {/* Welcome content */}
            <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                onMouseMove={handleMouseMove}
                className="group relative w-full max-w-[560px] bg-[rgba(10,10,12,0.6)] backdrop-blur-3xl border border-[rgba(255,255,255,0.08)] rounded-[32px] p-12 shadow-[0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col items-center text-center"
              >
                {/* Interactive Spotlight Overlay */}
                <motion.div
                  className="pointer-events-none absolute -inset-px rounded-[32px] opacity-0 transition duration-500 group-hover:opacity-100 z-0"
                  style={{
                    background: spotlightBackground,
                  }}
                />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-purple-primary to-purple-light flex items-center justify-center font-display font-bold text-4xl text-white mb-6 shadow-[0_0_30px_rgba(124,58,237,0.4)] border border-[rgba(255,255,255,0.1)]">
                    <span>{workspaceName.charAt(0).toUpperCase()}</span>
                  </div>
                  
                  <h1 className="font-display font-bold text-4xl text-white tracking-tight mb-4 leading-tight">
                    Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-light to-white">{workspaceName}</span>
                  </h1>
                  
                  <p className="text-[15px] text-text-secondary leading-relaxed max-w-[400px] mb-8 font-sans">
                    This is your brand new workspace. Select a channel from the sidebar to start collaborating, or create a new one to get started.
                  </p>

                  <button
                    onClick={handleSignOut}
                    className="group/btn relative h-12 px-6 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-white rounded-xl flex items-center justify-center gap-2 font-medium text-[14px] transition-all duration-300 hover:bg-[rgba(255,63,63,0.1)] hover:border-[#FF3F3F] hover:text-[#FF3F3F] active:scale-[0.98] overflow-hidden"
                  >
                    <LogOut size={16} className="transition-transform group-hover/btn:-translate-x-0.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* ── Overlays & Modals ──────────────────────────────────────────── */}

      {userCardOpen && (
        <UserCard
          onClose={() => setUserCardOpen(false)}
          displayName={displayName}
          handle="demouser"
          roleMessage={roleMessage}
          isAdmin={isAdmin}
          isTeamMember={currentUser?.isTeamMember}
        />
      )}

      {/* Right-click on sidebar background */}
      {contextMenu && (
        <Category
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCreateCategory={() => { setCreatingCategory(true); setContextMenu(null); }}
          onCreateTextChannel={() => { setCreatingRootChannel({ type: 'text' }); setContextMenu(null); }}
          onCreateVoiceChannel={() => { setCreatingRootChannel({ type: 'voice' }); setContextMenu(null); }}
          onCreateTask={() => { setCreatingRootChannel({ type: 'task' }); setContextMenu(null); }}
          onCreateAiHr={() => { handleCreateAiHrIntent(); setContextMenu(null); }}
        />
      )}

      {/* + button inside a category header */}
      {addChannelMenu && (
        <div
          className="workspace-context-menu"
          style={{ top: addChannelMenu.y, left: addChannelMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="workspace-context-menu-item" onClick={() => {
            setCreatingChannel({ categoryId: addChannelMenu.categoryId, type: 'text' });
            setAddChannelMenu(null);
          }}>
            <Hash size={16} />
            <span>Create Text Channel</span>
          </div>
          <div className="workspace-context-menu-item" onClick={() => {
            setCreatingChannel({ categoryId: addChannelMenu.categoryId, type: 'voice' });
            setAddChannelMenu(null);
          }}>
            <Volume2 size={16} />
            <span>Create Voice Channel</span>
          </div>
          <div className="workspace-context-menu-item" onClick={() => {
            setCreatingChannel({ categoryId: addChannelMenu.categoryId, type: 'task' });
            setAddChannelMenu(null);
          }}>
            <Rocket size={16} />
            <span>Create Task Channel</span>
          </div>
          <div className="workspace-context-menu-item" style={{ color: '#A78BFA', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 4 }} onClick={() => {
            handleCreateAiHrIntent(addChannelMenu.categoryId);
            setAddChannelMenu(null);
          }}>
            <Brain size={16} style={{ color: '#A78BFA' }} />
            <span>Create AI-HR Channel</span>
          </div>
          <div
            className="workspace-context-menu-item"
            style={{ color: '#f23f43' }}
            onClick={async () => {
              const catId = addChannelMenu.categoryId;
              try {
                await deleteCategory(catId);
              } catch (err) {
                console.error('[Dashboard] Failed to delete category:', err);
              }
              setCustomCategories((prev) => prev.filter((cat) => cat.id !== catId));
              const deletedCat = customCategories.find((c) => c.id === catId);
              if (deletedCat?.channels.some((ch) => ch.id === channelId)) {
                navigate('/workspace');
              }
              setAddChannelMenu(null);
            }}
          >
            <Trash2 size={16} />
            <span>Delete Category</span>
          </div>
        </div>
      )}

      {/* Right-click on a channel */}
      {channelContextMenu && (
        <div
          className="workspace-context-menu"
          style={{ top: channelContextMenu.y, left: channelContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="workspace-context-menu-item" onClick={() => {
            if (channelContextMenu.categoryId === 'root') {
              const ch = rootChannels.find((c) => c.id === channelContextMenu.channelId);
              if (ch) setEditingChannel({ categoryId: 'root', channelId: ch.id, name: ch.name, topic: ch.topic });
            } else {
              const cat = customCategories.find((c) => c.id === channelContextMenu.categoryId);
              const ch = cat?.channels.find((c) => c.id === channelContextMenu.channelId);
              if (ch) setEditingChannel({ categoryId: channelContextMenu.categoryId, channelId: ch.id, name: ch.name, topic: ch.topic });
            }
            setChannelContextMenu(null);
          }}>
            <Edit2 size={16} />
            <span>Edit Channel</span>
          </div>
          <div
            className="workspace-context-menu-item"
            style={{ color: '#f23f43' }}
            onClick={async () => {
              const chId = channelContextMenu.channelId;
              let chType: 'text' | 'voice' | 'task' | 'ai-hr' = 'text';
              if (channelContextMenu.categoryId === 'root') {
                chType = rootChannels.find((c) => c.id === chId)?.type ?? 'text';
              } else {
                const cat = customCategories.find((c) => c.id === channelContextMenu.categoryId);
                chType = cat?.channels.find((c) => c.id === chId)?.type ?? 'text';
              }
              try {
                if (chType === 'voice') await deleteVoiceChannel(chId);
                else if (chType === 'task') await deleteTaskChannel(chId);
                else if (chType === 'ai-hr') await deleteAiHrChannel(chId);
                else await deleteChannel(chId);
              } catch (err) {
                console.error('[Dashboard] Failed to delete channel:', err);
              }
              if (channelContextMenu.categoryId === 'root') {
                setRootChannels((prev) => prev.filter((ch) => ch.id !== chId));
              } else {
                setCustomCategories((prev) => prev.map((cat) =>
                  cat.id === channelContextMenu.categoryId
                    ? { ...cat, channels: cat.channels.filter((ch) => ch.id !== chId) }
                    : cat
                ));
              }
              if (chId === channelId) navigate('/workspace');
              setChannelContextMenu(null);
            }}
          >
            <Trash2 size={16} />
            <span>Delete Channel</span>
          </div>
        </div>
      )}

      {/* Edit channel modal */}
      {editingChannel && (
        <EditChannel
          channelId={editingChannel.channelId}
          initialName={editingChannel.name}
          initialTopic={editingChannel.topic}
          onClose={() => setEditingChannel(null)}
          onSave={(newName, newTopic) => {
            if (!newName.trim()) return;
            if (editingChannel.categoryId === 'root') {
              setRootChannels((prev) => prev.map((ch) =>
                ch.id === editingChannel.channelId ? { ...ch, name: newName.trim(), topic: newTopic } : ch
              ));
            } else {
              setCustomCategories((prev) => prev.map((c) =>
                c.id === editingChannel.categoryId
                  ? { ...c, channels: c.channels.map((ch) => ch.id === editingChannel.channelId ? { ...ch, name: newName.trim(), topic: newTopic } : ch) }
                  : c
              ));
            }
          }}
          onDelete={() => {
            if (editingChannel.categoryId === 'root') {
              setRootChannels((prev) => prev.filter((ch) => ch.id !== editingChannel.channelId));
            } else {
              setCustomCategories((prev) => prev.map((c) =>
                c.id === editingChannel.categoryId
                  ? { ...c, channels: c.channels.filter((ch) => ch.id !== editingChannel.channelId) }
                  : c
              ));
            }
            setEditingChannel(null);
          }}
        />
      )}

      {/* Workspace + menu */}
      {workspaceMenu && (
        <div
          className="workspace-context-menu"
          style={{ top: workspaceMenu.y, left: workspaceMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="workspace-context-menu-item" onClick={() => { setShowWorkspaceSettings(true); setWorkspaceMenu(null); }}>
            <Settings size={16} />
            <span>Workspace settings</span>
          </div>
          <div className="workspace-context-menu-item" onClick={() => { setCreatingCategory(true); setWorkspaceMenu(null); }}>
            <Plus size={16} />
            <span>Create category</span>
          </div>
          <div className="workspace-context-menu-item" onClick={() => { setCreatingRootChannel({ type: 'text' }); setWorkspaceMenu(null); }}>
            <Hash size={16} />
            <span>Create text channel</span>
          </div>
          <div className="workspace-context-menu-item" onClick={() => { setCreatingRootChannel({ type: 'voice' }); setWorkspaceMenu(null); }}>
            <Volume2 size={16} />
            <span>Create voice channel</span>
          </div>
          <div className="workspace-context-menu-item"
            onClick={() => { setCreatingRootChannel({ type: 'task' }); setWorkspaceMenu(null); }}>
            <Rocket size={16} style={{ color: '#A78BFA' }} />
            <span style={{ color: '#A78BFA' }}>Create task channel</span>
          </div>
          <div className="workspace-context-menu-item" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 4 }}
            onClick={() => { handleCreateAiHrIntent(); setWorkspaceMenu(null); }}>
            <Brain size={16} style={{ color: '#c4b5fd' }} />
            <span style={{ color: '#c4b5fd' }}>Create AI-HR channel</span>
          </div>
        </div>
      )}

      {showWorkspaceSettings && (
        <WorkspaceSettings
          workspaceName={workspaceName}
          onNameChange={setLocalWorkspaceName}
          onClose={() => setShowWorkspaceSettings(false)}
          currentUser={currentUser}
        />
      )}

      <SubscriptionLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => {
          setShowLimitModal(false);
          setShowUpgradeModal(true);
        }}
        resourceName={limitModalResource}
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

      {existingAiHrPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#0f0f12] border border-[rgba(255,255,255,0.1)] p-6 rounded-2xl shadow-2xl max-w-sm w-full relative">
            <h2 className="text-white text-lg font-bold mb-4 font-display">AI-HR Already Exists</h2>
            <p className="text-text-secondary text-sm mb-6">
              You can only have one AI-HR assistant per workspace. Do you want to delete the old one and start new, or use the existing one?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                className="w-full py-2 bg-purple-primary hover:bg-purple-light text-white rounded-lg font-medium transition-colors"
                onClick={() => {
                  if (existingAiHrPrompt) {
                    navigate(`/workspace/channel/${existingAiHrPrompt.existingChannelId}`);
                  }
                  setExistingAiHrPrompt(null);
                }}
              >
                Use Existing
              </button>
              <button 
                className="w-full py-2 bg-[rgba(255,63,63,0.1)] hover:bg-[rgba(255,63,63,0.2)] text-[#FF3F3F] rounded-lg font-medium transition-colors border border-[rgba(255,63,63,0.2)]"
                onClick={async () => {
                  if (!existingAiHrPrompt) return;
                  try {
                    await deleteAiHrChannel(existingAiHrPrompt.existingChannelId);
                    setRootChannels(prev => prev.filter(c => c.id !== existingAiHrPrompt.existingChannelId));
                    setCustomCategories(prev => prev.map(cat => ({...cat, channels: cat.channels.filter(c => c.id !== existingAiHrPrompt.existingChannelId)})));
                    
                    if (existingAiHrPrompt.categoryId) {
                      setCreatingChannel({ categoryId: existingAiHrPrompt.categoryId, type: 'ai-hr' });
                    } else {
                      setCreatingRootChannel({ type: 'ai-hr' });
                    }
                  } catch (err) {
                    console.error("Failed to delete old AI-HR channel:", err);
                  }
                  setExistingAiHrPrompt(null);
                }}
              >
                Delete Old & Start New
              </button>
              <button 
                className="w-full py-2 text-text-tertiary hover:text-white transition-colors"
                onClick={() => setExistingAiHrPrompt(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Wrap DashboardInner with SubscriptionProvider
const Dashboard: React.FC = () => (
  <SubscriptionProvider isAdmin={true}>
    <DashboardInner />
  </SubscriptionProvider>
);

export default Dashboard;

