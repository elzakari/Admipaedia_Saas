import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecuritySettings from '../SecuritySettings';
import { securitySettingsService } from '@/services/securitySettingsService';
import { useAuth } from '@/contexts/AuthContext';

// Mock the services and hooks
jest.mock('@/services/securitySettingsService');
jest.mock('@/contexts/AuthContext');

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={`card ${className}`} data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div className="card-header" data-testid="card-header">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div className="card-content" data-testid="card-content">{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={`card-title ${className}`} data-testid="card-title">{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p className="card-description" data-testid="card-description">{children}</p>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) => (
    <span className={`badge ${className} ${variant ? `badge-${variant}` : ''}`} data-testid="badge">{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, disabled }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    variant?: string; 
    size?: string;
    className?: string;
    disabled?: boolean;
  }) => (
    <button 
      className={`button ${variant ? `button-${variant}` : ''} ${size ? `button-${size}` : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, className, disabled }: {
    value?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    type?: string;
    className?: string;
    disabled?: boolean;
  }) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input ${className}`}
      disabled={disabled}
      data-testid="input"
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, disabled }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
      className="select"
      data-testid="select"
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div className="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value} data-testid={`select-item-${value}`}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div className="select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span className="select-value" data-testid="select-value">{placeholder}</span>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled, className }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      disabled={disabled}
      className={`switch ${className} ${checked ? 'switch-checked' : ''}`}
      data-testid="switch"
    >
      {checked ? 'ON' : 'OFF'}
    </button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <div className={`alert ${variant ? `alert-${variant}` : ''}`} data-testid="alert">{children}</div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <h4 className="alert-title" data-testid="alert-title">{children}</h4>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div className="alert-description" data-testid="alert-description">{children}</div>
  ),
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table className="table" data-testid="table">{children}</table>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead className="table-header">{children}</thead>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody className="table-body">{children}</tbody>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr className="table-row">{children}</tr>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th className="table-head">{children}</th>
  ),
  TableCell: ({ children }: { children: React.ReactNode }) => (
    <td className="table-cell">{children}</td>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div className={`dialog ${open ? 'dialog-open' : ''}`} data-testid="dialog">{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div className="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div className="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 className="dialog-title">{children}</h3>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p className="dialog-description">{children}</p>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div className="dialog-trigger">{children}</div>
  ),
}));

const mockSecuritySettingsService = {
  getSecuritySettings: jest.fn(),
  updateSecuritySettings: jest.fn(),
  getLoginAttempts: jest.fn(),
  getActiveSessions: jest.fn(),
  revokeSession: jest.fn(),
  getSecurityLogs: jest.fn(),
  enableTwoFactorAuth: jest.fn(),
  disableTwoFactorAuth: jest.fn(),
  updatePasswordPolicy: jest.fn(),
  getPasswordPolicy: jest.fn(),
  testSecurityConfiguration: jest.fn(),
};

const mockUseAuth = {
  user: {
    id: 'user-123',
    email: 'admin@example.com',
    role: 'admin',
    permissions: ['security:read', 'security:write'],
  },
  isAuthenticated: true,
};

const mockSecuritySettings = {
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordExpirationDays: 90,
    preventPasswordReuse: true,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
  },
  sessionSettings: {
    sessionTimeout: 3600,
    concurrentSessions: 3,
    rememberMeDuration: 604800,
    secureCookies: true,
    httpOnlyCookies: true,
    sameSitePolicy: 'strict',
  },
  twoFactorAuth: {
    enabled: true,
    requiredForAdmin: true,
    requiredForModerator: false,
    backupCodes: 8,
    authenticatorApps: ['Google Authenticator', 'Authy'],
  },
  apiSecurity: {
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60,
      burstCapacity: 10,
    },
    cors: {
      enabled: true,
      allowedOrigins: ['https://admipaedia.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    csrfProtection: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline';",
  },
  encryption: {
    dataEncryption: true,
    algorithm: 'AES-256-GCM',
    keyRotationInterval: 2592000,
    lastKeyRotation: new Date().toISOString(),
  },
  auditLogging: {
    enabled: true,
    logLevel: 'info',
    retentionDays: 365,
    includeUserActivity: true,
    includeSystemEvents: true,
    includeSecurityEvents: true,
  },
};

