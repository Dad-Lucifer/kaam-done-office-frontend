import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';

interface SubscriptionPanelProps {
  onUpgradeClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active:    '#10b981',
  trial:     '#6366f1',
  expired:   '#ef4444',
  cancelled: '#ef4444',
};

const PLAN_COLORS: Record<string, string> = {
  free:      '#64748b',
  essential: '#10b981',
  growth:    '#6366f1',
  scale:     '#f59e0b',
};

function UsageBar({ label, current, max, color }: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isWarning = pct >= 80 && pct < 100;
  const isFull = pct >= 100;
  const barColor = isFull ? '#ef4444' : isWarning ? '#f59e0b' : color;
  const displayMax = max >= 9999 ? '∞' : max;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{
          color: isFull ? '#ef4444' : isWarning ? '#f59e0b' : 'rgba(255,255,255,0.5)',
          fontSize: 12,
          fontWeight: 600,
        }}>
          {current}/{displayMax}
        </span>
      </div>
      <div style={{
        width: '100%',
        height: 6,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 99,
        overflow: 'hidden',
      }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: max >= 9999
              ? `linear-gradient(90deg, ${barColor}80, ${barColor}40)`
              : `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
            borderRadius: 99,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

/**
 * SubscriptionPanel — displays the current plan status + all usage bars.
 * Designed to be embedded in the sidebar or a modal.
 */
export default function SubscriptionPanel({ onUpgradeClick, style, className }: SubscriptionPanelProps) {
  const { subscription, usage, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div style={{
        padding: '20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
      }}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.2)',
          borderTopColor: '#6366f1',
          animation: 'spin 0.8s linear infinite',
          display: 'inline-block',
        }} />
        Loading plan…
      </div>
    );
  }

  if (!subscription || !usage) return null;

  const planColor = PLAN_COLORS[subscription.planId] || '#6366f1';
  const statusColor = STATUS_COLORS[subscription.status] || '#64748b';
  const isScale = subscription.planId === 'scale';

  const expiryText = subscription.expiryDate
    ? new Date(subscription.expiryDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Never expires';

  return (
    <div
      className={className}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '18px 16px',
        fontFamily: "'Inter', sans-serif",
        ...style,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: planColor,
              boxShadow: `0 0 6px ${planColor}`,
            }} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
              {subscription.planName} Plan
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{
              color: statusColor,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>
              ● {subscription.status}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{expiryText}</span>
          </div>
        </div>

        {!isScale && (
          <button
            onClick={onUpgradeClick}
            style={{
              padding: '6px 12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: 0.3,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 16px rgba(99,102,241,0.45)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(99,102,241,0.35)';
            }}
          >
            Upgrade ↗
          </button>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 14 }} />

      {/* Usage bars */}
      <UsageBar label="Categories"    current={usage.categories.current}    max={usage.categories.max}    color={planColor} />
      <UsageBar label="Text Channels" current={usage.textChannels.current}  max={usage.textChannels.max}  color={planColor} />
      <UsageBar label="Voice Channels" current={usage.voiceChannels.current} max={usage.voiceChannels.max} color={planColor} />
      <UsageBar label="Tasks"         current={usage.tasks.current}         max={usage.tasks.max}         color={planColor} />
      <UsageBar label="Team Members"  current={usage.teamMembers.current}   max={usage.teamMembers.max}   color={planColor} />
      <UsageBar label="Roles"         current={usage.roles.current}         max={usage.roles.max}         color={planColor} />
    </div>
  );
}
