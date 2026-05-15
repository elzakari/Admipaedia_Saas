import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudentListPage from '../pages/StudentListPage';
import StudentDetailPage from '../pages/StudentDetailPage';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock API calls
vi.mock('../../../services/studentService', () => ({
  default: {
    getStudents: vi.fn().mockResolvedValue({
    students: [
      { id: 1, name: 'John Doe', admission_number: 'ADM001', class_id: 1 },
      { id: 2, name: 'Jane Smith', admission_number: 'ADM002', class_id: 1 }
    ],
    pagination: { total: 2, pages: 1 }
    }),
    getStudentById: vi.fn().mockImplementation((id) => {
      return Promise.resolve({
        id,
        name: id === 1 ? 'John Doe' : 'Jane Smith',
        admission_number: id === 1 ? 'ADM001' : 'ADM002',
        email: id === 1 ? 'john@example.com' : 'jane@example.com',
        date_of_birth: '2005-01-01',
        gender: id === 1 ? 'male' : 'female',
        class_id: 1
      });
    })
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui?: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AuthProvider>
          {ui || (
            <Routes>
              <Route path="/" element={<StudentListPage />} />
              <Route path="/students/:id" element={<StudentDetailPage />} />
            </Routes>
          )}
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Student Management Integration', () => {
  test('displays student list and navigates to detail page', async () => {
    renderWithProviders();
    
    // Wait for student list to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
    
    // Click on a student to navigate to detail page
    fireEvent.click(screen.getByText('John Doe'));
    
    // Wait for student detail to load
    await waitFor(() => {
      expect(screen.getByText('Student Details')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });
});
