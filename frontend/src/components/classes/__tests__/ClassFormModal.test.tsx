import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@/utils/testUtils';
import ClassFormModal from '../ClassFormModal';

// Import services to be mocked
import teacherService from '@/services/teacherService';
import classService from '@/services/classService';
import authService from '@/services/authService';

// Mock the modules using their relative paths from the test file
vi.mock('../../../services/teacherService');
vi.mock('../../../services/classService');
vi.mock('../../../services/authService');

describe('ClassFormModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mock returns
    vi.mocked(teacherService.getTeachers).mockResolvedValue({ teachers: [], pagination: { total: 0, pages: 0, page: 1, per_page: 10 } } as any);
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ role: 'admin', id: 1, email: 'admin@test.com' } as any);
  });

  it('renders the modal when isOpen is true', () => {
    render(
      <ClassFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Create New Class')).toBeInTheDocument();
    expect(screen.getByLabelText(/Class Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Grade Level/i, { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText(/Select grade level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Academic Year/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    render(
      <ClassFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });
    
    const submitButton = screen.getByRole('button', { name: /Create Class/i });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText('Class name is required')).toBeInTheDocument();
    expect(screen.getByText('Grade level is required')).toBeInTheDocument();
    expect(screen.getByText('Academic year is required')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <ClassFormModal 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});
