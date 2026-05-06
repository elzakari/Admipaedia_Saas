import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useEnhancedApiError } from '../../hooks/useEnhancedApiError';
import { toast } from 'sonner';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('admin@admipaedia.com');
  const [password, setPassword] = useState('Admin@123'); // Updated to correct password
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { handleApiError } = useEnhancedApiError();
  const { t } = useTranslation();

  const useSeedAdmin = () => {
    setEmail('admin@admipaedia.com');
    setPassword('Admin@123');
  };

  const useSeedSuperAdmin = () => {
    setEmail('superadmin@admipaedia.com');
    setPassword('SuperAdmin@123');
  };

  const bootstrapDevAccounts = async () => {
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
      // Use enhanced error handling
      const appError = handleApiError(err, {
        customMessage: getLoginErrorMessage(err),
        retryCallback: retryCount < 3 ? () => {
          setRetryCount(prev => prev + 1);
          handleSubmit(e);
        } : undefined,
        redirectOnAuth: false // Don't auto-redirect on login page
      });
      
      // Track failed attempts for security
      if (retryCount >= 2) {
        toast.warning(t('auth.multiple_failed_attempts', 'Multiple Failed Attempts'), {
          description: t('auth.security_wait', 'For security, please wait before trying again.'),
          duration: 10000
        });
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
    if (status >= 500) {
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
          {t('auth.email', 'Email')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={t('auth.email_placeholder', 'Enter your email')}
        />
      </div>
      
      <div>
        <div className="flex justify-between mb-1">
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
            {t('auth.password', 'Password')}
          </label>
          <button
            type="button"
            className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
            onClick={() => navigate('/forgot-password')}
          >
            {t('auth.forgot_password', 'Forgot password?')}
          </button>
        </div>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('auth.password_placeholder', 'Enter your password')}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
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
          disabled={isLoading || !email || !password}
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

      {import.meta.env.DEV ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={useSeedAdmin} className="underline hover:text-indigo-700" disabled={isLoading}>
              {t('auth.use_admin_seed', 'Use Admin seed')}
            </button>
            <button type="button" onClick={useSeedSuperAdmin} className="underline hover:text-indigo-700" disabled={isLoading}>
              {t('auth.use_super_admin_seed', 'Use Super Admin seed')}
            </button>
          </div>
          <button type="button" onClick={bootstrapDevAccounts} className="underline hover:text-indigo-700" disabled={isLoading}>
            {t('auth.init_demo_accounts', 'Initialize demo accounts')}
          </button>
        </div>
      ) : null}
      
      {retryCount > 0 && (
        <div className="text-center text-sm text-gray-600">
          {t('auth.attempt_of', 'Attempt {{current}} of {{total}}', { current: retryCount + 1, total: 3 })}
        </div>
      )}
    </form>
  );
};

export default LoginForm;
