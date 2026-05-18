import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import authService from '@/services/authService';

const VerifyEmailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  
  // Resend Form State
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage(t('auth.missing_token', 'No email verification token was provided in the request link.'));
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        if (response.success) {
          setStatus('success');
          setMessage(response.message || t('auth.email_verified_success', 'Your email address has been successfully verified!'));
          toast.success(t('auth.verification_success_toast', 'Email verified successfully!'), {
            description: t('auth.you_can_login', 'You can now sign in to your account.'),
            duration: 4000
          });
        } else {
          setStatus('error');
          setMessage(response.message || t('auth.email_verified_failed', 'Failed to verify your email address.'));
        }
      } catch (error: any) {
        setStatus('error');
        const errMsg = error?.response?.data?.message || t('auth.verification_error', 'The token might be expired (60 minutes window) or already used.');
        setMessage(errMsg);
      }
    };

    performVerification();
  }, [token, t]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsResending(true);
    try {
      const response = await authService.resendVerificationEmail(email);
      if (response.success) {
        setResendSuccess(true);
        toast.success(t('auth.resend_success', 'Verification email sent!'), {
          description: t('auth.check_inbox', 'Please check your inbox for the new verification link.'),
          duration: 5000
        });
      } else {
        toast.error(t('auth.resend_failed', 'Failed to resend verification.'));
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || t('auth.resend_error', 'Could not send verification email. Please try again.');
      toast.error(errMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      {/* Dynamic radial gradient overlays for rich premium feel */}
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

            {/* 1. Verification Loading State */}
            {status === 'loading' && (
              <div className="text-center py-8 space-y-4">
                <div className="relative flex justify-center">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-indigo-400 rounded-full animate-pulse mx-auto"></div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                    {t('auth.verifying_email', 'Verifying Email')}
                  </h2>
                  <p className="text-slate-500 mt-2 text-sm">
                    {t('auth.please_wait_verifying', 'Securing your register payload and verifying token authenticity...')}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Verification Success State */}
            {status === 'success' && (
              <div className="text-center py-6 space-y-5 animate-fade-in">
                <div className="flex justify-center">
                  <div className="rounded-full bg-emerald-50 p-3 ring-8 ring-emerald-100 animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {t('auth.verified_title', 'Account Activated!')}
                  </h2>
                  <p className="text-slate-600 mt-3 text-sm px-2 leading-relaxed">
                    {message}
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

            {/* 3. Verification Error State & Resend Flow */}
            {status === 'error' && (
              <div className="py-4 space-y-6 animate-fade-in">
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-rose-50 p-3 ring-8 ring-rose-100">
                      <XCircle className="w-12 h-12 text-rose-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {t('auth.verification_failed_title', 'Verification Link Expired')}
                  </h2>
                  <p className="text-rose-600 text-sm font-medium bg-rose-50/50 py-2 px-3 rounded-lg border border-rose-100">
                    {message}
                  </p>
                </div>

                {/* Resend Flow Container */}
                <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 ring-1 ring-slate-100 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center">
                    <Mail className="w-4 h-4 text-indigo-500 mr-2" />
                    {t('auth.request_new_link', 'Request a new verification link')}
                  </h3>

                  {!resendSuccess ? (
                    <form onSubmit={handleResend} className="space-y-3">
                      <div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder={t('auth.enter_registered_email', 'Enter your registered email')}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isResending || !email}
                        className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 transition-colors flex items-center justify-center disabled:opacity-50"
                      >
                        {isResending ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            {t('auth.sending_link', 'Sending...')}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                            {t('auth.resend_link_btn', 'Send Verification Link')}
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center py-2 space-y-2">
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {t('auth.resend_instruction', 'A fresh verification token has been generated and dispatched to your email address.')}
                      </p>
                      <button
                        onClick={() => setResendSuccess(false)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline"
                      >
                        {t('auth.try_another_email', 'Try another email address')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition-colors"
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

export default VerifyEmailPage;
