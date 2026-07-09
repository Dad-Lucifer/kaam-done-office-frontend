import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import type { ResourceType } from '../../config/plans';

interface PlanLimitBannerProps {
  /** Show banner only for this specific resource type, or all if undefined */
  resourceType?: ResourceType;
  onUpgradeClick?: () => void;
  /** 0–1 threshold for showing (default 0.8 = 80%) */
  threshold?: number;
  className?: string;
  style?: React.CSSProperties;
}

const RESOURCE_LABELS: Record<ResourceType, string> = {
  category:     'categories',
  textChannel:  'text channels',
  voiceChannel: 'voice channels',
  task:         'tasks',
  teamMember:   'team members',
  role:         'roles',
};

const NEXT_PLAN: Record<string, string> = {
  free:      'Essential',
  essential: 'Growth',
  growth:    'Scale',
  scale:     'Scale',
};

/**
 * PlanLimitBanner — a non-blocking warning strip shown when a resource
 * usage reaches 80% (configurable) of the plan limit.
 */
export default function PlanLimitBanner({
  resourceType,
  onUpgradeClick,
  threshold = 0.8,
  className,
  style,
}: PlanLimitBannerProps) {
  const { usage, subscription } = useSubscription();

  if (!usage || !subscription) return null;

  // Determine which resource types are near their limit
  const resourceTypes: ResourceType[] = resourceType
    ? [resourceType]
    : ['category', 'textChannel', 'voiceChannel', 'task', 'teamMember', 'role'];

  interface WarningResource {
    type: ResourceType;
    current: number;
    max: number;
    percent: number;
    isFull: boolean;
  }

  const warnings = resourceTypes
    .map((type): WarningResource | null => {
      const entry = {
        category:     usage.categories,
        textChannel:  usage.textChannels,
        voiceChannel: usage.voiceChannels,
        task:         usage.tasks,
        teamMember:   usage.teamMembers,
        role:         usage.roles,
      }[type];

      if (!entry || entry.max === 0) return null;
      const percent = entry.current / entry.max;
      if (percent < threshold) return null;

      return { type, current: entry.current, max: entry.max, percent, isFull: entry.current >= entry.max };
    })
    .filter(Boolean) as WarningResource[];

  if (warnings.length === 0) return null;

  const nextPlan = NEXT_PLAN[subscription.planId] || 'Growth';
  const isScale = subscription.planId === 'scale';

  const firstWarning = warnings[0];
  const allFull = warnings.every(w => w.isFull);
  const color = allFull ? '#ef4444' : '#f59e0b';
  const bgColor = allFull ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)';
  const borderColor = allFull ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)';

  const resourceText = warnings.length === 1
    ? `${RESOURCE_LABELS[firstWarning.type]} (${firstWarning.current}/${firstWarning.max})`
    : `${warnings.length} resources`;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        margin: '8px 12px',
        fontFamily: "'Inter', sans-serif",
        ...style,
      }}
    >
      <span style={{ fontSize: 16 }}>{allFull ? '🚫' : '⚠️'}</span>

      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, flex: 1, lineHeight: 1.4 }}>
        {allFull
          ? `You've reached your ${subscription.planName} plan limit for ${resourceText}.`
          : `You're approaching your ${subscription.planName} plan limit for ${resourceText}.`}
        {!isScale && (
          <span style={{ color, fontWeight: 600 }}>
            {' '}Upgrade to {nextPlan} for more.
          </span>
        )}
      </span>

      {!isScale && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            background: `linear-gradient(135deg, ${color}40, ${color}20)`,
            border: `1px solid ${color}60`,
            borderRadius: 8,
            color,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${color}30`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = `${color}20`;
          }}
        >
          Upgrade ↗
        </button>
      )}
    </div>
  );
}
