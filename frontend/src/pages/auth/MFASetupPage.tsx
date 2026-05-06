import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { enhancedAuthService } from '../../services/enhanced-auth.service';
import { toast } from 'sonner';
import { Loader2, Shield, CheckCircle, Copy } from 'lucide-react';

const MFASetupPage: React.FC = () => {
  const [step, setStep] = useState<'init' | 'scan' | 'verify' | 'success'>('init');
  const [secretData, setSecretData] = useState<{ secret_key: string; qr_code: string; setup_token: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      const response = await enhancedAuthService.setupMFA({
        device_name: `Device-${new Date().getTime()}`,
        device_type: 'totp'
      });
      
      if (response.success && response.data) {
        setSecretData({
            secret_key: response.data.secret_key || '',
            qr_code: response.data.qr_code || '',
            setup_token: response.data.setup_token
        });
        setStep('scan');
      }
    } catch (error: any) {
      toast.error('Failed to start MFA setup: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretData) return;
    
    setIsLoading(true);
    try {
      const response = await enhancedAuthService.verifyMFA({
        mfa_token: secretData.setup_token,
        code: verifyCode,
        trust_device: true
      });
      
      if (response.success && response.data.verified) {
        setStep('success');
        toast.success('MFA Enabled Successfully!');
      } else {
        toast.error('Invalid code. Please try again.');
      }
    } catch (error: any) {
      toast.error('Verification failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    if (secretData?.secret_key) {
      navigator.clipboard.writeText(secretData.secret_key);
      toast.success('Secret copied to clipboard');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
          <Shield className="h-6 w-6 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Setup Two-Factor Authentication</h2>
        <p className="mt-2 text-gray-600">Secure your account with an additional layer of protection.</p>
      </div>

      {step === 'init' && (
        <div className="text-center space-y-6">
          <p className="text-gray-700">
            Two-factor authentication (2FA) adds an extra layer of security to your account.
            Whenever you sign in, you'll need to enter both your password and a security code from your mobile app.
          </p>
          <button
            onClick={handleStartSetup}
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : null}
            Start Setup
          </button>
        </div>
      )}

      {step === 'scan' && secretData && (
        <div className="space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
              <QRCodeSVG value={secretData.qr_code} size={200} />
            </div>
            <p className="text-sm text-gray-500">Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy)</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500 mb-2">Can't scan the QR code?</p>
            <div className="flex items-center justify-between bg-white border border-gray-300 rounded px-3 py-2">
              <code className="text-sm font-mono text-gray-800">{secretData.secret_key}</code>
              <button onClick={copySecret} className="text-gray-500 hover:text-indigo-600">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="verifyCode" className="block text-sm font-medium text-gray-700">
                Enter 6-digit code
              </label>
              <input
                type="text"
                id="verifyCode"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
                placeholder="000 000"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || verifyCode.length !== 6}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              Verify & Enable
            </button>
          </form>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center space-y-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">MFA Enabled!</h3>
          <p className="text-gray-500">
            Your account is now more secure. You will be asked for a verification code next time you login.
          </p>
          <button
            onClick={() => navigate('/settings')} // Or dashboard
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            Back to Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default MFASetupPage;
