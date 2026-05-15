import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import StudentList from '../StudentList';
import { studentService } from '../../../services';

// Mock the service
vi.mock('../../../services', () => ({
  studentService: {
    getStudents: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('StudentList Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('fetches and displays students', async () => {
    // Mock the service response
    (studentService.getStudents as any).mockResolvedValueOnce({
      students: [
        { id: 1, name: 'John Doe', admission_number: 'A12345', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', admission_number: 'A12346', email: 'jane@example.com' }
      ],
      pagination: { total: 2, page: 1, per_page: 20 }
    });

    render(<StudentList />, { wrapper: createWrapper() });

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for the students to be displayed
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Verify service was called correctly
    expect(studentService.getStudents).toHaveBeenCalledTimes(1);
  });

  test('handles error state', async () => {
    // Mock the service to throw an error
    (studentService.getStudents as any).mockRejectedValueOnce(new Error('Failed to fetch'));

    render(<StudentList />, { wrapper: createWrapper() });

    // Wait for the error message
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
