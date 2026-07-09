import React, { useState, useEffect, useRef } from 'react';
import { apiPost } from '../../lib/axios';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// ─── Lazy-load Razorpay SDK once, on demand ─────────────────────────────────
// Loading it globally in index.html fires the otp-credentials Permissions-Policy
// warning on every page. This helper injects the script only the first time a
// CheckoutModal mounts, then reuses the already-loaded SDK.
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScriptPromise = null; // allow retry on failure
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckoutProps {
  amount: number; // in paise
  currency?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  buttonClassName?: string;
  children?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CheckoutModal({
  amount,
  currency = 'INR',
  onSuccess,
  onError,
  buttonClassName,
  children,
}: CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const mounted = useRef(true);

  // Load Razorpay SDK when this component mounts (not at app startup)
  useEffect(() => {
    mounted.current = true;
    loadRazorpayScript()
      .then(() => { if (mounted.current) setSdkReady(true); })
      .catch((err: Error) => {
        console.error('[Razorpay] SDK load failed:', err.message);
        if (mounted.current) setErrorMsg('Payment service unavailable. Please refresh.');
      });

    return () => { mounted.current = false; };
  }, []);

  const handlePayment = async () => {
    if (!sdkReady) return;

    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Create order on backend
      const res = await apiPost<{
        success: boolean;
        data: { order_id: string; amount: number; currency: string };
      }>('/api/v1/payments/create-order', { amount, currency });

      if (!res.success || !res.data?.order_id) {
        throw new Error('Failed to create order');
      }

      const { order_id } = res.data;

      // 2. Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: res.data.amount,
        currency: res.data.currency,
        name: 'Obsidian OS',
        description: 'Standard Payment Checkout',
        order_id,
        handler: async function (response: any) {
          try {
            // 3. Verify payment signature
            const verifyRes = await apiPost<{ success: boolean; message: string }>(
              '/api/v1/payments/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (verifyRes.success) {
              onSuccess?.();
            } else {
              const errMsg = 'Payment verification failed';
              setErrorMsg(errMsg);
              onError?.(errMsg);
            }
          } catch (err: any) {
            console.error('[Razorpay] Verify error:', err);
            const errMsg =
              err.response?.data?.error?.message ||
              err.message ||
              'Payment verification failed';
            setErrorMsg(errMsg);
            onError?.(errMsg);
          }
        },
        theme: { color: '#3B82F6' },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response: any) {
        console.error('[Razorpay] Payment failed:', response.error);
        const errMsg = response.error.description || 'Payment failed';
        setErrorMsg(errMsg);
        onError?.(errMsg);
      });

      rzp.open();
    } catch (err: any) {
      console.error('[Razorpay] Checkout error:', err);
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Error initializing payment';
      setErrorMsg(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={handlePayment}
        disabled={loading || !sdkReady}
        className={
          buttonClassName ||
          'px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all'
        }
      >
        {loading
          ? 'Processing...'
          : !sdkReady
          ? 'Loading...'
          : children || `Pay ₹${(amount / 100).toFixed(2)}`}
      </button>
      {errorMsg && <p className="text-red-500 text-sm mt-1">{errorMsg}</p>}
    </div>
  );
}
