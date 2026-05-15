import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AuditLogs from '../AuditLogs';
import { settingsService } from '../../../services';
import { useToast } from '../../ui/use-toast';

// Mock the services and hooks
vi.mock('../../../services', () => ({
  settingsService: {
    getAuditLogs: vi.fn(),
    getAuditStats: vi.fn(),
    getAuditFilterOptions: vi.fn(),
    exportAuditLogs: vi.fn()
  }
}));

vi.mock('../../ui/use-toast', () => ({
  useToast: vi.fn()
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy') return 'Nov 15, 2024';
    if (formatStr === 'HH:mm:ss') return '14:30:00';
    if (formatStr === 'yyyy-MM-dd') return '2024-11-15';
    return date.toString();
  })
}));

describe('AuditLogs Component', () => {
  const mockToast = vi.fn();
  let queryClient: QueryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, cacheTime: 0 }
      }
    });
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    // Mock URL.createObjectURL for export tests
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Reset all mocks
    vi.clearAllMocks();

    (HTMLAnchorElement.prototype as any).click = vi.fn();
    
    // Mock successful API responses
    (settingsService.getAuditLogs as any).mockResolvedValue({
      data: [
        {
          id: '1',
          timestamp: '2024-11-15T14:30:00Z',
          userId: 'user1',
          userName: 'John Doe',
          userRole: 'admin',
          action: 'user_login',
          resource: 'Authentication',
          resourceId: 'auth1',
          details: { ip: '192.168.1.1' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          status: 'success',
          severity: 'low',
          category: 'authentication'
        },
        {
          id: '2',
          timestamp: '2024-11-15T14:25:00Z',
          userId: 'user2',
          userName: 'Jane Smith',
          userRole: 'teacher',
          action: 'grade_update',
          resource: 'Grade',
          resourceId: 'grade1',
          details: { old_value: 'B', new_value: 'A' },
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
          status: 'success',
          severity: 'medium',
          category: 'data_modification'
        }
      ],
      pagination: { page: 1, pageSize: 20, total: 2, totalPages: 1, hasNext: false, hasPrev: false }
    });
    
    (settingsService.getAuditStats as any).mockResolvedValue({
      totalLogs: 150,
      successRate: 98,
      criticalEvents: 5,
      uniqueUsers: 25,
      topActions: [
        { action: 'user_login', count: 45 },
        { action: 'grade_update', count: 30 }
      ],
      recentFailures: 2
    });
    
    (settingsService.getAuditFilterOptions as any).mockResolvedValue({
      categories: ['authentication', 'data_modification', 'system'],
      actions: ['user_login', 'grade_update', 'data_access'],
      resources: ['Authentication', 'Grade', 'User']
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  it('renders audit logs component correctly', async () => {
    renderWithProviders(<AuditLogs />);
    
    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText('Audit Logs')).toBeInTheDocument();
      expect(screen.getByText('View system activity and user actions')).toBeInTheDocument();
    });
    
    // Check statistics
    expect(screen.getByText('Total Logs')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('98%')).toBeInTheDocument();
  });

  it('displays audit log entries in table', async () => {
    renderWithProviders(<AuditLogs />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('teacher')).toBeInTheDocument();
    });
  });

  it('handles filter toggle functionality', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogs />);
    
    // Click filter button
    const filterButton = await screen.findByRole('button', { name: /filters/i });
    await user.click(filterButton);
    
    // Check if filter panel is shown
    await waitFor(() => {
      expect(screen.getByText('Filter audit logs by various criteria')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
    });
  });

  it('handles export functionality', async () => {
    const user = userEvent.setup();
    const mockBlob = new Blob(['test,data'], { type: 'text/csv' });
    (settingsService.exportAuditLogs as jest.Mock).mockResolvedValue(mockBlob);
    
    renderWithProviders(<AuditLogs />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
    
    // Click export button
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);
    
    // Wait for export to complete
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export Complete',
        description: 'Audit logs have been exported successfully.',
        variant: 'default'
      });
    });
  });

  it('handles refresh functionality', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogs />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    
    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    // Wait for refresh to complete
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Logs Refreshed',
        description: 'Audit logs have been refreshed successfully.',
        variant: 'default'
      });
    });
  });

  it('handles filter changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditLogs />);
    
    // Open filters
    const filterButton = await screen.findByRole('button', { name: /filters/i });
    await user.click(filterButton);
    
    await waitFor(() => {
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
    });
    
    // Type in search field
    const searchInput = screen.getByLabelText('Search');
    await user.type(searchInput, 'test search');

    expect(searchInput).toHaveValue('test search');
    
    // Verify that getAuditLogs was called with search term
    await waitFor(() => {
      const calls = (settingsService.getAuditLogs as any).mock.calls.map((c: any[]) => c[0]);
      expect(calls.some((arg: any) => typeof arg?.searchTerm === 'string' && arg.searchTerm.length > 0)).toBe(true);
    });
  });

  it('displays loading state', () => {
    // Mock loading state - never resolve the promise
    (settingsService.getAuditLogs as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (settingsService.getAuditStats as jest.Mock).mockImplementation(() => new Promise(() => {}));
    (settingsService.getAuditFilterOptions as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    renderWithProviders(<AuditLogs />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays empty state when no logs', async () => {
    (settingsService.getAuditLogs as jest.Mock).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
    });
    
    renderWithProviders(<AuditLogs />);
    
    await waitFor(() => {
      expect(screen.getByText('No audit logs found. Try adjusting your filters or check back later.')).toBeInTheDocument();
    });
  });

  it('handles export errors gracefully', async () => {
    const user = userEvent.setup();
    (settingsService.exportAuditLogs as jest.Mock).mockRejectedValue(new Error('Export failed'));
    
    renderWithProviders(<AuditLogs />);
    
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
    
    const exportButton = screen.getByText('Export');
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Export Failed',
        description: 'Export failed',
        variant: 'destructive'
      });
    });
  });

  it('handles refresh errors gracefully', async () => {
    const user = userEvent.setup();
    (settingsService.getAuditLogs as jest.Mock).mockRejectedValue(new Error('Refresh failed'));
    
    renderWithProviders(<AuditLogs />);
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Refresh Failed',
        description: 'Refresh failed',
        variant: 'destructive'
      });
    });
  });
});
