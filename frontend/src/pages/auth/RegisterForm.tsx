import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError(t('auth.passwords_do_not_match', 'Passwords do not match'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await authService.register({
        username: name,
        email,
        password,
        confirmPassword,
        role: 'user'
      });

      if (!result.success) {
        const msg = result.message || (result as any).error || t('auth.registration_failed', 'Registration failed. Please try again.');
        setError(typeof msg === 'string' ? msg : t('auth.registration_failed', 'Registration failed. Please try again.'));
        return;
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/login');
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
      if (apiMessage) {
        if (typeof apiMessage === 'string') setError(apiMessage);
        else setError(t('auth.registration_check_input', 'Registration failed. Please check your input.'));
      } else {
        setError(t('auth.registration_failed', 'Registration failed. Please try again.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
          {t('auth.full_name', 'Full Name')}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={t('auth.full_name_placeholder', 'Enter your full name')}
        />
      </div>
      
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
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={t('auth.email_placeholder', 'Enter your email')}
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
          {t('auth.password', 'Password')}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={t('auth.create_password_placeholder', 'Create a password')}
        />
      </div>
      
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1">
          {t('auth.confirm_password', 'Confirm Password')}
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={t('auth.confirm_password_placeholder', 'Confirm your password')}
        />
      </div>
      
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
        >
          {isLoading ? t('auth.creating_account', 'Creating account...') : t('auth.create_account', 'Create account')}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;
