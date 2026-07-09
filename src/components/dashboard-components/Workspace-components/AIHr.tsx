import React, {
  useState, useEffect, useRef, useCallback, memo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, User, Sparkles, RefreshCw, X,
  ChevronDown, AlertCircle, CheckCircle2, Clock,
  TrendingUp, Zap, MessageSquare, BarChart3,
  Loader2, Target, Shield, Brain, Database,
} from 'lucide-react';
import './AIHr.css';
import { sendAiHrMessage, getAiHrChatHistory, type AiHrChatResponse } from '../../../api/aiHr';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ContextStats {
  tasksLoaded: number;
  channelsLoaded: number;
  overdueCount: number;
  completionRate: number;
  totalHoursTracked: number;
  modelUsed: string;
  tablesQueried: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Very light markdown renderer: bold, bullet lists, numbered lists, inline code */
function renderMessageContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Code Blocks
    if (line.trim().startsWith('```')) {
      const language = line.trim().replace('```', '');
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={`code_${i}`} className="aihr-code-block">
          {language && <div className="aihr-code-lang">{language}</div>}
          <pre><code>{codeLines.join('\n')}</code></pre>
        </div>
      );
      i++;
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const parsedTable = tableLines.map(tLine =>
        tLine.split('|').map(cell => cell.trim()).filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)
      );

      const hasHeader = parsedTable.length > 1 && parsedTable[1].every(cell => cell.includes('-'));

      elements.push(
        <div key={`table_${i}`} className="aihr-table-container">
          <div className="aihr-table-wrapper">
            <table className="aihr-table">
              {hasHeader && (
                <thead>
                  <tr>
                    {parsedTable[0].map((cell, cIdx) => <th key={`th_${cIdx}`}>{renderInline(cell)}</th>)}
                  </tr>
                </thead>
              )}
              <tbody>
                {parsedTable.slice(hasHeader ? 2 : 0).map((row, rIdx) => (
                  <tr key={`tr_${rIdx}`}>
                    {row.map((cell, cIdx) => <td key={`td_${cIdx}`}>{renderInline(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={`br_${i}`} className="aihr-spacer" />);
      i++;
      continue;
    }

    // Bullet list item
    const bulletMatch = line.match(/^[-•*]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={`list_${i}`} className="aihr-list-item">
          <span className="aihr-bullet">▸</span>
          <span>{renderInline(bulletMatch[1])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={`nlist_${i}`} className="aihr-list-item">
          <span className="aihr-bullet aihr-bullet-num">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      );
      i++;
      continue;
    }

    // Heading-like (### or **)
    const headingMatch = line.match(/^#{1,4}\s+(.+)/);
    if (headingMatch) {
      elements.push(
        <div key={`head_${i}`} className="aihr-section-heading">
          {renderInline(headingMatch[1])}
        </div>
      );
      i++;
      continue;
    }

    elements.push(<div key={`line_${i}`} className="aihr-line">{renderInline(line)}</div>);
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold (**text** or __text__)
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);
  return parts.map((part, i) => {
    if (/^\*\*.*\*\*$/.test(part) || /^__.*__$/.test(part)) {
      const inner = part.slice(2, -2);
      return <strong key={i} className="aihr-bold">{inner}</strong>;
    }
    // Inline code `text`
    const codeParts = part.split(/(`[^`]+`)/g);
    if (codeParts.length > 1) {
      return codeParts.map((cp, j) => {
        if (/^`.*`$/.test(cp)) {
          return <code key={j} className="aihr-inline-code">{cp.slice(1, -1)}</code>;
        }
        return <React.Fragment key={j}>{cp}</React.Fragment>;
      });
    }
    return part;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TypingIndicator = memo(() => (
  <div className="aihr-typing-indicator">
    <div className="aihr-typing-dot" />
    <div className="aihr-typing-dot" />
    <div className="aihr-typing-dot" />
  </div>
));

const StatsBar = memo(({ stats }: { stats: ContextStats }) => (
  <div className="aihr-stats-bar">
    <div className="aihr-stat-pill">
      <Target size={11} />
      <span>{stats.tasksLoaded} tasks</span>
    </div>
    <div className="aihr-stat-pill">
      <MessageSquare size={11} />
      <span>{stats.channelsLoaded} channels</span>
    </div>
    <div className={`aihr-stat-pill ${stats.overdueCount > 0 ? 'aihr-stat-danger' : ''}`}>
      <Clock size={11} />
      <span>{stats.overdueCount} overdue</span>
    </div>
    <div className={`aihr-stat-pill ${stats.completionRate >= 70 ? 'aihr-stat-success' : ''}`}>
      <TrendingUp size={11} />
      <span>{stats.completionRate}% done</span>
    </div>
    <div className="aihr-stat-pill" style={{ color: '#c4b5fd', borderColor: 'rgba(196, 181, 253, 0.2)', backgroundColor: 'rgba(196, 181, 253, 0.1)' }}>
      <Brain size={11} />
      <span>{stats.modelUsed}</span>
    </div>
    <div className="aihr-stat-pill" title={`Queried: ${stats.tablesQueried.join(', ')}`} style={{ color: '#93c5fd', borderColor: 'rgba(147, 197, 253, 0.2)', backgroundColor: 'rgba(147, 197, 253, 0.1)' }}>
      <Database size={11} />
      <span>{stats.tablesQueried.length} tables</span>
    </div>
  </div>
));

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble = memo(({ message }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <motion.div
        className="aihr-system-msg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Sparkles size={12} />
        <span>{message.content}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`aihr-message-row ${isUser ? 'aihr-message-row--user' : 'aihr-message-row--ai'}`}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {!isUser && (
        <div className="aihr-avatar aihr-avatar--ai">
          <Brain size={15} />
        </div>
      )}

      <div className={`aihr-bubble ${isUser ? 'aihr-bubble--user' : 'aihr-bubble--ai'}`}>
        {message.isLoading ? (
          <TypingIndicator />
        ) : (
          <div className="aihr-bubble-content">
            {renderMessageContent(message.content)}
          </div>
        )}
        <span className="aihr-timestamp">{formatTime(message.timestamp)}</span>
      </div>

      {isUser && (
        <div className="aihr-avatar aihr-avatar--user">
          <User size={15} />
        </div>
      )}
    </motion.div>
  );
});

// ── Main Component ────────────────────────────────────────────────────────────

const GREETING_MESSAGE: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: `Hello! I'm **AI-HR**, your intelligent workspace assistant.\n\nI have access to all your workspace task data — assignments, statuses, deadlines, priorities, and channels. Ask me anything!\n\nHere are some things you can ask:\n- What tasks are overdue?\n- Give me a summary of this workspace\n- Which tasks are blocked?\n- Who has the most tasks assigned?`,
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  { icon: <AlertCircle size={13} />, label: 'Overdue tasks', prompt: 'What tasks are currently overdue?' },
  { icon: <Zap size={13} />, label: 'Blocked tasks', prompt: 'Show me all blocked tasks' },
  { icon: <BarChart3 size={13} />, label: 'Workspace summary', prompt: 'Give me a full summary of the workspace tasks and progress' },
  { icon: <CheckCircle2 size={13} />, label: 'Completed this week', prompt: 'What tasks were completed recently?' },
  { icon: <Target size={13} />, label: 'High priority', prompt: 'List all high priority and critical tasks' },
  { icon: <TrendingUp size={13} />, label: 'Team performance', prompt: 'How is the team performing overall?' },
];

interface AIHrProps {
  roomId: string;
}

const AIHr: React.FC<AIHrProps> = ({ roomId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    ...GREETING_MESSAGE,
    id: generateId(),
    timestamp: new Date(),
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [contextStats, setContextStats] = useState<ContextStats | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Track scroll position to show/hide scroll-down button
  const handleScroll = useCallback(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollDown(!isNearBottom);
  }, []);

  // Load history from DB on mount — only runs once per roomId
  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      try {
        const history = await getAiHrChatHistory(roomId);
        if (!mounted) return;
        if (history.length > 0) {
          setMessages(history.map(m => ({
            id: m.id || generateId(),
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp || Date.now()),
            isLoading: false,
          })));
        }
        // If history is empty, leave the greeting already in state
      } catch (err) {
        console.error('Failed to fetch AI-HR history', err);
      }
    };
    fetchHistory();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // intentionally only roomId — no other deps

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    // Safety guard — roomId must always be provided by the parent
    if (!roomId) {
      console.error('[AIHr] Cannot send message: roomId prop is missing.');
      return;
    }

    setError(null);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = '22px';
    }

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    // Add loading placeholder for AI
    const loadingId = generateId();
    const loadingMsg: ChatMessage = {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);
    setSuggestedQuestions([]);

    try {
      const response: AiHrChatResponse = await sendAiHrMessage(roomId, trimmed);

      // Replace loading bubble with real response from API
      const aiMsg: ChatMessage = {
        id: response.message?.id || loadingId,
        role: 'assistant',
        // response.message.content is the persisted DB record
        content: response.message?.content ?? 'Sorry, I could not generate a response.',
        timestamp: new Date(response.message?.timestamp || Date.now()),
        isLoading: false,
      };

      setMessages((prev) => prev.map((m) => (m.id === loadingId ? aiMsg : m)));
      setContextStats(response.contextStats);
      setSuggestedQuestions(response.suggestedQuestions || []);
    } catch (err: unknown) {
      // Prefer the API response body message over the generic axios message
      const axiosErr = err as any;
      const errorMsg =
        axiosErr?.response?.data?.message ||
        (err instanceof Error ? err.message : 'An unexpected error occurred.');

      // Replace loading bubble with error message
      const errorChatMsg: ChatMessage = {
        id: loadingId,
        role: 'assistant',
        content: `I encountered an error: ${errorMsg}\n\nPlease try again or rephrase your question.`,
        timestamp: new Date(),
        isLoading: false,
      };

      setMessages((prev) => prev.map((m) => (m.id === loadingId ? errorChatMsg : m)));
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, roomId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }, [inputValue, sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize textarea smoothly without layout thrashing
    const target = e.target;
    target.style.height = '22px';
    const newHeight = Math.min(target.scrollHeight, 120);
    target.style.height = `${newHeight}px`;
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([{
      ...GREETING_MESSAGE,
      id: generateId(),
      timestamp: new Date(),
    }]);
    setSuggestedQuestions([]);
    setError(null);
    setContextStats(null);
  }, []);

  return (
    <div className="aihr-root">
      {/* Ambient background effects */}
      <div className="aihr-bg-orb aihr-bg-orb--1" />
      <div className="aihr-bg-orb aihr-bg-orb--2" />
      <div className="aihr-grid-overlay" />

      {/* Header */}
      <div className="aihr-header">
        <div className="aihr-header-left">
          <div className="aihr-header-avatar">
            <Brain size={20} />
            <div className="aihr-header-avatar-ring" />
          </div>
          <div className="aihr-header-info">
            <h1 className="aihr-header-title">
              AI-HR Assistant
              <span className="aihr-badge-live">
                <span className="aihr-live-dot" />
                Live
              </span>
            </h1>
            <p className="aihr-header-subtitle">
              Powered by Gemini · Ask anything about your workspace
            </p>
          </div>
        </div>

        <div className="aihr-header-right">
          {contextStats && <StatsBar stats={contextStats} />}
          <button
            className="aihr-icon-btn"
            onClick={clearConversation}
            title="Clear conversation"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div
        className="aihr-chat-body"
        ref={chatBodyRef}
        onScroll={handleScroll}
      >
        <div className="aihr-messages-container">
          <AnimatePresence>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="aihr-error-banner"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
                <button onClick={() => setError(null)}>
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Suggested questions after AI reply */}
          <AnimatePresence>
            {suggestedQuestions.length > 0 && !isLoading && (
              <motion.div
                className="aihr-suggestions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="aihr-suggestions-label">
                  <Sparkles size={11} />
                  Follow-up suggestions
                </span>
                <div className="aihr-suggestion-chips">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      className="aihr-chip"
                      onClick={() => sendMessage(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollDown && (
            <motion.button
              className="aihr-scroll-btn"
              onClick={() => scrollToBottom()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Quick prompts — shown when conversation is fresh */}
      {messages.length <= 1 && (
        <div className="aihr-quick-prompts">
          <p className="aihr-quick-label">Quick actions</p>
          <div className="aihr-quick-grid">
            {QUICK_PROMPTS.map((qp, i) => (
              <motion.button
                key={i}
                className="aihr-quick-btn"
                onClick={() => sendMessage(qp.prompt)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="aihr-quick-icon">{qp.icon}</span>
                <span className="aihr-quick-text">{qp.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="aihr-input-area">
        <div className="aihr-input-wrapper">
          <textarea
            ref={inputRef}
            className="aihr-textarea"
            placeholder="Ask about tasks, assignments, deadlines, performance..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <div className="aihr-input-actions">
            <button
              className={`aihr-send-btn ${isLoading ? 'aihr-send-btn--loading' : ''} ${inputValue.trim() ? 'aihr-send-btn--active' : ''}`}
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <Loader2 size={16} className="aihr-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
        <p className="aihr-input-hint">
          <Shield size={10} />
          AI-HR only accesses your workspace task data. Shift+Enter for new line.
        </p>
      </div>
    </div>
  );
};

export default AIHr;
