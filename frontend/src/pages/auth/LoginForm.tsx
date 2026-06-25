import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedApiError } from '../../hooks/useEnhancedApiError';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const allowDevSeedHelpers = import.meta.env.DEV && import.meta.env.VITE_ENABLE_SEED_HELPERS === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { handleApiError } = useEnhancedApiError();
  const { t } = useTranslation();

  // countdown timer mechanics
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const useSeedAdmin = () => {
    setEmail('admin@admipaedia.com');
    setPassword('Admin@123');
  };

  const useSeedSuperAdmin = () => {
    setEmail('elzakari@easymsdigit.com');
    setPassword('SuperAdmin@123');
  };

  const bootstrapDevAccounts = async () => {
    if (!allowDevSeedHelpers) return;
    try {
      await api.post('/auth/bootstrap-dev');
      toast.success(t('auth.demo_accounts_initialized', 'Demo accounts initialized'), {
        description: t('auth.demo_accounts_ready', 'Admin and Super Admin seed accounts are ready.'),
        duration: 4000
      });
    } catch (e) {
      void e;
      toast.error(t('auth.bootstrap_failed', 'Bootstrap failed'), {
        description: t('auth.bootstrap_failed_desc', 'Could not initialize demo accounts.'),
        duration: 4000
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldownSeconds > 0) {
      toast.warning(t('auth.too_many_attempts', 'Too many login attempts. Please wait before trying again.'), {
        duration: 4000
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await login(email, password);
      
      // Handle MFA
      if (response.step === 'mfa' && response.temp_token) {
        navigate('/auth/mfa/verify', { 
          state: { temp_token: response.temp_token, email } 
        });
        return;
      }

      // Show success message
      toast.success(t('auth.welcome_back_title', 'Welcome back!'), {
        description: t('auth.welcome_back_desc', 'You have been successfully logged in.'),
        duration: 3000
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      handleApiError(err, {
        customMessage: getLoginErrorMessage(err),
        redirectOnAuth: false
      });

      const status = err?.response?.status;
      if (status === 429) {
        const retryAfter = err?.response?.data?.retry_after || 60;
        setCooldownSeconds(retryAfter);
        toast.error(t('auth.too_many_attempts', 'Too many login attempts.'), {
          description: t('auth.security_wait_seconds', 'For security, please wait {{seconds}}s.', { seconds: retryAfter }),
          duration: 6000
        });
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          setCooldownSeconds(30);
          toast.warning(t('auth.multiple_failed_attempts', 'Multiple Failed Attempts'), {
            description: t('auth.security_wait', 'For security, please wait before trying again.'),
            duration: 10000
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getLoginErrorMessage = (error: any): string => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    
    if (status === 401) {
      return t('auth.invalid_credentials', 'Invalid email or password. Please check your credentials.');
    }
    if (status === 429) {
      return t('auth.too_many_attempts', 'Too many login attempts. Please wait before trying again.');
    }
    if (status === 500 || status > 500) {
      return t('auth.server_unavailable', 'Server is temporarily unavailable. Please try again later.');
    }
    if (error.code === 'NETWORK_ERROR') {
      return t('auth.network_error', 'Unable to connect. Please check your internet connection.');
    }
    
    return message || t('auth.login_failed', 'Login failed. Please try again.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
          {t('auth.email_or_username', 'Email or Username')}
        </label>
        <input
          id="email"
          type="text"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading || cooldownSeconds > 0}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={t('auth.email_or_username_placeholder', 'Enter email or username')}
        />
      </div>
      
      <div>
        <div className="flex justify-between mb-1">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
            {t('auth.password', 'Password')}
          </label>
          <button
            type="button"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => navigate('/forgot-password')}
            disabled={isLoading || cooldownSeconds > 0}
          >
            {t('auth.forgot_password', 'Forgot password?')}
          </button>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading || cooldownSeconds > 0}
            autoComplete="current-password"
            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('auth.password_placeholder', 'Enter your password')}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading || cooldownSeconds > 0}
            aria-label={showPassword ? t('auth.hide_password', 'Hide password') : t('auth.show_password', 'Show password')}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isLoading || !email || !password || cooldownSeconds > 0}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              {t('auth.signing_in', 'Signing in...')}
            </>
          ) : (
            t('auth.sign_in', 'Sign in')
          )}
        </button>
      </div>

      {cooldownSeconds > 0 ? (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm animate-pulse">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">{t('auth.rate_limited_title', 'Rate Limit Active')}</span>
            <p className="text-xs text-amber-700/90 mt-0.5">
              {t('auth.cooldown', 'Please wait {{seconds}}s before trying again.', { seconds: cooldownSeconds })}
            </p>
          </div>
        </div>
      ) : null}

      {allowDevSeedHelpers ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={useSeedAdmin} className="underline hover:text-indigo-700" disabled={isLoading || cooldownSeconds > 0}>
              {t('auth.use_admin_seed', 'Use Admin seed')}
            </button>
            <button type="button" onClick={useSeedSuperAdmin} className="underline hover:text-indigo-700" disabled={isLoading || cooldownSeconds > 0}>
              {t('auth.use_super_admin_seed', 'Use Super Admin seed')}
            </button>
          </div>
          <button type="button" onClick={bootstrapDevAccounts} className="underline hover:text-indigo-700" disabled={isLoading || cooldownSeconds > 0}>
            {t('auth.init_demo_accounts', 'Initialize demo accounts')}
          </button>
        </div>
      ) : null}
      
      {failedAttempts > 0 && cooldownSeconds <= 0 && (
        <div className="text-center text-sm text-gray-600">
          {t('auth.attempt_of', 'Attempt {{current}} of {{total}}', { current: Math.min(failedAttempts + 1, 3), total: 3 })}
        </div>
      )}
    </form>
  );
};

export default LoginForm;
