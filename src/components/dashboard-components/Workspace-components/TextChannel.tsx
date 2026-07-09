import React, { useState, useEffect, useRef, type MouseEvent } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Hash, Bell, Pin, Users, Plus, Smile, MessageSquare, Sparkles, Send, MoreHorizontal } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { chatSocket } from '../../../services/chatSocket';
import { fetchMembers } from '../../../api/members';
import type { TeamMember } from '../../../api/members';
import { fetchRoles } from '../../../api/roles';
import type { Role } from '../../../api/roles';

export interface ChatMessage {
  roomId: string;
  timestamp: string;
  messageId: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  reactions?: { [emoji: string]: string[] };
}

// Helper to ensure role colors are legible against the dark chat background
const makeColorReadableOnDark = (hexColor: string) => {
  if (!hexColor || !hexColor.startsWith('#')) return hexColor;
  let c = hexColor.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length !== 6) return hexColor;
  
  let r = parseInt(c.slice(0, 2), 16);
  let g = parseInt(c.slice(2, 4), 16);
  let b = parseInt(c.slice(4, 6), 16);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  
  if (luminance < 140) { // If it's too dark
    const blend = (140 - luminance) / 140 * 0.85; // blend towards white
    r = Math.round(r + (255 - r) * blend);
    g = Math.round(g + (255 - g) * blend);
    b = Math.round(b + (255 - b) * blend);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
  return hexColor;
};

const ALLOWED_REACTIONS = ['✅', '❌', '😂', '🔥', '😡'];

interface TextChannelProps {
  roomId: string;
  channelName?: string;
  channelDescription?: string;
  currentUserProfile?: { id: string, name: string, role: string, isTeamMember: boolean } | null;
}

