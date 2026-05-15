import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../../../utils/testUtils';
import { ForcePasswordReset } from '../ForcePasswordReset';
import api from '../../../lib/api';

// Mock the API
vi.mock('../../../lib/api', () => ({
  default: {
    post: vi.fn(),
  }
}));

// Mock toast and navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockToast = vi.fn();
vi.mock('../../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

describe('ForcePasswordReset Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the reset password form', () => {
    render(<ForcePasswordReset />);
    expect(screen.getByText('Reset Your Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('validates password requirements and shows toast if not met', async () => {
    render(<ForcePasswordReset />);
    
    // Type weak password
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'weak' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } });
    
    const submitButton = screen.getByRole('button', { name: /Update Password/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Password Requirements Not Met",
        variant: "destructive"
      }));
    });
    
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows toast if passwords do not match', async () => {
    render(<ForcePasswordReset />);
    
    // Type strong but mismatched passwords
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!456' } });
    
    const submitButton = screen.getByRole('button', { name: /Update Password/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Passwords Don't Match",
        variant: "destructive"
      }));
    });
    
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits successfully when requirements are met and passwords match', async () => {
    render(<ForcePasswordReset />);
    
    vi.mocked(api.post).mockResolvedValueOnce({ data: { success: true } } as any);
    
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    
    fireEvent.change(newPasswordInput, { target: { value: 'StrongPass123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123!' } });
    
    const submitButton = screen.getByRole('button', { name: /Update Password/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
        new_password: 'StrongPass123!'
      });
    });
    
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Password Updated"
    }));
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
