import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invitationLinksService } from '../../services/invitationLinksService';

interface RegisterFormProps {
  onSuccess?: () => void;
}

function normalizeUrl(raw: string): URL | null {
  const value = (raw || '').trim();
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(value, window.location.origin);
    } catch {
      return null;
    }
  }
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [step, setStep] = useState(1);
  const [inviteUrl, setInviteUrl] = useState('');
  const [parsedInvite, setParsedInvite] = useState<{ inviteId: string; sig: string; exp: string; inviteeType: string } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = normalizeUrl(inviteUrl);
    if (!url) {
      setError(t('auth.invalid_invite_url', 'Please paste a valid invitation link from your school admin.'));
      return;
    }
    const path = url.pathname || '';
    if (!path.includes('/invite/')) {
      setError(t('auth.invalid_invite_url', 'Please paste a valid invitation link from your school admin.'));
      return;
    }
    const inviteId = path.split('/invite/')[1]?.split('/')?.[0]?.trim();
    const exp = url.searchParams.get('exp') || '';
    const sig = url.searchParams.get('sig') || '';
    if (!inviteId || !exp || !sig) {
      setError(t('auth.invalid_invite_url', 'Invitation link is missing required parameters.'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await invitationLinksService.validateInvite(inviteId, { sig, exp });
      if (!res.success || !res.invite) {
        setError(res.message || t('auth.invalid_invite_link', 'This invitation is not valid or expired.'));
        return;
      }
      setParsedInvite({ inviteId, sig, exp, inviteeType: res.invite.invitee_type });
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('auth.invalid_invite_link', 'Invitation validation failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError(t('auth.passwords_do_not_match', 'Passwords do not match'));
      return;
    }

    if (!parsedInvite) {
      setError(t('auth.missing_invite_context', 'Invitation context missing. Please restart registration.'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      const baseUsername = email.split('@')[0] || 'user';

      const payload = {
        username: baseUsername,
        email,
        password,
        confirm_password: confirmPassword,
        first_name: firstName,
        last_name: lastName
      };

      const res = await invitationLinksService.registerWithInvite(
        parsedInvite.inviteId,
        { sig: parsedInvite.sig, exp: parsedInvite.exp },
        payload
      );

      if (!res.success) {
        setError(res.message || t('auth.registration_failed', 'Registration failed. Please try again.'));
        return;
      }
      
      if (res.access_token) localStorage.setItem('token', res.access_token);
      if (res.refresh_token) localStorage.setItem('refreshToken', res.refresh_token);
      if (res.tenant?.id) localStorage.setItem('saas_current_tenant_id', res.tenant.id);

      if (onSuccess) {
        onSuccess();
      }
      
      const role = res.user?.role;
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'teacher') navigate('/teacher/dashboard');
      else if (role === 'parent') navigate('/parent/dashboard');
      else if (role === 'student') navigate('/student/dashboard');
      else navigate('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('auth.registration_failed', 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="space-y-4">
        {/* Logo centered */}
        <div className="flex justify-center mb-2">
          <img 
            src="/assets/images/Admipaedia_Logo.png" 
            alt="Admipaedia Logo" 
            className="h-14 w-auto object-contain" 
          />
        </div>
        
        {/* Title centered */}
        <h3 className="text-xl font-bold text-center text-slate-900">
          {t('auth.create_your_account', 'Create your account')}
        </h3>

        {/* Warning Banner */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 leading-normal">
          {t('auth.invitation_only_warning', 'Registration is invitation-only. This prevents creating accounts that are not linked to a school.')}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleStep1Submit} className="space-y-4">
          <div>
            <label htmlFor="inviteUrl" className="block text-sm font-semibold text-slate-700 mb-1">
              {t('auth.invitation_link', 'Invitation link')}
            </label>
            <input
              id="inviteUrl"
              type="text"
              value={inviteUrl}
              onChange={(e) => setInviteUrl(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder={t('auth.invite_url_placeholder', 'Paste your invite link (e.g. https://.../invite/<id>?exp...)')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 text-sm"
          >
            {isLoading ? t('common.checking', 'Checking...') : t('common.continue', 'Continue')}
          </button>
        </form>

        {/* Relative Parent Register Link */}
        <div className="text-center pt-1">
          <RouterLink 
            to="/parent-register" 
            onClick={onSuccess}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {t('auth.register_as_parent_link', 'Are you a parent? Register as a parent')}
          </RouterLink>
        </div>
      </div>
    );
  }

  // Step 2: Account Details
  return (
    <form onSubmit={handleStep2Submit} className="space-y-4">
      <h3 className="text-xl font-bold text-center text-slate-900 mb-1">
        {t('auth.create_your_account', 'Create your account')}
      </h3>
      <p className="text-center text-xs text-slate-500 mb-4 uppercase tracking-wider font-semibold">
        {t('auth.step_2_details', 'Step 2: Enter Account Details')}
      </p>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Clean border box container wrapper layout */}
      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
            {t('auth.full_name', 'Full Name')}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder={t('auth.full_name_placeholder', 'Enter your full name')}
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
            {t('auth.email', 'Email Address')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder={t('auth.email_placeholder', 'Enter your email')}
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
            {t('auth.password', 'Password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder={t('auth.create_password_placeholder', 'Create a password')}
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
            {t('auth.confirm_password', 'Confirm Password')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder={t('auth.confirm_password_placeholder', 'Confirm your password')}
          />
        </div>
      </div>
      
      <div className="pt-2 flex gap-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          disabled={isLoading}
          className="w-1/3 py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl focus:outline-none transition-colors disabled:opacity-50 text-sm"
        >
          {t('common.back', 'Back')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 text-sm"
        >
          {isLoading ? t('auth.creating_account', 'Creating account...') : t('auth.create_account', 'Create account')}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;
