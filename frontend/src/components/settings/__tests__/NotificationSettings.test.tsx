import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationSettings from '../NotificationSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../ui/use-toast';
import { settingsService } from '../../services';

// Mock the dependencies
jest.mock('@tanstack/react-query');
jest.mock('../ui/use-toast');
jest.mock('../../services');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockSettingsService = settingsService as jest.Mocked<typeof settingsService>;

describe('NotificationSettings', () => {
  const mockQueryClient = {
    invalidateQueries: jest.fn()
  };
  
  const mockToast = {
    toast: jest.fn()
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

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseQueryClient.mockReturnValue(mockQueryClient as any);
    mockUseToast.mockReturnValue(mockToast as any);
    
    // Mock successful query
    mockUseQuery.mockImplementation(({ queryKey, queryFn, onSuccess }: any) => {
      if (queryKey[0] === 'notification-settings') {
        onSuccess?.(mockSettings);
        return {
          data: mockSettings,
          isLoading: false,
          error: null
        } as any;
      }
      return { data: null, isLoading: false, error: null } as any;
    });

    // Mock successful mutations
    mockUseMutation.mockImplementation(({ mutationFn, onSuccess, onError }: any) => {
      return {
        mutate: jest.fn((data) => {
          if (mutationFn === mockSettingsService.updateNotificationSettings) {
            onSuccess?.();
          } else if (mutationFn === mockSettingsService.testEmailConfiguration) {
            onSuccess?.();
          } else if (mutationFn === mockSettingsService.testSmsConfiguration) {
            onSuccess?.();
          }
        }),
        isPending: false
      } as any;
    });

    // Mock settings service
    mockSettingsService.getNotificationSettings = jest.fn().mockResolvedValue(mockSettings);
    mockSettingsService.updateNotificationSettings = jest.fn().mockResolvedValue({ success: true });
    mockSettingsService.testEmailConfiguration = jest.fn().mockResolvedValue({ success: true });
    mockSettingsService.testSmsConfiguration = jest.fn().mockResolvedValue({ success: true });
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
      expect(screen.getByLabelText(/smtp host/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smtp port/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smtp username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smtp password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/encryption/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/from name/i)).toBeInTheDocument();
    });

    it('updates email settings when inputs change', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const smtpHostInput = screen.getByLabelText(/smtp host/i);
      await user.clear(smtpHostInput);
      await user.type(smtpHostInput, 'smtp.outlook.com');
      
      expect(smtpHostInput).toHaveValue('smtp.outlook.com');
    });

    it('toggles email enabled switch', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const emailSwitch = screen.getByLabelText(/enable email notifications/i);
      await user.click(emailSwitch);
      
      expect(emailSwitch).not.toBeChecked();
    });

    it('shows/hides email fields based on enabled state', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const emailSwitch = screen.getByLabelText(/enable email notifications/i);
      await user.click(emailSwitch);
      
      expect(screen.queryByLabelText(/smtp host/i)).not.toBeInTheDocument();
    });

    it('handles test email functionality', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const testEmailInput = screen.getByPlaceholderText(/enter test email address/i);
      const testButton = screen.getByRole('button', { name: /test email/i });
      
      await user.type(testEmailInput, 'test@example.com');
      await user.click(testButton);
      
      await waitFor(() => {
        expect(mockSettingsService.testEmailConfiguration).toHaveBeenCalled();
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Email Sent',
          description: 'Test email has been sent successfully.',
          variant: 'default'
        });
      });
    });

    it('validates test email input', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const testButton = screen.getByRole('button', { name: /test email/i });
      await user.click(testButton);
      
      expect(mockToast.toast).toHaveBeenCalledWith({
        title: 'Validation Error',
        description: 'Please enter a test email address',
        variant: 'destructive'
      });
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
      expect(screen.getByLabelText(/sms provider/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sender id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    });

    it('handles test SMS functionality', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      // Switch to SMS tab
      const smsTab = screen.getByRole('tab', { name: /sms/i });
      await user.click(smsTab);
      
      const testPhoneInput = screen.getByPlaceholderText(/enter test phone number/i);
      const testButton = screen.getByRole('button', { name: /test sms/i });
      
      await user.type(testPhoneInput, '+1234567890');
      await user.click(testButton);
      
      await waitFor(() => {
        expect(mockSettingsService.testSmsConfiguration).toHaveBeenCalled();
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'SMS Sent',
          description: 'Test SMS has been sent successfully.',
          variant: 'default'
        });
      });
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

    it('renders recipient toggles', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      // Switch to Notification Types tab
      const typesTab = screen.getByRole('tab', { name: /notification types/i });
      await user.click(typesTab);
      
      expect(screen.getByLabelText(/students/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/parents/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/teachers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/administrators/i)).toBeInTheDocument();
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

    it('shows digest time when daily digest is enabled', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      // Switch to Timing tab
      const timingTab = screen.getByRole('tab', { name: /timing & delivery/i });
      await user.click(timingTab);
      
      const dailyDigestSwitch = screen.getByLabelText(/daily digest/i);
      await user.click(dailyDigestSwitch);
      
      expect(screen.getByLabelText(/digest time/i)).toBeInTheDocument();
    });

    it('shows quiet hours time fields when enabled', async () => {
      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      // Switch to Timing tab
      const timingTab = screen.getByRole('tab', { name: /timing & delivery/i });
      await user.click(timingTab);
      
      const quietHoursSwitch = screen.getByLabelText(/quiet hours/i);
      await user.click(quietHoursSwitch);
      
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
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

    it('handles save errors', async () => {
      const errorMessage = 'Failed to save settings';
      
      // Mock error mutation
      mockUseMutation.mockImplementationOnce(({ mutationFn, onSuccess, onError }: any) => {
        return {
          mutate: jest.fn((data) => {
            if (mutationFn === mockSettingsService.updateNotificationSettings) {
              onError?.(new Error(errorMessage));
            }
          }),
          isPending: false
        } as any;
      });

      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      });
    });

    it('shows loading state during save', async () => {
      mockUseMutation.mockImplementationOnce(({ mutationFn }: any) => {
        return {
          mutate: jest.fn(),
          isPending: true
        } as any;
      });

      render(<NotificationSettings />);
      
      const saveButton = screen.getByRole('button', { name: /saving.../i });
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('handles query errors gracefully', () => {
      mockUseQuery.mockImplementationOnce(({ queryKey }: any) => {
        if (queryKey[0] === 'notification-settings') {
          return {
            data: null,
            isLoading: false,
            error: new Error('Failed to load settings')
          } as any;
        }
        return { data: null, isLoading: false, error: null } as any;
      });

      render(<NotificationSettings />);
      expect(screen.getByText('Notifications & Alerts')).toBeInTheDocument();
    });

    it('handles test email errors', async () => {
      const errorMessage = 'Email test failed';
      
      // Mock error mutation
      mockUseMutation.mockImplementationOnce(({ mutationFn, onSuccess, onError }: any) => {
        return {
          mutate: jest.fn((data) => {
            if (mutationFn === mockSettingsService.testEmailConfiguration) {
              onError?.(new Error(errorMessage));
            }
          }),
          isPending: false
        } as any;
      });

      const user = userEvent.setup();
      render(<NotificationSettings />);
      
      const testEmailInput = screen.getByPlaceholderText(/enter test email address/i);
      const testButton = screen.getByRole('button', { name: /test email/i });
      
      await user.type(testEmailInput, 'test@example.com');
      await user.click(testButton);
      
      await waitFor(() => {
        expect(mockToast.toast).toHaveBeenCalledWith({
          title: 'Email Failed',
          description: errorMessage,
          variant: 'destructive'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<NotificationSettings />);
      
      expect(screen.getByRole('tab', { name: /email/i })).toHaveAttribute('aria-selected');
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('provides clear form labels', () => {
      render(<NotificationSettings />);
      
      expect(screen.getByLabelText(/enable email notifications/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/smtp host/i)).toBeInTheDocument();
    });
  });
});