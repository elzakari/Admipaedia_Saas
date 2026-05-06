import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { enhancedAuthService } from '../../services/enhanced-auth.service';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

const MFAVerifyPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const tempToken = location.state?.temp_token;
  const email = location.state?.email;

  useEffect(() => {
    if (!tempToken) {
      toast.error('Session expired or invalid. Please login again.');
      navigate('/login');
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) return;

    setIsLoading(true);
    
    try {
      // Map temp_token to mfa_token expected by service
      const response = await enhancedAuthService.verifyMFA({
        mfa_token: tempToken,
        code: code
      });
      
      if (response.success && response.data.access_token) {
        toast.success('Verification successful');
        
        // Manually store tokens
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
           localStorage.setItem('refreshToken', response.data.refresh_token);
        }
        
        // Redirect to dashboard (force reload to update AuthContext)
        window.location.href = '/dashboard';
      } else {
        toast.error('Verification failed. Please try again.');
      }
    } catch (error: any) {
      console.error('MFA Verify Error:', error);
      toast.error(error.message || 'Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
            <ShieldCheck className="h-6 w-6 text-indigo-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Two-Factor Authentication</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit code from your authenticator app
            {email && <span className="block mt-1 font-medium text-gray-800">{email}</span>}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="code" className="sr-only">Verification Code</label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-lg text-center tracking-widest"
              placeholder="000 000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              disabled={isLoading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MFAVerifyPage;