const TextChannel: React.FC<TextChannelProps> = ({ 
  roomId,
  channelName = 'general', 
  channelDescription = "Welcome to the channel!",
  currentUserProfile
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  
  // Mentions State
  const [membersList, setMembersList] = useState<TeamMember[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const typingTimeoutRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Spotlight Effect State for Input Area
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const inputSpotlight = useMotionTemplate`
    radial-gradient(
      250px circle at ${mouseX}px ${mouseY}px,
      rgba(124, 58, 237, 0.25),
      transparent 80%
    )
  `;

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const token = sessionStorage.getItem('accessToken');
  
  const currentUser = {
    id: currentUserProfile?.id || 'unknown',
    username: currentUserProfile?.name || 'Anonymous'
  };

  // Fetch roles and members to map userIds to role colors
  useEffect(() => {
    const loadUserColors = async () => {
      try {
        const [members, roles] = await Promise.all([fetchMembers(), fetchRoles()]);
        setMembersList(members);
        setRolesList(roles);
        const roleColorMap = new Map(roles.map(r => [r.id, r.color]));
        const colors: Record<string, string> = {};
        members.forEach(m => {
          if (m.roleId) {
            const color = roleColorMap.get(m.roleId);
            if (color) colors[m.id] = makeColorReadableOnDark(color);
          }
        });
        setUserColors(colors);
      } catch (err) {
        console.error('Failed to load members or roles for colors', err);
      }
    };
    loadUserColors();
  }, []);

  useEffect(() => {
    if (!roomId) return;

    // Fetch history
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/rooms/${roomId}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success && data.data) {
          setMessages(data.data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    fetchHistory();

    // 2. Connect WebSocket
    chatSocket.connect();
    chatSocket.joinRoom(roomId, currentUser);

    const handleMessage = (data: any) => {
      if (data.roomId && data.roomId !== roomId) return; // ignore messages from other rooms

      if (data.type === 'message') {
        setMessages(prev => [...prev, data as ChatMessage]);
        if (data.username === typingUser) setTypingUser(null);
      } else if (data.type === 'typing') {
        if (data.user !== currentUser.username) {
          setTypingUser(data.user);
          if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => setTypingUser(null), 3000);
        }
      } else if (data.type === 'reaction') {
        setMessages(prev => prev.map(msg => {
          if (msg.messageId === data.messageId) {
            const currentReactions = msg.reactions || {};
            const usersForEmoji = currentReactions[data.emoji] || [];
            
            let newUsers;
            if (usersForEmoji.includes(data.userId)) {
              newUsers = usersForEmoji.filter((id: string) => id !== data.userId);
            } else {
              newUsers = [...usersForEmoji, data.userId];
            }

            return {
              ...msg,
              reactions: {
                ...currentReactions,
                [data.emoji]: newUsers
              }
            };
          }
          return msg;
        }));
      }
    };

    const unsubscribe = chatSocket.onMessage(handleMessage);

    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, [roomId, token, currentUser.username, typingUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId) return;

    chatSocket.sendMessage(roomId, newMessage.trim(), currentUser);
    setNewMessage('');
  };

  const filteredItems = React.useMemo(() => {
    if (!showMentions) return [];
    const q = mentionQuery.toLowerCase();
    const matchedMembers = membersList
      .filter(m => m.username.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q)))
      .map(m => ({ type: 'member', id: m.id, name: m.username, color: userColors[m.id] || 'white' }));
    const matchedRoles = rolesList
      .filter(r => r.name.toLowerCase().includes(q))
      .map(r => ({ type: 'role', id: r.id, name: r.name, color: makeColorReadableOnDark(r.color) }));
    return [...matchedMembers, ...matchedRoles].slice(0, 8);
  }, [showMentions, mentionQuery, membersList, rolesList, userColors]);

  const insertMention = React.useCallback((name: string) => {
    const before = newMessage.substring(0, mentionIndex);
    const after = newMessage.substring(inputRef.current?.selectionEnd || newMessage.length);
    const newValue = before + '@' + name + ' ' + after;
    setNewMessage(newValue);
    setShowMentions(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = before.length + name.length + 2;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [newMessage, mentionIndex]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);

    const cursor = e.target.selectionStart || 0;
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

    chatSocket.typing(roomId, currentUser);
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const handleReact = (messageId: string, emoji: string) => {
    chatSocket.react(roomId, messageId, emoji, currentUser);
    setActiveReactionMenu(null);
  };

  // Helper to render message with colored mentions
  const renderMessageContent = (text: string) => {
    const sortedMentions = [...membersList.map(m => m.username), ...rolesList.map(r => r.name)]
      .sort((a, b) => b.length - a.length);

    if (sortedMentions.length === 0) return text;

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(@(?:${sortedMentions.map(escapeRegex).join('|')}))(?![\\w])`, 'g');
    
    const parts = text.split(pattern);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        const member = membersList.find(m => m.username === name);
        const role = rolesList.find(r => r.name === name);
        let color = 'white';
        if (member) {
          color = userColors[member.id] || 'white';
        } else if (role) {
          color = makeColorReadableOnDark(role.color);
        }
        
        return (
          <span key={i} className="font-bold rounded-sm px-0.5 mx-0.5 inline-block" style={{ color, backgroundColor: `${color}1A`, textShadow: `0 0 10px ${color}80` }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getMentionGlowColor = (text: string): string | null => {
    if (text.includes(`@${currentUser.username}`)) {
      return userColors[currentUser.id] || '#A78BFA';
    }
    const userMemberInfo = membersList.find(m => m.id === currentUser.id);
    if (userMemberInfo && userMemberInfo.roleName && text.includes(`@${userMemberInfo.roleName}`)) {
      const role = rolesList.find(r => r.name === userMemberInfo.roleName);
      if (role) return makeColorReadableOnDark(role.color);
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative z-10 overflow-hidden">
      
      {/* Decorative side accent lines */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-purple-primary/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-purple-primary/20 to-transparent pointer-events-none" />

      {/* Topbar */}
      <div className="h-[64px] min-h-[64px] px-6 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between bg-[rgba(10,10,12,0.6)] backdrop-blur-3xl z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(124,58,237,0.1)] border border-[rgba(124,58,237,0.2)] flex items-center justify-center">
            <Hash size={20} className="text-purple-light" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-display font-bold text-[18px] text-white tracking-wide leading-tight">{channelName}</h2>
            <p className="text-[12px] text-text-tertiary truncate max-w-[300px] leading-tight">{channelDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2.5 text-text-tertiary hover:text-white rounded-xl transition-all group" title="Threads">
            <div className="absolute inset-0 bg-[rgba(255,255,255,0.04)] rounded-xl scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
            <MessageSquare size={18} strokeWidth={2} className="relative z-10" />
          </button>
          <button className="relative p-2.5 text-text-tertiary hover:text-white rounded-xl transition-all group" title="Notifications">
            <div className="absolute inset-0 bg-[rgba(255,255,255,0.04)] rounded-xl scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
            <Bell size={18} strokeWidth={2} className="relative z-10" />
          </button>
          <button className="relative p-2.5 text-text-tertiary hover:text-white rounded-xl transition-all group" title="Pinned Messages">
            <div className="absolute inset-0 bg-[rgba(255,255,255,0.04)] rounded-xl scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
            <Pin size={18} strokeWidth={2} className="relative z-10" />
          </button>
          <div className="w-[1px] h-6 bg-[rgba(255,255,255,0.1)] mx-2" />
          <button className="relative p-2.5 text-text-tertiary hover:text-white rounded-xl transition-all group" title="Show Member List">
            <div className="absolute inset-0 bg-[rgba(255,255,255,0.04)] rounded-xl scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
            <Users size={18} strokeWidth={2} className="relative z-10" />
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 custom-scrollbar flex flex-col relative z-10 scroll-smooth">
        <div className="flex flex-col justify-end min-h-full max-w-[1000px] mx-auto w-full">
          
          {/* Creative Welcome Banner */}
          <div className="mb-12 text-center mt-auto flex flex-col items-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="relative w-24 h-24 mb-6"
            >
              <div className="absolute inset-0 bg-purple-primary/30 blur-[30px] rounded-full animate-pulse" />
              <div className="relative w-full h-full rounded-[28px] bg-[rgba(20,20,24,0.8)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] shadow-[inset_0_0_20px_rgba(124,58,237,0.2)] flex items-center justify-center overflow-hidden">
                <Hash size={48} className="text-purple-light drop-shadow-[0_0_15px_rgba(124,58,237,0.8)]" />
                {/* Micro animation lines inside the box */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-light to-transparent opacity-50" />
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-purple-light to-transparent opacity-50" />
              </div>
            </motion.div>
            <h1 className="font-display font-bold text-5xl text-white tracking-tight mb-3">
              Welcome to <span className="relative">
                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-light via-fuchsia-400 to-purple-light">#{channelName}</span>
                <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-primary to-transparent rounded-full" />
              </span>
            </h1>
            <p className="text-[16px] text-text-secondary max-w-[500px] leading-relaxed">
              This is the start of the #{channelName} channel. <br/>{channelDescription}
            </p>
          </div>

          {/* Message List */}
          <div className="flex flex-col gap-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isConsecutive = idx > 0 && messages[idx - 1].username === msg.username && (new Date(msg.timestamp).getTime() - new Date(messages[idx - 1].timestamp).getTime() < 300000); // 5 mins
                const isCurrentUser = msg.username === currentUser.username;
                const glowColor = getMentionGlowColor(msg.message);
                const bubbleStyle = glowColor ? {
                  backgroundColor: `${glowColor}1A`, 
                  borderColor: `${glowColor}80`,    
                  boxShadow: `0 0 20px ${glowColor}33`
                } : undefined;
                
                return (
                  <motion.div 
                    key={msg.messageId} 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={`flex gap-4 group ${isConsecutive ? '-mt-4' : ''} ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {!isConsecutive ? (
                      <div className="relative w-11 h-11 shrink-0">
                        {/* Rotating glowing halo behind avatar */}
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-purple-primary via-fuchsia-500 to-purple-primary opacity-0 group-hover:opacity-30 blur-[8px] transition-opacity duration-500 animate-[spin_4s_linear_infinite]" />
                        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-[rgba(40,40,45,1)] to-[rgba(20,20,24,1)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center font-display font-bold shadow-xl overflow-hidden">
                          {/* Inner glass highlight */}
                          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.1)] to-transparent opacity-50" />
                          <span 
                            className="relative z-10 text-lg drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                            style={{ color: userColors[msg.userId] || 'white' }}
                          >
                            {msg.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-11 shrink-0 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-text-tertiary font-medium">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    
                    
                    {/* Message Content & Reactions */}
                    <div className={`flex flex-col min-w-0 max-w-[75%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                      {!isConsecutive && (
                        <div className={`flex items-baseline gap-2 mb-1.5 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span 
                            className="font-display font-bold text-[16px] cursor-pointer hover:brightness-125 transition-all drop-shadow-sm"
                            style={{ color: userColors[msg.userId] || 'white' }}
                          >
                            {msg.username}
                          </span>
                          <span className="text-[11px] text-text-tertiary tracking-wide">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      
                      <div className={`relative flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Creative Message Bubble */}
                        <div 
                          className={`relative px-5 py-3 rounded-[20px] backdrop-blur-md transition-all duration-300 ${
                            isCurrentUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
                          } ${
                            glowColor ? 'border' :
                            isCurrentUser 
                              ? 'bg-gradient-to-br from-[rgba(124,58,237,0.2)] to-[rgba(124,58,237,0.05)] border border-[rgba(124,58,237,0.3)] shadow-[0_4px_20px_rgba(124,58,237,0.15)]' 
                              : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.05)]'
                          }`}
                          style={bubbleStyle}
                        >
                          <div className="text-[15px] text-white leading-relaxed break-words font-sans whitespace-pre-wrap">
                            {renderMessageContent(msg.message)}
                          </div>
                        </div>

                        {/* 3 Dots Reaction Menu Button */}
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button 
                            onClick={() => setActiveReactionMenu(activeReactionMenu === msg.messageId ? null : msg.messageId)}
                            className="p-1.5 rounded-full text-text-tertiary hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {/* Reaction Popover */}
                          <AnimatePresence>
                            {activeReactionMenu === msg.messageId && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                className={`absolute top-1/2 -translate-y-1/2 ${isCurrentUser ? 'right-[120%]' : 'left-[120%]'} z-50 flex items-center gap-1 p-1.5 bg-[rgba(15,15,18,0.95)] backdrop-blur-3xl border border-[rgba(255,255,255,0.1)] rounded-full shadow-xl`}
                              >
                                {ALLOWED_REACTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReact(msg.messageId, emoji)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] hover:scale-110 transition-all text-lg"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Reactions Display (Bottom Left) */}
                      {msg.reactions && Object.keys(msg.reactions).some(emoji => msg.reactions![emoji].length > 0) && (
                        <div className={`flex flex-wrap gap-1 mt-1.5 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                            if (users.length === 0) return null;
                            const hasReacted = users.includes(currentUser.id);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msg.messageId, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium transition-colors border ${
                                  hasReacted 
                                    ? 'bg-[rgba(124,58,237,0.2)] border-[rgba(124,58,237,0.4)] text-purple-light' 
                                    : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-text-secondary hover:bg-[rgba(255,255,255,0.08)]'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{users.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {/* Creative Typing Indicator */}
            <AnimatePresence>
              {typingUser && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  className="flex gap-4 items-end mt-2"
                >
                  <div className="w-11 h-11 shrink-0 rounded-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center">
                    <Sparkles size={16} className="text-purple-light animate-pulse" />
                  </div>
                  <div className="px-5 py-3 rounded-[20px] rounded-tl-sm bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] backdrop-blur-md flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-purple-light shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.15 }} className="w-1.5 h-1.5 rounded-full bg-purple-light shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                      <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut", delay: 0.3 }} className="w-1.5 h-1.5 rounded-full bg-purple-light shadow-[0_0_8px_rgba(124,58,237,0.8)]" />
                    </div>
                    <span className="text-[13px] text-purple-light font-medium">{typingUser} is typing...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Input area with Mouse Spotlight */}
      <div className="px-4 md:px-8 pb-8 pt-2 shrink-0 relative z-20 max-w-[1000px] w-full mx-auto">
        <form 
          onSubmit={handleSendMessage} 
          onMouseMove={handleMouseMove}
          className="group relative flex items-center bg-[rgba(15,15,18,0.7)] backdrop-blur-3xl border border-[rgba(255,255,255,0.08)] rounded-2xl px-5 py-3 min-h-[64px] transition-all duration-300 focus-within:border-[rgba(124,58,237,0.5)] focus-within:shadow-[0_0_30px_rgba(124,58,237,0.2)]"
        >
          {/* Spotlight Effect that follows cursor inside the input */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition duration-500 group-hover:opacity-100 z-0 overflow-hidden"
            style={{ background: inputSpotlight }}
          />

          {/* Inner glass highlight */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[rgba(255,255,255,0.03)] to-transparent pointer-events-none z-0" />

          <button 
            type={newMessage.trim() ? "submit" : "button"}
            className={`relative z-10 w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center transition-all hover:scale-105 mr-4 shrink-0 shadow-[0_4px_15px_rgba(0,0,0,0.2)] ${
              newMessage.trim() 
                ? 'bg-purple-primary text-white border-purple-primary hover:bg-purple-light' 
                : 'text-text-secondary hover:bg-purple-primary hover:text-white hover:border-purple-primary hover:rotate-90'
            }`}
          >
            {newMessage.trim() ? <Send size={18} strokeWidth={2.5} className="-ml-0.5" /> : <Plus size={20} strokeWidth={2.5} />}
          </button>
          
          {/* Mentions Dropdown */}
          <AnimatePresence>
            {showMentions && filteredItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-[calc(100%+8px)] left-16 w-[300px] bg-[rgba(15,15,18,0.95)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 flex flex-col py-1.5"
              >
                {filteredItems.map((item, idx) => (
                  <button
                    key={item.id + item.type}
                    type="button"
                    onClick={() => insertMention(item.name)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
                      idx === selectedIndex 
                        ? 'bg-[rgba(124,58,237,0.2)]' 
                        : 'hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
                  >
                    {item.type === 'member' ? (
                      <div className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[12px] font-bold" style={{ color: item.color }}>
                        {item.name.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: item.color + '33' }}>
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      </div>
                    )}
                    <span className="text-[14px] font-medium text-white">{item.name}</span>
                    <span className="text-[10px] text-text-tertiary uppercase ml-auto font-bold tracking-wider">{item.type}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <input 
            ref={inputRef}
            type="text" 
            className="relative z-10 flex-1 bg-transparent border-none text-[16px] text-white placeholder-text-tertiary outline-none min-w-0 py-2 font-sans" 
            placeholder={`Message #${channelName}`} 
            value={newMessage}
            onChange={handleTyping}
            onKeyDown={handleInputKeyDown}
            onBlur={() => setTimeout(() => setShowMentions(false), 200)}
          />
          
          <div className="relative z-10 flex items-center gap-1.5 ml-4 shrink-0">
            {/* Emoji Picker Popover */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-[110%] right-0 mb-2 z-50 shadow-2xl"
                >
                  <EmojiPicker 
                    theme={Theme.DARK} 
                    onEmojiClick={onEmojiClick}
                    lazyLoadEmojis={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 text-text-tertiary hover:text-yellow-400 hover:bg-[rgba(255,255,255,0.06)] hover:shadow-[0_0_15px_rgba(250,204,21,0.2)] rounded-xl transition-all hover:scale-110" 
              title="Emoji"
            >
              <Smile size={22} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TextChannel;