const mockLoginAttempts = [
  {
    id: 'attempt-1',
    userId: 'user-456',
    email: 'user@example.com',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...',
    status: 'failed',
    reason: 'invalid_password',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'attempt-2',
    userId: 'user-789',
    email: 'admin@example.com',
    ipAddress: '10.0.0.50',
    userAgent: 'Chrome/91.0...',
    status: 'success',
    reason: null,
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
];

const mockActiveSessions = [
  {
    id: 'session-1',
    userId: 'user-123',
    email: 'admin@example.com',
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
    deviceInfo: 'Chrome on Windows',
    loginTime: new Date(Date.now() - 1800000).toISOString(),
    lastActivity: new Date(Date.now() - 300000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    isCurrentSession: true,
  },
  {
    id: 'session-2',
    userId: 'user-123',
    email: 'admin@example.com',
    ipAddress: '192.168.1.20',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6)...',
    deviceInfo: 'Safari on iPhone',
    loginTime: new Date(Date.now() - 86400000).toISOString(),
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 172800000).toISOString(),
    isCurrentSession: false,
  },
];

const mockSecurityLogs = [
  {
    id: 'log-1',
    level: 'warning',
    message: 'Multiple failed login attempts detected',
    category: 'security',
    userId: null,
    ipAddress: '192.168.1.100',
    userAgent: 'Unknown',
    metadata: { attempts: 5, timeframe: '5 minutes' },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'log-2',
    level: 'info',
    message: 'Password policy updated',
    category: 'configuration',
    userId: 'user-123',
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0...',
    metadata: { changes: ['minLength', 'requireSpecialChars'] },
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
];

describe('SecuritySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup service mocks
    Object.assign(securitySettingsService, mockSecuritySettingsService);
    (securitySettingsService.getSecuritySettings as jest.Mock).mockResolvedValue(mockSecuritySettings);
    (securitySettingsService.updateSecuritySettings as jest.Mock).mockResolvedValue({ success: true });
    (securitySettingsService.getLoginAttempts as jest.Mock).mockResolvedValue(mockLoginAttempts);
    (securitySettingsService.getActiveSessions as jest.Mock).mockResolvedValue(mockActiveSessions);
    (securitySettingsService.revokeSession as jest.Mock).mockResolvedValue({ success: true });
    (securitySettingsService.getSecurityLogs as jest.Mock).mockResolvedValue(mockSecurityLogs);
    (securitySettingsService.enableTwoFactorAuth as jest.Mock).mockResolvedValue({ success: true });
    (securitySettingsService.disableTwoFactorAuth as jest.Mock).mockResolvedValue({ success: true });
    (securitySettingsService.updatePasswordPolicy as jest.Mock).mockResolvedValue({ success: true });
    (securitySettingsService.getPasswordPolicy as jest.Mock).mockResolvedValue(mockSecuritySettings.passwordPolicy);
    (securitySettingsService.testSecurityConfiguration as jest.Mock).mockResolvedValue({
      passed: true,
      warnings: [],
      errors: [],
    });

    // Setup auth mock
    (useAuth as jest.Mock).mockReturnValue(mockUseAuth);
  });

  it('renders security settings with all sections', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Security Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure security policies, authentication, and monitoring')).toBeInTheDocument();
    });

    // Check all main sections are present
    expect(screen.getByText('Password Policy')).toBeInTheDocument();
    expect(screen.getByText('Session Management')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('API Security')).toBeInTheDocument();
    expect(screen.getByText('Encryption')).toBeInTheDocument();
    expect(screen.getByText('Audit Logging')).toBeInTheDocument();
    expect(screen.getByText('Login Attempts')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText('Security Logs')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    (securitySettingsService.getSecuritySettings as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<SecuritySettings />);

    expect(screen.getByText('Loading security settings...')).toBeInTheDocument();
  });

  it('displays error state with retry functionality', async () => {
    const mockError = new Error('Failed to fetch security settings');
    (securitySettingsService.getSecuritySettings as jest.Mock).mockRejectedValue(mockError);

    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Security Settings Error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to fetch security settings/)).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    
    await waitFor(() => {
      expect(securitySettingsService.getSecuritySettings).toHaveBeenCalledTimes(2);
    });
  });

  it('handles password policy updates', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Password Policy')).toBeInTheDocument();
    });

    // Update min length
    const minLengthInput = screen.getByDisplayValue('8');
    await user.clear(minLengthInput);
    await user.type(minLengthInput, '10');

    // Toggle require uppercase
    const uppercaseSwitch = screen.getAllByRole('switch')[0];
    fireEvent.click(uppercaseSwitch);

    // Save changes
    const saveButton = screen.getByText('Save Password Policy');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(securitySettingsService.updatePasswordPolicy).toHaveBeenCalledWith({
        minLength: 10,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        passwordExpirationDays: 90,
        preventPasswordReuse: true,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
      });
    });
  });

  it('handles session management updates', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Session Management')).toBeInTheDocument();
    });

    // Update session timeout
    const timeoutInput = screen.getByDisplayValue('3600');
    await user.clear(timeoutInput);
    await user.type(timeoutInput, '7200');

    // Update concurrent sessions
    const concurrentInput = screen.getByDisplayValue('3');
    await user.clear(concurrentInput);
    await user.type(concurrentInput, '5');

    // Save changes
    const saveButton = screen.getByText('Save Session Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(securitySettingsService.updateSecuritySettings).toHaveBeenCalledWith({
        sessionSettings: {
          sessionTimeout: 7200,
          concurrentSessions: 5,
          rememberMeDuration: 604800,
          secureCookies: true,
          httpOnlyCookies: true,
          sameSitePolicy: 'strict',
        },
      });
    });
  });

  it('handles two-factor authentication settings', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    });

    // Toggle 2FA for admin
    const admin2FASwitch = screen.getAllByRole('switch')[2];
    fireEvent.click(admin2FASwitch);

    // Save changes
    const saveButton = screen.getByText('Save 2FA Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(securitySettingsService.updateSecuritySettings).toHaveBeenCalledWith({
        twoFactorAuth: {
          enabled: true,
          requiredForAdmin: false,
          requiredForModerator: false,
          backupCodes: 8,
          authenticatorApps: ['Google Authenticator', 'Authy'],
        },
      });
    });
  });

  it('handles API security settings', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('API Security')).toBeInTheDocument();
    });

    // Update rate limiting
    const rateLimitInput = screen.getByDisplayValue('60');
    await user.clear(rateLimitInput);
    await user.type(rateLimitInput, '120');

    // Toggle CORS
    const corsSwitch = screen.getAllByRole('switch')[3];
    fireEvent.click(corsSwitch);

    // Save changes
    const saveButton = screen.getByText('Save API Security');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(securitySettingsService.updateSecuritySettings).toHaveBeenCalledWith({
        apiSecurity: {
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 120,
            burstCapacity: 10,
          },
          cors: {
            enabled: false,
            allowedOrigins: ['https://admipaedia.com'],
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
          },
          csrfProtection: true,
          contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline';",
        },
      });
    });
  });

  it('handles audit logging settings', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Audit Logging')).toBeInTheDocument();
    });

    // Toggle user activity logging
    const userActivitySwitch = screen.getAllByRole('switch')[4];
    fireEvent.click(userActivitySwitch);

    // Save changes
    const saveButton = screen.getByText('Save Audit Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(securitySettingsService.updateSecuritySettings).toHaveBeenCalledWith({
        auditLogging: {
          enabled: true,
          logLevel: 'info',
          retentionDays: 365,
          includeUserActivity: false,
          includeSystemEvents: true,
          includeSecurityEvents: true,
        },
      });
    });
  });

  it('displays login attempts table', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Login Attempts')).toBeInTheDocument();
    });

    // Check login attempt data is displayed
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.100')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
    expect(screen.getByText('invalid_password')).toBeInTheDocument();

    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.50')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('displays active sessions table with revoke functionality', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    });

    // Check session data is displayed
    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
    expect(screen.getByText('Current Session')).toBeInTheDocument();

    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.20')).toBeInTheDocument();

    // Test revoke session
    const revokeButtons = screen.getAllByText('Revoke');
    expect(revokeButtons.length).toBe(1); // Only non-current session can be revoked

    fireEvent.click(revokeButtons[0]);

    await waitFor(() => {
      expect(securitySettingsService.revokeSession).toHaveBeenCalledWith('session-2');
    });
  });

  it('displays security logs', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Security Logs')).toBeInTheDocument();
    });

    // Check log data is displayed
    expect(screen.getByText('Multiple failed login attempts detected')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
    expect(screen.getByText('security')).toBeInTheDocument();

    expect(screen.getByText('Password policy updated')).toBeInTheDocument();
    expect(screen.getByText('info')).toBeInTheDocument();
    expect(screen.getByText('configuration')).toBeInTheDocument();
  });

  it('handles security configuration testing', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Security Configuration Test')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Test Configuration');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(securitySettingsService.testSecurityConfiguration).toHaveBeenCalled();
      expect(screen.getByText('Configuration test passed')).toBeInTheDocument();
    });
  });

  it('handles security configuration test failures', async () => {
    (securitySettingsService.testSecurityConfiguration as jest.Mock).mockResolvedValue({
      passed: false,
      warnings: ['Weak password policy'],
      errors: ['CSRF protection disabled'],
    });

    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Security Configuration Test')).toBeInTheDocument();
    });

    const testButton = screen.getByText('Test Configuration');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('Configuration test failed')).toBeInTheDocument();
      expect(screen.getByText('Weak password policy')).toBeInTheDocument();
      expect(screen.getByText('CSRF protection disabled')).toBeInTheDocument();
    });
  });

  it('handles permission restrictions for non-admin users', () => {
    (useAuth as jest.Mock).mockReturnValue({
      ...mockUseAuth,
      user: {
        ...mockUseAuth.user,
        permissions: ['security:read'], // Only read permissions
      },
    });

    render(<SecuritySettings />);

    // All save buttons should be disabled for users without write permissions
    const saveButtons = screen.getAllByText(/Save/);
    saveButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('handles form validation for password policy', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Password Policy')).toBeInTheDocument();
    });

    // Try to set invalid min length (less than 6)
    const minLengthInput = screen.getByDisplayValue('8');
    await user.clear(minLengthInput);
    await user.type(minLengthInput, '4');

    const saveButton = screen.getByText('Save Password Policy');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Minimum length must be at least 6 characters')).toBeInTheDocument();
      expect(securitySettingsService.updatePasswordPolicy).not.toHaveBeenCalled();
    });
  });

  it('handles form validation for session timeout', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Session Management')).toBeInTheDocument();
    });

    // Try to set invalid session timeout (less than 300 seconds)
    const timeoutInput = screen.getByDisplayValue('3600');
    await user.clear(timeoutInput);
    await user.type(timeoutInput, '100');

    const saveButton = screen.getByText('Save Session Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Session timeout must be at least 5 minutes')).toBeInTheDocument();
      expect(securitySettingsService.updateSecuritySettings).not.toHaveBeenCalled();
    });
  });

  it('handles real-time updates when settings change', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Password Policy')).toBeInTheDocument();
    });

    // Simulate external settings update
    const updatedSettings = {
      ...mockSecuritySettings,
      passwordPolicy: {
        ...mockSecuritySettings.passwordPolicy,
        minLength: 12,
      },
    };

    (securitySettingsService.getSecuritySettings as jest.Mock).mockResolvedValue(updatedSettings);

    // Trigger refresh
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('12')).toBeInTheDocument();
    });
  });

  it('handles bulk settings import', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Import/Export Settings')).toBeInTheDocument();
    });

    const importButton = screen.getByText('Import Settings');
    fireEvent.click(importButton);

    const settingsJson = JSON.stringify(mockSecuritySettings, null, 2);
    const fileInput = screen.getByTestId('file-input');
    
    // Simulate file upload
    const file = new File([settingsJson], 'security-settings.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file],
    });
    fireEvent.change(fileInput);

    const confirmButton = screen.getByText('Confirm Import');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(securitySettingsService.updateSecuritySettings).toHaveBeenCalledWith(mockSecuritySettings);
    });
  });

  it('handles settings export functionality', async () => {
    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Import/Export Settings')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export Settings');
    fireEvent.click(exportButton);

    await waitFor(() => {
      // Should trigger file download
      expect(screen.getByText('Settings exported successfully')).toBeInTheDocument();
    });
  });

  it('handles responsive design', () => {
    const { container } = render(<SecuritySettings className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders without errors when data is minimal', async () => {
    (securitySettingsService.getSecuritySettings as jest.Mock).mockResolvedValue({
      passwordPolicy: {},
      sessionSettings: {},
      twoFactorAuth: {},
      apiSecurity: {},
      encryption: {},
      auditLogging: {},
    });

    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Security Settings')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    (securitySettingsService.getSecuritySettings as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    render(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Security Settings Error')).toBeInTheDocument();
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });
});