import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GeneralSettings from '../GeneralSettings';
import { settingsService } from '../../../services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock the service
vi.mock('../../../services', () => ({
  settingsService: {
    getGeneralSettings: vi.fn(),
    updateGeneralSettings: vi.fn(),
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockGeneralSettings = {
  schoolName: 'Test Academy',
  schoolCode: 'TEST-123',
  schoolEmail: 'test@academy.edu',
  schoolPhone: '+123456789',
  timezone: 'Africa/Accra',
  language: 'en',
  currency: 'GHS',
  dateFormat: 'dd/mm/yyyy',
  aiRecommendations: true,
  autoBackup: true,
  maintenanceMode: false
};

describe('GeneralSettings', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    (settingsService.getGeneralSettings as any).mockResolvedValue(mockGeneralSettings);
    (settingsService.updateGeneralSettings as any).mockResolvedValue({ success: true });
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
    (settingsService.getGeneralSettings as any).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<GeneralSettings />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders initial data correctly', async () => {
    renderWithProviders(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/School Name/i)).toHaveValue('Test Academy');
      expect(screen.getByLabelText(/School Email/i)).toHaveValue('test@academy.edu');
    });
  });

  it('handles input changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/School Name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/School Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Academy');

    expect(nameInput).toHaveValue('Updated Academy');
  });

  it('handles reset to defaults', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset to Defaults');
    await user.click(resetButton);

    expect(screen.getByLabelText(/School Name/i)).toHaveValue('ADMIPAEDIA Academy');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Settings Reset'
    }));
  });

  it('handles saving settings', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeneralSettings />);

    await waitFor(() => {
      expect(screen.getAllByText('Save Changes')[0]).toBeInTheDocument();
    });

    const saveButton = screen.getAllByText('Save Changes')[0];
    await user.click(saveButton);

    await waitFor(() => {
      expect(settingsService.updateGeneralSettings).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Settings Updated'
      }));
    });
  });

  it('handles AI recommendation apply', async () => {
    const user = userEvent.setup();
    // Start with a different timezone
    renderWithProviders(<GeneralSettings />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByLabelText(/School Name/i)).toHaveValue('Test Academy');
    });

    // Check if AI recommendations banner is visible
    expect(screen.getByText(/Based on your location/i)).toBeInTheDocument();

    const applyButton = screen.getByRole('button', { name: /Apply/i });
    await user.click(applyButton);

    // Should change timezone to Africa/Accra as per component logic
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Recommendations Applied'
    }));
  });
});
