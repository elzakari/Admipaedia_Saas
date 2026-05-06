import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import StudentsPage from '../../pages/students/StudentsPage';
import { AuthProvider } from '../../contexts/AuthContext';
import studentService, { Student } from '../../services/studentService';
import classService, { Class } from '../../services/classService';

// Import jest-dom matchers and types
import '@testing-library/jest-dom';
import '../../types/jest-dom.d.ts';

// Mock services
jest.mock('../../services/studentService');
jest.mock('../../services/classService');

// Create a proper type for the mocked student service with bulkUpdateClass
interface MockedStudentService extends jest.Mocked<typeof studentService> {
  bulkUpdateClass: jest.MockedFunction<(studentIds: number[], classId: number) => Promise<{ success: boolean }>>;
}

const mockStudentService = studentService as MockedStudentService;
const mockClassService = classService as jest.Mocked<typeof classService>;

// Mock data with correct Student interface from studentService
const mockStudents: Student[] = [
  {
    id: 1,
    name: 'John Doe',
    admission_number: 'STU001',
    first_name: 'John',
    last_name: 'Doe',
    middle_name: '',
    display_name: 'John Doe',
    full_name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    telephone: '1234567890',
    gender: 'Male',
    class_id: 1,
    status: 'active',
    created_at: '2023-09-01T00:00:00Z',
    attendance_percentage: 95,
    performance_average: 85,
    date_of_birth: '2005-01-15',
    address: '123 Main St',
    father_name: 'John Doe Sr.',
    father_email: 'john.sr@example.com',
    father_contact: '0987654321',
    mother_name: 'Jane Doe',
    mother_email: 'jane.doe@example.com',
    mother_contact: '0987654322',
    profile_image: null,
    class_name: 'Grade 10A',
    enrollment_date: '2023-09-01',
    parent_name: undefined,
    parent_phone: undefined,
    parent_email: undefined,
    profileImage: undefined,
    studentId: undefined,
    parent_id: undefined,
    surname: '',
    place_of_birth: '',
    religious_denomination: '',
    whatsapp: '',
    postal_address: '',
    digital_address: '',
    city: '',
    country: '',
    residential_address: '',
    local_landmark: '',
    special_circumstance: '',
    allergies: '',
    medication: '',
    physician_name: '',
    physician_phone: '',
    previous_school: '',
    previous_class: '',
    previous_team: '',
    previous_year: '',
    father_address: '',
    father_profession: '',
    father_workplace: '',
    mother_address: '',
    mother_profession: '',
    mother_workplace: ''
  },
  {
    id: 2,
    name: 'Alice Smith',
    admission_number: 'STU002',
    first_name: 'Alice',
    last_name: 'Smith',
    middle_name: '',
    display_name: 'Alice Smith',
    full_name: 'Alice Smith',
    email: 'alice.smith@example.com',
    phone: '1234567891',
    telephone: '1234567891',
    gender: 'Female',
    class_id: 2,
    status: 'active',
    created_at: '2023-09-01T00:00:00Z',
    attendance_percentage: 92,
    performance_average: 88,
    date_of_birth: '2005-03-20',
    address: '456 Oak Ave',
    father_name: 'Bob Smith',
    father_email: 'bob.smith@example.com',
    father_contact: '0987654323',
    mother_name: 'Carol Smith',
    mother_email: 'carol.smith@example.com',
    mother_contact: '0987654324',
    profile_image: null,
    class_name: 'Grade 9B',
    enrollment_date: '2023-09-01',
    parent_name: undefined,
    parent_phone: undefined,
    parent_email: undefined,
    profileImage: undefined,
    studentId: undefined,
    parent_id: undefined,
    surname: '',
    place_of_birth: '',
    religious_denomination: '',
    whatsapp: '',
    postal_address: '',
    digital_address: '',
    city: '',
    country: '',
    residential_address: '',
    local_landmark: '',
    special_circumstance: '',
    allergies: '',
    medication: '',
    physician_name: '',
    physician_phone: '',
    previous_school: '',
    previous_class: '',
    previous_team: '',
    previous_year: '',
    father_address: '',
    father_profession: '',
    father_workplace: '',
    mother_address: '',
    mother_profession: '',
    mother_workplace: ''
  }
];

// Mock classes with correct Class interface from classService
const mockClasses: Class[] = [
  {
    id: 1,
    name: 'Grade 10A',
    grade_level: '10',
    academic_year: '2023-2024',
    status: 'active',
    created_at: '2023-09-01T00:00:00Z',
    updated_at: '2023-09-01T00:00:00Z',
    section: '',
    capacity: 0,
    current_enrollment: 0
  },
  {
    id: 2,
    name: 'Grade 9B',
    grade_level: '9',
    academic_year: '2023-2024',
    status: 'active',
    created_at: '2023-09-01T00:00:00Z',
    updated_at: '2023-09-01T00:00:00Z',
    section: '',
    capacity: 0,
    current_enrollment: 0
  }
];

