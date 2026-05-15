import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@/utils/testUtils';
import StudentFormModal from '../StudentFormModal';
import api from '../../../lib/api';

// Mock the API and hooks
vi.mock('../../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
  }
}));

vi.mock('@/hooks/useStudents', () => ({
  useCreateStudent: () => ({ mutate: vi.fn() }),
  useUpdateStudent: () => ({ mutate: vi.fn() })
}));

describe('StudentFormModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default API mock implementations
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/classes') {
        return Promise.resolve({ data: { classes: [{ id: 1, name: 'Class 1' }] } });
      }
      if (url === '/parents') {
        return Promise.resolve({ data: { parents: [{ id: 1, first_name: 'John', last_name: 'Parent' }] } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('renders the modal when isOpen is true', () => {
    render(
      <StudentFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    // Check if modal title is present
    expect(screen.getByText('Add New Student')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <StudentFormModal 
        isOpen={false} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.queryByText('Add New Student')).not.toBeInTheDocument();
  });

  it('shows validation errors for required fields on Next Step click', async () => {
    render(
      <StudentFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    const nextButton = screen.getByRole('button', { name: /^Next$/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      // First name, last name, dob, gender are required on step 0
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Date of birth is required')).toBeInTheDocument();
      expect(screen.getByText('Gender is required')).toBeInTheDocument();
    });
  });

  it('validates email format in Contact Info step', async () => {
    render(
      <StudentFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    // Fill basic info to pass step 0
    fireEvent.change(screen.getByRole('textbox', { name: /First Name/i }), { target: { value: 'John' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Last Name/i }), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '2010-01-01' } });
    fireEvent.change(screen.getByLabelText(/Gender/i), { target: { value: 'male' } });
    
    // Enter invalid email in step 0
    const emailInput = screen.getByLabelText(/Email Address/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    // Click Next - now it should stay on step 0 and show error
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      // Verify we are still on Step 1 (Basic Info) indicator
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
    });
  });
});
