import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, ShieldCheck, HelpCircle, CheckCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: PaystackOptions) => PaystackHandler;
    };
  }
}

interface PaystackOptions {
  key: string;
  email: string;
  amount: number;
  currency: string;
  ref: string;
  metadata: {
    tenant_id: string;
    branch_id: string;
    student_id: number;
    student_fee_id: number;
  };
  callback: (response: { reference: string; status: string }) => void;
  onClose: () => void;
}

interface PaystackHandler {
  openIframe: () => void;
}

interface PaystackPayButtonProps {
  studentId: number;
  studentFeeId: number;
  amount: number;
  email: string;
  currency?: string;
  tenantId: string;
  branchId: string;
  buttonText?: string;
  onSuccess?: (reference: string) => void;
  onCancel?: () => void;
}

export const PaystackPayButton: React.FC<PaystackPayButtonProps> = ({
  studentId,
  studentFeeId,
  amount,
  email,
  currency = 'GHS',
  tenantId,
  branchId,
  buttonText = 'Pay with Paystack',
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [scriptLoaded, setScriptLoaded] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [successRef, setSuccessRef] = useState<string>('');

  // 1. Fetch public key and inject script on mount
  useEffect(() => {
    let isMounted = true;

    // Load active gateway config (non-sensitive public key)
    const fetchConfig = async () => {
      try {
        const resp = await api.get('/payments/config');
        if (isMounted && resp.data?.success) {
          setPublicKey(resp.data.publicKey);
        }
      } catch (err: any) {
        console.error('Failed to load Paystack config:', err);
        if (isMounted) {
          setError('Paystack gateway is currently offline or not configured.');
        }
      }
    };

    fetchConfig();

    // Check if script is already present
    if (window.PaystackPop) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      if (isMounted) {
        setScriptLoaded(true);
      }
    };
    script.onerror = () => {
      console.error('Failed to load Paystack inline JS script');
      if (isMounted) {
        setError('Failed to load secure payment gateway client scripts.');
      }
    };
    document.body.appendChild(script);

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Trigger Checkout overlay
  const handlePayment = () => {
    if (!scriptLoaded || !window.PaystackPop) {
      setError('Payment gateway client is still loading. Please wait.');
      return;
    }

    if (!publicKey) {
      setError('Secure payment gateway public key not found.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Generate a client-side invoice correlation identifier
      const generatedRef = `PAY-${studentFeeId}-${Date.now()}`;
      
      // Paystack amount must be an integer in minor units (cents/pesewas)
      const minorUnitsAmount = Math.round(amount * 100);

      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: minorUnitsAmount,
        currency: currency.toUpperCase(),
        ref: generatedRef,
        metadata: {
          tenant_id: tenantId,
          branch_id: branchId,
          student_id: studentId,
          student_fee_id: studentFeeId,
        },
        callback: (response) => {
          setLoading(false);
          setPaymentSuccess(true);
          setSuccessRef(response.reference);
          if (onSuccess) {
            onSuccess(response.reference);
          }
        },
        onClose: () => {
          setLoading(false);
          if (onCancel) {
            onCancel();
          }
        },
      });

      handler.openIframe();
    } catch (err: any) {
      setLoading(false);
      setError('Could not initialize checkout popup: ' + (err.message || err));
    }
  };

  if (paymentSuccess) {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 flex flex-col items-center text-center gap-3 animate-fade-in shadow-sm max-w-sm mx-auto">
        <CheckCircle className="h-8 w-8 text-emerald-600 animate-bounce" />
        <div>
          <h4 className="text-emerald-800 font-extrabold text-sm">Invoice Settled Successfully!</h4>
          <p className="text-emerald-700 text-xs mt-1">
            Reference: <span className="font-mono font-bold">{successRef}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 max-w-sm mx-auto">
      <button
        onClick={handlePayment}
        disabled={loading || !scriptLoaded || !publicKey}
        className={`relative overflow-hidden w-full px-5 py-3 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 shadow-md flex items-center justify-center gap-3 border ${
          loading || !scriptLoaded || !publicKey
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 border-indigo-500 hover:border-indigo-600 text-white hover:shadow-lg active:scale-95'
        }`}
      >
        {loading || (!scriptLoaded && !error) ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <span>Connecting secure gateway...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 animate-pulse" />
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {/* Trust & Compliance Badge */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium select-none">
        <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
        <span>Secured by Paystack • PCI-DSS Compliant</span>
      </div>

      {/* Graceful Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-600 mt-2 animate-shake">
          <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Gateway Connection Failed</span>
            <p className="text-red-500 mt-0.5 leading-relaxed text-[11px]">{error}</p>
            {!publicKey && (
              <button
                onClick={() => window.location.reload()}
                className="mt-1.5 flex items-center gap-1 text-[10px] text-red-700 font-extrabold hover:underline"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Reload Gateway Config</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaystackPayButton;
