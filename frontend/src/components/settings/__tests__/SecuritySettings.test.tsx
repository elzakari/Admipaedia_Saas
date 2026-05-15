import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SecuritySettings from '../SecuritySettings';
import { settingsService } from '../../../services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock the service
vi.mock('../../../services', () => ({
  settingsService: {
    getSecuritySettings: vi.fn(),
    updateSecuritySettings: vi.fn(),
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockSecuritySettings = {
  twoFactorEnabled: true,
  twoFactorMethod: 'authenticator',
  sessionTimeout: 30,
  passwordExpiry: 90,
  passwordComplexity: true,
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  captchaEnabled: true,
  captchaThreshold: 3,
  ipWhitelistEnabled: true,
  ipWhitelist: ['192.168.1.1'],
  geoBlockingEnabled: false,
  blockedCountries: [],
  apiRateLimit: 1000,
  apiKeyRotation: true,
  apiKeyExpiry: 30,
  encryptionEnabled: true,
  dataRetentionDays: 365,
  autoLogoutEnabled: true,
  autoLogoutTime: 15,
  loginAlerts: true,
  suspiciousActivityAlerts: true,
  securityAuditEnabled: true
};

describe('SecuritySettings', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    (settingsService.getSecuritySettings as any).mockResolvedValue(mockSecuritySettings);
    (settingsService.updateSecuritySettings as any).mockResolvedValue({ success: true });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {ui}
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    (settingsService.getSecuritySettings as any).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SecuritySettings />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders all tabs and initial data', async () => {
    renderWithProviders(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Login Security')).toBeInTheDocument();
      expect(screen.getByText('Access Control')).toBeInTheDocument();
      expect(screen.getByText('API Security')).toBeInTheDocument();
      expect(screen.getByText('Monitoring')).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Enable Two-Factor Authentication/i)).toBeChecked();
    expect(screen.getByLabelText(/Session Timeout/i)).toHaveValue(30);
  });

  it('handles tab switching', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Authentication')).toBeInTheDocument();
    });

    const loginTab = screen.getByText('Login Security');
    await user.click(loginTab);

    expect(screen.getByLabelText(/Maximum Login Attempts/i)).toBeInTheDocument();
  });

  it('handles IP whitelist interactions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Access Control')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Access Control'));

    const ipInput = screen.getByPlaceholderText(/192\.168\.1\.1 or 192\.168\.1\.0\/24/i);
    await user.type(ipInput, '10.0.0.1');
    
    const addButton = screen.getByText('Add');
    await user.click(addButton);

    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'IP Address Added'
    }));
  });

  it('handles saving settings', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SecuritySettings />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(settingsService.updateSecuritySettings).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Security Settings Updated'
      }));
    });
  });
});