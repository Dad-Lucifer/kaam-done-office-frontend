import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';

interface SubscriptionGateProps {
  children: React.ReactNode;
  onUpgradeClick?: () => void;
}

const STATUS_CONFIG = {
  expired: {
    icon: '⏰',
    title: 'Your Subscription Has Expired',
    subtitle: 'Renew your plan to restore full access to your workspace.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
  },
  cancelled: {
    icon: '🚫',
    title: 'Subscription Cancelled',
    subtitle: 'Your subscription was cancelled. Upgrade to regain access.',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))',
  },
  none: {
    icon: '✨',
    title: 'Welcome to WorkNest',
    subtitle: 'Choose a plan to unlock your full workspace.',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
  },
};

/**
 * SubscriptionGate — blocks workspace access if no active subscription.
 * Renders children normally when subscription is active.
 */
export default function SubscriptionGate({ children, onUpgradeClick }: SubscriptionGateProps) {
  const { subscription, isLoading, isActive } = useSubscription();

  // Don't block while loading
  if (isLoading) return <>{children}</>;

  // Active subscription — render workspace normally
  if (isActive) return <>{children}</>;

  const statusKey = subscription?.status === 'expired'
    ? 'expired'
    : subscription?.status === 'cancelled'
    ? 'cancelled'
    : 'none';

  const cfg = STATUS_CONFIG[statusKey];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
      zIndex: 1000,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%),
                          radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.08) 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      {/* Gate card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: '56px 48px',
        maxWidth: 520,
        width: '90%',
        textAlign: 'center',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Status indicator */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: cfg.gradient,
          border: `2px solid ${cfg.color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          margin: '0 auto 28px',
        }}>
          {cfg.icon}
        </div>

        <h1 style={{
          color: '#fff',
          fontSize: 26,
          fontWeight: 700,
          margin: '0 0 12px',
          letterSpacing: '-0.5px',
        }}>
          {cfg.title}
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.55)',
          fontSize: 15,
          lineHeight: 1.6,
          margin: '0 0 36px',
        }}>
          {cfg.subtitle}
        </p>

        {/* Plan badges */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginBottom: 32,
          flexWrap: 'wrap',
        }}>
          {[
            { name: 'Essential', price: '₹250/yr', color: '#10b981' },
            { name: 'Growth', price: '₹799/yr', color: '#6366f1', popular: true },
            { name: 'Scale', price: '₹1,999/yr', color: '#f59e0b' },
          ].map(p => (
            <div key={p.name} style={{
              background: `${p.color}15`,
              border: `1px solid ${p.color}30`,
              borderRadius: 12,
              padding: '10px 18px',
              position: 'relative',
            }}>
              {p.popular && (
                <span style={{
                  position: 'absolute',
                  top: -8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: p.color,
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 20,
                  letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                }}>POPULAR</span>
              )}
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{p.name}</div>
              <div style={{ color: p.color, fontSize: 12, fontWeight: 600, marginTop: 2 }}>{p.price}</div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={onUpgradeClick}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none',
            borderRadius: 14,
            color: '#fff',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: 0.3,
            transition: 'all 0.2s ease',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 12px 32px rgba(99,102,241,0.5)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)';
          }}
        >
          🚀 Upgrade Now — Unlock Full Access
        </button>

        {subscription && (
          <p style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 12,
            marginTop: 16,
          }}>
            Current plan: <span style={{ color: 'rgba(255,255,255,0.5)' }}>{subscription.planName}</span>
            {' · '}Status: <span style={{ color: cfg.color }}>{subscription.status}</span>
          </p>
        )}
      </div>
    </div>
  );
}
