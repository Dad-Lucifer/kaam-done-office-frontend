import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${API_BASE}/api/payments`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach auth token to all payment requests
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface CreateOrderPayload {
  amount: number;
  currency?: string;
  planId?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id?: string;
  currency?: string;
  amount?: number;
  message?: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  subscription?: any;
  usage?: any;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  try {
    const { data } = await apiClient.post<CreateOrderResponse>('/create-order', payload);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || error.message);
    }
    throw error;
  }
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<VerifyPaymentResponse> {
  try {
    const { data } = await apiClient.post<VerifyPaymentResponse>('/verify-payment', payload);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || error.message);
    }
    throw error;
  }
}
