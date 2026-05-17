import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import UserRoleManagement from '../UserRoleManagement';
import { rbacApi } from '../../../services/rbacApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock rbacApi
vi.mock('../../../services/rbacApi', () => ({
  rbacApi: {
    getAllRoles: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
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

// Mock window.confirm
const mockConfirm = vi.fn();
globalThis.window.confirm = mockConfirm;

const mockRolesResponse = {
  success: true,
  data: [
    {
      id: 1,
      name: 'Administrator',
      description: 'System Administrator with full access',
      permissions: [{ name: 'users.view' }, { name: 'users.create' }],
      user_count: 3,
      is_system: true,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Custom Teacher',
      description: 'Teacher with custom access',
      permissions: [{ name: 'students.view' }],
      user_count: 15,
      is_system: false,
      created_at: '2024-01-02T00:00:00Z',
    },
  ],
};

describe('UserRoleManagement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    (rbacApi.getAllRoles as any).mockResolvedValue(mockRolesResponse);
    (rbacApi.createRole as any).mockResolvedValue({ success: true, data: {} });
    (rbacApi.updateRole as any).mockResolvedValue({ success: true, data: {} });
    (rbacApi.deleteRole as any).mockResolvedValue({ success: true });
    mockConfirm.mockReturnValue(true);
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

  it('renders roles list correctly', async () => {
    renderWithProviders(<UserRoleManagement />);

    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument();
      expect(screen.getByText('Custom Teacher')).toBeInTheDocument();
      expect(screen.getByText('System Administrator with full access')).toBeInTheDocument();
    });
  });

  it('opens create role dialog and creates a new role successfully', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRoleManagement />);

    await waitFor(() => {
      expect(screen.getByTestId('create-role-trigger')).toBeInTheDocument();
    });

    const createButton = screen.getByTestId('create-role-trigger');
    await user.click(createButton);

    // Dialog should be open
    expect(screen.getByText('Create New Role')).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Role Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    await user.type(nameInput, 'Custom Parent');
    await user.type(descriptionInput, 'Parent access level');

    const saveButton = screen.getByTestId('save-role-btn');
    await user.click(saveButton);

    await waitFor(() => {
      expect(rbacApi.createRole).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Custom Parent',
        description: 'Parent access level',
      }));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Role Created',
      }));
    });
  });

  it('validates required fields during role creation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRoleManagement />);

    await waitFor(() => {
      expect(screen.getByTestId('create-role-trigger')).toBeInTheDocument();
    });

    const createButton = screen.getByTestId('create-role-trigger');
    await user.click(createButton);

    const saveButton = screen.getByTestId('save-role-btn');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
      }));
      expect(rbacApi.createRole).not.toHaveBeenCalled();
    });
  });

  it('deletes a role when confirmed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserRoleManagement />);

    await waitFor(() => {
      expect(screen.getByText('Custom Teacher')).toBeInTheDocument();
    });

    // Custom Teacher is at row with ID 2. System roles (like ID 1) shouldn't be deletable.
    const deleteButton = screen.getByTestId('delete-role-2');
    await user.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(rbacApi.deleteRole).toHaveBeenCalledWith(2);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Role Deleted',
      }));
    });
  });
});
