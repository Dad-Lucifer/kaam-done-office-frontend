// ─────────────────────────────────────────────────────────────────────────────
// Plan Configuration — Frontend Source of Truth
//
// Keep in sync with backend/src/config/planConfig.js
// ─────────────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'essential' | 'growth' | 'scale';

export type PlanPermissions = {
  workplaceAccess: boolean;
  taskManagerAccess: boolean;
  analyticsAccess: boolean;
  customRolesAccess: boolean;
  advancedPermissionsAccess: boolean;
  auditLogsAccess: boolean;
};

export type PlanLimits = {
  maxCategories: number;
  maxTextChannels: number;
  maxVoiceChannels: number;
  maxTasks: number;
  maxTeamMembers: number;
  maxRoles: number;
};

export type Plan = {
  planId: PlanId;
  planName: string;
  price: number;        // in paise (₹ * 100)
  displayPrice: string; // e.g. "₹250/year"
  description: string;
  badge?: string;
  limits: PlanLimits;
  permissions: PlanPermissions;
  features: string[];
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    planId: 'free',
    planName: 'Free',
    price: 0,
    displayPrice: 'Free forever',
    description: 'Get started with the essentials',
    limits: {
      maxCategories: 2,
      maxTextChannels: 3,
      maxVoiceChannels: 1,
      maxTasks: 20,
      maxTeamMembers: 2,
      maxRoles: 2,
    },
    permissions: {
      workplaceAccess: true,
      taskManagerAccess: false,
      analyticsAccess: false,
      customRolesAccess: false,
      advancedPermissionsAccess: false,
      auditLogsAccess: false,
    },
    features: [
      '2 Categories',
      '3 Text Channels',
      '1 Voice Channel',
      '20 Tasks',
      '2 Team Members',
    ],
  },

  essential: {
    planId: 'essential',
    planName: 'Essential',
    price: 25000,
    displayPrice: '₹250/year',
    description: 'Perfect for small focused teams',
    limits: {
      maxCategories: 3,
      maxTextChannels: 10,
      maxVoiceChannels: 1,
      maxTasks: 100,
      maxTeamMembers: 4,
      maxRoles: 5,
    },
    permissions: {
      workplaceAccess: true,
      taskManagerAccess: true,
      analyticsAccess: false,
      customRolesAccess: false,
      advancedPermissionsAccess: false,
      auditLogsAccess: false,
    },
    features: [
      '3 Categories',
      '10 Text Channels',
      '100 Tasks',
      '4 Team Members',
      'Task Manager Access',
      '5 Custom Roles',
    ],
  },

  growth: {
    planId: 'growth',
    planName: 'Growth',
    price: 79900,
    displayPrice: '₹799/year',
    description: 'Scale with your growing team',
    badge: 'Most Popular',
    limits: {
      maxCategories: 10,
      maxTextChannels: 50,
      maxVoiceChannels: 5,
      maxTasks: 500,
      maxTeamMembers: 15,
      maxRoles: 20,
    },
    permissions: {
      workplaceAccess: true,
      taskManagerAccess: true,
      analyticsAccess: true,
      customRolesAccess: true,
      advancedPermissionsAccess: false,
      auditLogsAccess: false,
    },
    features: [
      '10 Categories',
      '50 Text Channels',
      '5 Voice Channels',
      '500 Tasks',
      '15 Team Members',
      'Analytics Dashboard',
      '20 Custom Roles',
    ],
  },

  scale: {
    planId: 'scale',
    planName: 'Scale',
    price: 199900,
    displayPrice: '₹1,999/year',
    description: 'Unlimited power for large teams',
    badge: 'Best Value',
    limits: {
      maxCategories: 9999,
      maxTextChannels: 9999,
      maxVoiceChannels: 9999,
      maxTasks: 9999999,
      maxTeamMembers: 9999,
      maxRoles: 9999,
    },
    permissions: {
      workplaceAccess: true,
      taskManagerAccess: true,
      analyticsAccess: true,
      customRolesAccess: true,
      advancedPermissionsAccess: true,
      auditLogsAccess: true,
    },
    features: [
      'Unlimited Categories',
      'Unlimited Channels',
      'Unlimited Tasks',
      'Unlimited Team Members',
      'Full Analytics',
      'Advanced Permissions',
      'Audit Logs',
    ],
  },
};

export type ResourceType = 'category' | 'textChannel' | 'voiceChannel' | 'task' | 'teamMember' | 'role';

export const RESOURCE_LIMIT_FIELD: Record<ResourceType, keyof PlanLimits> = {
  category:     'maxCategories',
  textChannel:  'maxTextChannels',
  voiceChannel: 'maxVoiceChannels',
  task:         'maxTasks',
  teamMember:   'maxTeamMembers',
  role:         'maxRoles',
};
