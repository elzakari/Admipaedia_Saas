import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import authService from '@/services/authService';

const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await authService.requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (err) {
      void err;
      setError(t('auth.reset_email_failed', 'Failed to send password reset email. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen bg-gray-100 justify-center items-center">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold text-gray-900">{t('auth.check_email_title', 'Check your email')}</h2>
            <p className="mt-2 text-gray-600">
              {t('auth.reset_link_sent', "We've sent a password reset link to {{email}}. Please check your inbox.", { email })}
            </p>
          </div>
          <div className="mt-6">
            <Link to="/login">
              <Button className="w-full">{t('auth.return_to_login', 'Return to login')}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 justify-center items-center">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">{t('auth.forgot_password_title', 'Forgot your password?')}</h2>
          <p className="mt-2 text-gray-600">
            {t('auth.forgot_password_desc', "Enter your email address and we'll send you a link to reset your password.")}
          </p>
        </div>

        {error && <div className="p-3 text-sm text-red-600 bg-red-100 rounded">{error}</div>}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              {t('auth.email', 'Email')}
            </label>
            <div className="mt-1">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              {t('auth.back_to_login', 'Back to login')}
            </Link>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('auth.sending', 'Sending...') : t('auth.send_reset_link', 'Send reset link')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
