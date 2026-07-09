import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  fetchActiveSubscription,
  type Subscription,
  type UsageData,
} from '../api/subscriptions';
import type { ResourceType } from '../config/plans';

// ─── Context Shape ────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  subscription: Subscription | null;
  usage: UsageData | null;
  isLoading: boolean;
  error: string | null;

  /** Re-fetch subscription + usage from the server (call after upgrade payment) */
  refetch: () => Promise<void>;

  /**
   * Returns true if the current plan permits creating one more resource.
   * Always returns true if subscription hasn't loaded yet (optimistic).
   */
  canCreate: (resourceType: ResourceType) => boolean;

  /**
   * Returns true if the current plan includes this feature permission.
   */
  hasPermission: (permission: keyof Subscription['permissions']) => boolean;

  /**
   * Returns true if subscription is active (any plan including free).
   */
  isActive: boolean;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  usage: null,
  isLoading: true,
  error: null,
  refetch: async () => {},
  canCreate: () => true,
  hasPermission: () => false,
  isActive: false,
});

// ─── Resource → usage field mapping ──────────────────────────────────────────

const RESOURCE_TO_USAGE: Record<ResourceType, keyof UsageData> = {
  category:     'categories',
  textChannel:  'textChannels',
  voiceChannel: 'voiceChannels',
  task:         'tasks',
  teamMember:   'teamMembers',
  role:         'roles',
};

const RESOURCE_TO_LIMIT: Record<ResourceType, keyof Subscription['limits']> = {
  category:     'maxCategories',
  textChannel:  'maxTextChannels',
  voiceChannel: 'maxVoiceChannels',
  task:         'maxTasks',
  teamMember:   'maxTeamMembers',
  role:         'maxRoles',
};

// ─── Provider ────────────────────────────────────────────────────────────────

interface SubscriptionProviderProps {
  children: ReactNode;
  /** Only fetch if user is admin — pass false for team members */
  isAdmin?: boolean;
}

export function SubscriptionProvider({ children, isAdmin = true }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    // Only attempt if we have a token
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchActiveSubscription();
      setSubscription(data.subscription);
      setUsage(data.usage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(msg);
      console.error('[SubscriptionContext] Error loading subscription:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const isActive = Boolean(
    subscription &&
    (subscription.status === 'active' || subscription.status === 'trial') &&
    (subscription.planId === 'free' || !subscription.expiryDate || new Date(subscription.expiryDate) > new Date())
  );

  const canCreate = useCallback(
    (resourceType: ResourceType): boolean => {
      if (!subscription || !usage) return true; // Optimistic: allow until data loaded
      const usageField = RESOURCE_TO_USAGE[resourceType];
      const limitField = RESOURCE_TO_LIMIT[resourceType];
      const current = usage[usageField]?.current ?? 0;
      const max = subscription.limits?.[limitField] ?? 0;
      return current < max;
    },
    [subscription, usage]
  );

  const hasPermission = useCallback(
    (permission: keyof Subscription['permissions']): boolean => {
      if (!subscription) return false;
      return subscription.permissions?.[permission] === true;
    },
    [subscription]
  );

  const refetch = useCallback(async () => {
    await load();
  }, [load]);

  return (
    <SubscriptionContext.Provider
      value={{ subscription, usage, isLoading, error, refetch, canCreate, hasPermission, isActive }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return ctx;
}
