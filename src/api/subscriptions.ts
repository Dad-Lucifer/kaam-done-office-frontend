// ─────────────────────────────────────────────────────────────────────────────
// Subscription API Client
// Wraps all calls to /api/subscriptions/*
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const subscriptionClient = axios.create({
  baseURL: `${API_BASE}/api/subscriptions`,
  headers: { 'Content-Type': 'application/json' },
});

subscriptionClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'trial';

export interface SubscriptionPermissions {
  workplaceAccess: boolean;
  taskManagerAccess: boolean;
  analyticsAccess: boolean;
  customRolesAccess: boolean;
  advancedPermissionsAccess: boolean;
  auditLogsAccess: boolean;
}

export interface SubscriptionLimits {
  maxCategories: number;
  maxTextChannels: number;
  maxVoiceChannels: number;
  maxTasks: number;
  maxTeamMembers: number;
  maxRoles: number;
}

export interface Subscription {
  subscriptionId: string;
  workspaceId: string;
  ownerUserId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  startDate: string;
  expiryDate: string | null;
  limits: SubscriptionLimits;
  permissions: SubscriptionPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface UsageEntry {
  current: number;
  max: number;
}

export interface UsageData {
  categories: UsageEntry;
  textChannels: UsageEntry;
  voiceChannels: UsageEntry;
  tasks: UsageEntry;
  teamMembers: UsageEntry;
  roles: UsageEntry;
}

export interface ActiveSubscriptionResponse {
  subscription: Subscription;
  usage: UsageData;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch active subscription + current usage counts.
 */
export async function fetchActiveSubscription(): Promise<ActiveSubscriptionResponse> {
  const { data } = await subscriptionClient.get('/active');
  return data.data as ActiveSubscriptionResponse;
}

/**
 * Fetch just usage counts for the workspace.
 */
export async function fetchUsage(): Promise<{ planId: string; planName: string; usage: UsageData }> {
  const { data } = await subscriptionClient.get('/usage');
  return data.data;
}

/**
 * Activate a paid subscription after Razorpay payment.
 */
export async function activateSubscription(params: {
  planId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<ActiveSubscriptionResponse> {
  const { data } = await subscriptionClient.post('/activate', params);
  return data.data as ActiveSubscriptionResponse;
}