// Mock user
const mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  roles: ['admin']
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Student Management Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });

    // Setup service mocks with correct return types
    mockStudentService.getStudents.mockResolvedValue({
      students: mockStudents,
      pagination: { page: 1, per_page: 10, total: 2, pages: 1 }
    });
    mockStudentService.getStudentById.mockResolvedValue(mockStudents[0]);
    mockStudentService.createStudent.mockResolvedValue(mockStudents[0]);
    mockStudentService.updateStudent.mockResolvedValue(mockStudents[0]);
    mockStudentService.deleteStudent.mockResolvedValue(undefined);
    
    // Properly assign the bulkUpdateClass method with correct typing
    mockStudentService.bulkUpdateClass = jest.fn<(studentIds: number[], classId: number) => Promise<{ success: boolean }>>().mockResolvedValue({ success: true });
  });

  describe('Student List Display', () => {
    it('should display list of students', async () => {
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });
    });

    it('should show student details in table format', async () => {
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
        
        // Check for table headers
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Student ID')).toBeInTheDocument();
        expect(screen.getByText('Class')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('should display student profile images', async () => {
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const profileImages = screen.getAllByRole('img');
        expect(profileImages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should filter students by search term', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search students/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
      });
    });

    it('should filter students by class', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const classFilter = screen.getByLabelText(/filter by class/i);
      await user.selectOptions(classFilter, '1');

      await waitFor(() => {
        expect(mockStudentService.getStudents).toHaveBeenCalledWith(
          expect.objectContaining({ class_id: 1 })
        );
      });
    });

    it('should filter students by status', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Student CRUD Operations', () => {
    it('should create a new student', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      const addButton = screen.getByText(/add student/i);
      await user.click(addButton);

      // Fill out the form
      await user.type(screen.getByLabelText(/first name/i), 'New');
      await user.type(screen.getByLabelText(/last name/i), 'Student');
      await user.type(screen.getByLabelText(/email/i), 'new.student@example.com');
      await user.selectOptions(screen.getByLabelText(/gender/i), 'Male');
      await user.type(screen.getByLabelText(/date of birth/i), '2005-05-15');

      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockStudentService.createStudent).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: 'New',
            last_name: 'Student',
            email: 'new.student@example.com',
            gender: 'Male',
            date_of_birth: '2005-05-15'
          })
        );
      });
    });

    it('should edit an existing student', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const editButton = screen.getAllByText(/edit/i)[0];
      await user.click(editButton);

      const emailInput = screen.getByDisplayValue('john.doe@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'john.updated@example.com');

      const saveButton = screen.getByText(/save/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockStudentService.updateStudent).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            email: 'john.updated@example.com'
          })
        );
      });
    });

    it('should delete a student', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByText(/delete/i)[0];
      await user.click(deleteButton);

      // Confirm deletion
      const confirmButton = screen.getByText(/confirm/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockStudentService.deleteStudent).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Class Assignment', () => {
    it('should assign students to a class', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select students
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select first student

      const assignClassButton = screen.getByText(/assign to class/i);
      await user.click(assignClassButton);

      const classSelect = screen.getByLabelText(/select class/i);
      await user.selectOptions(classSelect, '2');

      const confirmButton = screen.getByText(/assign/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect((mockStudentService as any).bulkUpdateClass).toHaveBeenCalledWith([1], 2);
      });
    });

    it('should show class assignment success message', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const assignClassButton = screen.getByText(/assign to class/i);
      await user.click(assignClassButton);

      const classSelect = screen.getByLabelText(/select class/i);
      await user.selectOptions(classSelect, '2');

      const confirmButton = screen.getByText(/assign/i);
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/successfully assigned/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockStudentService.getStudents.mockRejectedValue(new Error('API Error'));
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading students/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid form data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      const addButton = screen.getByText(/add student/i);
      await user.click(addButton);

      // Try to submit without required fields
      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors during student creation', async () => {
      const user = userEvent.setup();
      mockStudentService.createStudent.mockRejectedValue(new Error('Network Error'));
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      const addButton = screen.getByText(/add student/i);
      await user.click(addButton);

      await user.type(screen.getByLabelText(/first name/i), 'Test');
      await user.type(screen.getByLabelText(/last name/i), 'Student');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.selectOptions(screen.getByLabelText(/gender/i), 'Male');
      await user.type(screen.getByLabelText(/date of birth/i), '2005-01-01');

      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create student/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      const user = userEvent.setup();
      
      mockStudentService.getStudents.mockResolvedValue({
        students: mockStudents,
        pagination: { total: 20, page: 1, per_page: 10, pages: 2 }
      });

      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const nextButton = screen.getByText(/next/i);
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockStudentService.getStudents).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('should show correct pagination info', async () => {
      mockStudentService.getStudents.mockResolvedValue({
        students: mockStudents,
        pagination: { total: 20, page: 1, per_page: 10, pages: 2 }
      });

      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/showing 1-10 of 20/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('table')).toHaveAccessibleName();
        expect(screen.getByLabelText(/search students/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByLabelText(/search students/i);
      searchInput.focus();
      
      await user.keyboard('{Tab}');
      expect(document.activeElement).not.toBe(searchInput);
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time', async () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(1000); // Should render within 1 second
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockStudents[0],
        id: i + 1,
        name: `Student ${i + 1}`,
        admission_number: `STU${String(i + 1).padStart(3, '0')}`
      }));

      mockStudentService.getStudents.mockResolvedValue({
        students: largeDataset,
        pagination: { total: 100, page: 1, per_page: 10, pages: 10 }
      });

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Student 1')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(2000); // Should handle large datasets within 2 seconds
    });
  });

  describe('Data Validation', () => {
    it('should validate email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      const addButton = screen.getByText(/add student/i);
      await user.click(addButton);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      const addButton = screen.getByText(/add student/i);
      await user.click(addButton);

      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should validate date of birth', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      const addButton = screen.getByText(/add student/i);
      await user.click(addButton);

      const dobInput = screen.getByLabelText(/date of birth/i);
      await user.type(dobInput, '2025-01-01'); // Future date

      const submitButton = screen.getByText(/save/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/date of birth cannot be in the future/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Check if mobile-specific elements are present
      const mobileMenu = screen.queryByLabelText(/mobile menu/i);
      expect(mobileMenu).toBeInTheDocument();
    });

    it('should show/hide columns based on screen size', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Some columns might be hidden on smaller screens
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });
});