import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationSettings from '../NotificationSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../ui/use-toast';
import { settingsService } from '../../../services';

// Mock the dependencies
const mockUseQuery = vi.hoisted(() => vi.fn());
const mockUseMutation = vi.hoisted(() => vi.fn());
const mockUseQueryClient = vi.hoisted(() => vi.fn());
const mockUseToast = vi.hoisted(() => vi.fn());
const mockSettingsService = vi.hoisted(() => ({
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
  getTenantNotificationStatus: vi.fn(),
  testEmailConfiguration: vi.fn(),
  testSmsConfiguration: vi.fn()
}));

vi.mock('@tanstack/react-query', async () => {
  const actual: any = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: mockUseQuery,
    useMutation: mockUseMutation,
    useQueryClient: mockUseQueryClient
  };
});

vi.mock('../../ui/use-toast', () => ({
  useToast: mockUseToast
}));

vi.mock('../../../services', () => ({
  settingsService: mockSettingsService
}));

describe('NotificationSettings', () => {
  const mockQueryClient = {
    invalidateQueries: vi.fn()
  };
  
  const mockToast = {
    toast: vi.fn()
  };

  const mockSettings = {
    emailEnabled: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUsername: 'test@example.com',
    smtpPassword: 'password123',
    smtpEncryption: 'tls',
    fromEmail: 'noreply@school.edu',
    fromName: 'Test School',
    smsEnabled: true,
    smsProvider: 'twilio',
    smsApiKey: 'api-key-123',
    smsSenderId: 'SCHOOL',
    studentRegistration: true,
    examResults: true,
    feePayment: true,
    attendanceAlerts: true,
    disciplinaryActions: true,
    generalAnnouncements: true,
    notifyStudents: true,
    notifyParents: true,
    notifyTeachers: true,
    notifyAdmin: true,
    sendImmediately: true,
    dailyDigest: false,
    digestTime: '08:00',
    quietHours: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  };

  const mockStatus = {
    email: {
      status: 'Connected (Active)',
      remaining: 'Unlimited',
      allowance: 'Unlimited',
      used: 120
    },
    sms: {
      status: 'Connected (Active)',
      remaining: 500,
      allowance: 1000,
      used: 500
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseQueryClient.mockReturnValue(mockQueryClient as any);
    mockUseToast.mockReturnValue(mockToast as any);
    
    // Mock successful query
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'notification-settings') {
        return {
          data: mockSettings,
          isLoading: false,
          error: null
        } as any;
      }
      if (queryKey[0] === 'tenant-notification-status') {
        return {
          data: mockStatus,
          isLoading: false,
          error: null
        } as any;
      }
      return { data: null, isLoading: false, error: null } as any;
    });

    mockUseMutation.mockImplementation(({ mutationFn, onSuccess, onError }: any) => {
      return {
        mutate: vi.fn((data) => {
          Promise.resolve()
            .then(() => mutationFn(data))
            .then((result) => onSuccess?.(result))
            .catch((err) => onError?.(err));
        }),
        isPending: false
      } as any;
    });

    // Mock settings service
    mockSettingsService.getNotificationSettings.mockResolvedValue(mockSettings);
    mockSettingsService.updateNotificationSettings.mockResolvedValue({ success: true });
    mockSettingsService.getTenantNotificationStatus.mockResolvedValue(mockStatus);
  });

  it('renders without crashing', () => {
    render(<NotificationSettings />);
    expect(screen.getByText('Notifications & Alerts')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUseQuery.mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'notification-settings') {
        return {
          data: null,
          isLoading: true,
          error: null
        } as any;
      }
      return { data: null, isLoading: false, error: null } as any;
    });

    render(<NotificationSettings />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders all tabs correctly', () => {
    render(<NotificationSettings />);
    
    expect(screen.getByRole('tab', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /sms/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notification types/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /timing & delivery/i })).toBeInTheDocument();
  });

  it('switches between tabs', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);
    
    // Click on SMS tab
    const smsTab = screen.getByRole('tab', { name: /sms/i });
    await user.click(smsTab);
    
    expect(screen.getByText('SMS Configuration')).toBeInTheDocument();
  });

  describe('Email Settings', () => {
    it('renders email configuration fields', () => {
      render(<NotificationSettings />);
      
      expect(screen.getByLabelText(/enable email notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from name/i)).toBeInTheDocument();
      
      // Removed fields shouldn't exist
      expect(screen.queryByLabelText(/smtp host/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/smtp port/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/smtp username/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/smtp password/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/encryption/i)).not.toBeInTheDocument();
    });

    it('renders platform gateway status banner', () => {
      render(<NotificationSettings />);
      expect(screen.getByText('Platform Mail Gateway: Connected (Active)')).toBeInTheDocument();
      expect(screen.getByText('Unlimited')).toBeInTheDocument();
    });

    it('renders domain verification note', () => {
      render(<NotificationSettings />);
      expect(screen.getByText(/Ensure your custom domain has verified SPF\/DKIM records/i)).toBeInTheDocument();
    });

    it('toggles email enabled switch', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const emailSwitch = screen.getByLabelText(/enable email notifications/i);
      await user.click(emailSwitch);
      
      expect(emailSwitch).not.toBeChecked();
    });
  });

  describe('SMS Settings', () => {
    it('renders SMS configuration fields', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      // Switch to SMS tab
      const smsTab = screen.getByRole('tab', { name: /sms/i });
      await user.click(smsTab);
      
      expect(screen.getByLabelText(/enable sms notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sender id/i)).toBeInTheDocument();
      
      // Removed fields shouldn't exist
      expect(screen.queryByLabelText(/sms provider/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
    });
  });

  describe('Notification Types', () => {
    it('renders all notification type toggles', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      // Switch to Notification Types tab
      const typesTab = screen.getByRole('tab', { name: /notification types/i });
      await user.click(typesTab);
      
      expect(screen.getByLabelText(/student registration/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/exam results/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/fee payment/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/attendance alerts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/disciplinary actions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/general announcements/i)).toBeInTheDocument();
    });
  });

  describe('Timing & Delivery', () => {
    it('renders timing configuration fields', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      // Switch to Timing tab
      const timingTab = screen.getByRole('tab', { name: /timing & delivery/i });
      await user.click(timingTab);
      
      expect(screen.getByLabelText(/send immediately/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/daily digest/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quiet hours/i)).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('saves settings successfully', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockSettingsService.updateNotificationSettings).toHaveBeenCalled();
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Settings Updated',
          description: 'Notification settings have been updated successfully.',
          variant: 'default'
        });
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: ['notification-settings']
        });
      });
    });
  });
});
