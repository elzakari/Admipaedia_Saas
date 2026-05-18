import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Key, ArrowRight, Lock } from 'lucide-react';
import authService from '@/services/authService';

const ClaimAccountPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  if (!token) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(50rem_35rem_at_90%_20%,rgba(79,70,229,0.14),transparent_55%)]" />
        <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 sm:p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-rose-50 p-3 ring-8 ring-rose-100">
                <XCircle className="w-12 h-12 text-rose-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {t('auth.invalid_activation_link', 'Invalid Activation Link')}
            </h2>
            <p className="text-slate-500 text-sm">
              {t('auth.missing_token_desc', 'No valid setup or activation token was discovered in the request link URL.')}
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition-colors"
              >
                {t('auth.back_to_signin', 'Back to Sign in')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    if (password !== confirmPassword) {
      toast.error(t('auth.passwords_dont_match', 'Passwords do not match'));
      return;
    }

    // Password strength check (basic length validation on frontend, full checks on backend)
    if (password.length < 8) {
      toast.error(t('auth.password_too_short', 'Password must be at least 8 characters long'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await authService.claimAccount(token, password);
      if (response.success) {
        setStatus('success');
        toast.success(t('auth.account_activated_toast', 'Account claimed successfully!'), {
          description: t('auth.you_can_login_now', 'Your credentials have been successfully updated.'),
          duration: 4000
        });
      } else {
        setStatus('error');
        setErrorMessage(response.message || t('auth.activation_failed', 'Activation failed.'));
      }
    } catch (error: any) {
      setStatus('error');
      const errMsg = error?.response?.data?.error || error?.response?.data?.message || t('auth.activation_error_desc', 'The activation token is invalid, has expired (48 hours), or was already settled.');
      setErrorMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      {/* Dynamic radial gradient overlays for premium feel */}
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(50rem_35rem_at_90%_20%,rgba(79,70,229,0.14),transparent_55%),radial-gradient(50rem_35rem_at_50%_90%,rgba(59,130,246,0.10),transparent_60%)]" />
      
      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 sm:p-8 transform transition-all duration-300">
            <div className="flex items-center justify-center mb-6">
              <img
                src="/assets/images/Admipaedia_Logo.png"
                alt="Admipaedia Logo"
                className="h-10 animate-pulse"
              />
            </div>

            {/* 1. Claim Form State */}
            {status === 'form' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                    {t('auth.claim_account_title', 'Activate Your Account')}
                  </h2>
                  <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                    {t('auth.claim_account_desc', 'Establish a new secure password to activate your ADMIPAEDIA student profile.')}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 flex items-center">
                      <Lock className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                      {t('auth.new_password', 'New Password')}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 flex items-center">
                      <Lock className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                      {t('auth.confirm_new_password', 'Confirm New Password')}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 group flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        {t('auth.activating_account', 'Activating...')}
                      </>
                    ) : (
                      <>
                        <span>{t('auth.activate_account_btn', 'Activate Account')}</span>
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* 2. Success State */}
            {status === 'success' && (
              <div className="text-center py-6 space-y-5 animate-fade-in">
                <div className="flex justify-center">
                  <div className="rounded-full bg-emerald-50 p-3 ring-8 ring-emerald-100 animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {t('auth.claim_success_title', 'Activation Successful!')}
                  </h2>
                  <p className="text-slate-600 mt-3 text-sm px-2 leading-relaxed">
                    {t('auth.claim_success_desc', 'Your password credentials have been updated and your profile is now fully active.')}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 group"
                  >
                    <span>{t('auth.proceed_to_login', 'Sign in to ADMIPAEDIA')}</span>
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            )}

            {/* 3. Error State */}
            {status === 'error' && (
              <div className="py-4 space-y-6 animate-fade-in">
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-rose-50 p-3 ring-8 ring-rose-100">
                      <XCircle className="w-12 h-12 text-rose-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {t('auth.activation_failed_title', 'Activation Link Failed')}
                  </h2>
                  <p className="text-rose-600 text-sm font-medium bg-rose-50/50 py-2 px-3 rounded-lg border border-rose-100">
                    {errorMessage}
                  </p>
                </div>

                <div className="text-center pt-2 space-y-4">
                  <button
                    onClick={() => setStatus('form')}
                    className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition-colors mr-4"
                  >
                    {t('auth.try_again', 'Try Again')}
                  </button>
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    {t('auth.back_to_signin', 'Back to Sign in')}
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>© {new Date().getFullYear()} ADMIPAEDIA. {t('common.all_rights_reserved', 'All rights reserved.')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimAccountPage;
