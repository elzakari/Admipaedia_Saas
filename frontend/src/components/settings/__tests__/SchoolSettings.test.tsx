import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SchoolSettings from '../SchoolSettings';
import { settingsService } from '../../../services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock the service
vi.mock('../../../services', () => ({
  settingsService: {
    getSchoolSettings: vi.fn(),
    updateSchoolSettings: vi.fn(),
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string) => defaultValue,
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockSchoolSettings = {
  name: 'Test Academy',
  code: 'TEST-123',
  type: 'Secondary School',
  address: '123 Test St',
  city: 'Test City',
  region: 'Greater Accra',
  country: 'Ghana',
  postalCode: 'GA-123',
  phone: '+123456789',
  email: 'test@academy.edu',
  website: 'https://test.edu',
  academicYear: '2024/2025',
  currentTerm: 'First Term',
  gradingSystem: 'GES',
  passingGrade: 50,
  maxStudentsPerClass: 40,
  timezone: 'Africa/Accra',
  language: 'en',
  currency: 'GHS',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  enableSMS: true,
  enableEmail: true,
  enableParentPortal: true,
  enableOnlinePayments: false,
  enableAttendanceTracking: true,
  enableGradeBook: true,
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  logo: '',
  favicon: ''
};

describe('SchoolSettings', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    (settingsService.getSchoolSettings as any).mockResolvedValue(mockSchoolSettings);
    (settingsService.updateSchoolSettings as any).mockResolvedValue({ success: true });
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
    (settingsService.getSchoolSettings as any).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SchoolSettings />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders initial data correctly', async () => {
    renderWithProviders(<SchoolSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/School Name/i)).toHaveValue('Test Academy');
      expect(screen.getByLabelText(/School Code/i)).toHaveValue('TEST-123');
    });
  });

  it('handles tab switching', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchoolSettings />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Basic Info/i })).toBeInTheDocument();
    });

    const academicTab = screen.getByRole('tab', { name: /Academic/i });
    await user.click(academicTab);

    expect(screen.getAllByLabelText(/Academic Year/i)[0]).toBeInTheDocument();
  });

  it('handles saving settings', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchoolSettings />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(settingsService.updateSchoolSettings).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Settings Updated'
      }));
    });
  });
});
