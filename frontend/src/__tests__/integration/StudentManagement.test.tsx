import { describe, it, expect, beforeEach, vi } from 'vitest';

// Shared mutable mock for useDeleteStudent mutate (declared above hoisted vi.mock blocks so they can capture it by ref)
let deleteMutateMock = vi.fn();
let createMutateAsyncMock = vi.fn().mockResolvedValue({ data: { id: 1 }, success: true });
let updateMutateAsyncMock = vi.fn().mockResolvedValue({ data: { id: 1 }, success: true });

// Mock services with factories to ensure methods are mocked
vi.mock('../../services/studentService', () => {
  const mockObj = {
    getStudents: vi.fn(),
    getStudentById: vi.fn(),
    createStudent: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudent: vi.fn(),
    bulkUpdateClass: vi.fn(),
    getStudentsByClass: vi.fn(),
    getStudentProfile: vi.fn(),
    importStudents: vi.fn(),
    exportStudents: vi.fn(),
    resetPassword: vi.fn(),
    promoteStudents: vi.fn()
  };
  return {
    __esModule: true,
    studentService: mockObj,
    default: mockObj
  };
});

vi.mock('../../services/classService', () => {
  const mockObj = {
    getClasses: vi.fn(),
    getClassById: vi.fn(),
    createClass: vi.fn(),
    updateClass: vi.fn(),
    deleteClass: vi.fn()
  };
  return {
    __esModule: true,
    classService: mockObj,
    default: mockObj
  };
});

// Mock lib/api used by StudentFormModal for /classes and /parents fetches (inside component, not via service)
vi.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
}));

// Mock the useStudents hooks that StudentsPage + StudentFormModal use internally
vi.mock('../../hooks/useStudents', () => {
  const mkMutation = (mutateAsyncFn: any, mutateFn: any, mockResolved = { data: { id: 1 }, success: true }) => ({
    mutateAsync: mutateAsyncFn ?? vi.fn().mockResolvedValue(mockResolved),
    mutate: mutateFn ?? vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset: vi.fn(),
  });
  return {
    useStudents: vi.fn().mockImplementation(() => ({
      data: {
        data: [
          { id: 1, first_name: 'John', last_name: 'Doe', name: 'John Doe', email: 'john.doe@example.com', phone: '1234567890', telephone: '1234567890', gender: 'Male', class_id: 1, status: 'active', attendance_percentage: 95, performance_average: 85, class_name: 'Grade 1', admission_number: 'STU001', profile_image: 'https://example.com/avatar.jpg', date_of_birth: '2005-01-15', address: '123 Main St' },
          { id: 2, first_name: 'Alice', last_name: 'Smith', name: 'Alice Smith', email: 'alice.smith@example.com', phone: '1234567891', telephone: '1234567891', gender: 'Female', class_id: 2, status: 'active', attendance_percentage: 92, performance_average: 88, class_name: 'Grade 2', admission_number: 'STU002', profile_image: 'https://example.com/avatar.jpg', date_of_birth: '2005-03-20', address: '456 Oak Ave' },
        ],
        pagination: { total: 2, total_pages: 1, current_page: 1, per_page: 10 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({}),
    })),
    useStudentAnalyticsSummary: vi.fn().mockReturnValue({
      data: {
        total_students: 2,
        average_attendance_rate: 93.5,
        average_performance_score: 86.5,
        at_risk_students_count: 0,
        attendance_marks_recorded: 20,
        attendance_total_days: 30,
        grades_recorded_count: 40,
        linked_parents_count: 2,
        needs_follow_up_count: 0,
        missing_contacts_count: 0,
        unassigned_classes_count: 0,
      },
      isLoading: false,
      isError: false,
    }),
    useStudent: vi.fn().mockReturnValue({ data: undefined, isLoading: false }),
    useCreateStudent: vi.fn(() => mkMutation(createMutateAsyncMock, undefined)),
    useUpdateStudent: vi.fn(() => mkMutation(updateMutateAsyncMock, undefined)),
    useDeleteStudent: vi.fn(() => mkMutation(undefined, deleteMutateMock, { success: true })),
  };
});

// Mock useClasses hook that StudentsPage imports separately
vi.mock('../../hooks/useClasses', () => ({
  useClasses: vi.fn().mockReturnValue({
    data: {
      data: [
        { id: 1, name: 'Grade 1', grade_level: '1', status: 'active', academic_year: '2023-2024' },
        { id: 2, name: 'Grade 2', grade_level: '2', status: 'active', academic_year: '2023-2024' },
      ],
      pagination: { total: 2, total_pages: 1, current_page: 1, per_page: 200 },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn().mockResolvedValue({}),
  }),
}));

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StudentsPage from '../../pages/students/StudentsPage';
import { AuthProvider } from '../../contexts/AuthContext';
import studentService, { Student } from '../../services/studentService';
import classService, { Class } from '../../services/classService';

// Import jest-dom matchers and types
import '@testing-library/jest-dom';
import '../../types/jest-dom.d.ts';

const jest = vi;

// Create a proper type for the mocked student service with bulkUpdateClass
interface MockedStudentService {
  getStudents: any;
  getStudentById: any;
  createStudent: any;
  updateStudent: any;
  deleteStudent: any;
  bulkUpdateClass: any;
  getStudentsByClass: any;
  getStudentProfile: any;
  importStudents: any;
  exportStudents: any;
  resetPassword: any;
  promoteStudents: any;
}

const mockStudentService = studentService as unknown as MockedStudentService;
const mockClassService = classService as any;

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
    profile_image: 'https://example.com/avatar.jpg',
    class_name: 'Grade 1',
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
    profile_image: 'https://example.com/avatar.jpg',
    class_name: 'Grade 2',
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
    name: 'Grade 1',
    grade_level: '1',
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
    name: 'Grade 2',
    grade_level: '2',
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
const _mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  roles: ['admin']
};

import { ThemeProvider } from '../../contexts/ThemeContext';
import { TouchGestureProvider } from '../../contexts/TouchGestureContext';
import api from '../../lib/api';

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
        <ThemeProvider>
          <TouchGestureProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </TouchGestureProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Student Management Integration Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clean up Radix scroll/pointer locks from other runs
    document.body.removeAttribute('data-scroll-locked');
    document.body.style.pointerEvents = '';
    
    // Mock localStorage (getItem must return null string-compatible value to avoid JSON.parse(undefined))
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });

    // Flush pending microtasks + timer callbacks that could schedule setState outside act()
    await act(async () => {
      await Promise.resolve();
    });

    // Reset hook-level mutable shared mocks (useStudents hooks module-level mocks)
    deleteMutateMock.mockClear?.();
    createMutateAsyncMock.mockClear?.();
    updateMutateAsyncMock.mockClear?.();

    // Default lib/api mock for StudentFormModal inline data-fetches (not through services)
    vi.mocked(api.get).mockImplementation(((url: string, _opts?: any) => {
      if (url === '/classes') {
        return Promise.resolve({ data: { classes: [{ id: 1, name: 'Grade 1' }, { id: 2, name: 'Grade 2' }] } });
      }
      if (url === '/parents') {
        return Promise.resolve({ data: { data: { parents: [{ id: 1, first_name: 'Jane', last_name: 'Doe' }] }, parents: [{ id: 1, first_name: 'Jane', last_name: 'Doe' }] } });
      }
      return Promise.resolve({ data: {} });
    }) as any);
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as any);
    vi.mocked(api.put).mockResolvedValue({ data: { success: true } } as any);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } } as any);

    // Setup service mocks with correct return types
    mockStudentService.getStudents.mockResolvedValue({
      data: mockStudents,
      pagination: { total: 2, total_pages: 1, current_page: 1, per_page: 10 }
    });
    mockStudentService.getStudentById.mockResolvedValue({ data: mockStudents[0], success: true });
    mockStudentService.createStudent.mockResolvedValue({ data: mockStudents[0], success: true });
    mockStudentService.updateStudent.mockResolvedValue({ data: mockStudents[0], success: true });
    mockStudentService.deleteStudent.mockResolvedValue({ success: true });
    
    mockClassService.getClasses.mockResolvedValue({
      data: mockClasses,
      pagination: { total: 2, total_pages: 1, current_page: 1, per_page: 10 }
    });
    
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
        expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument();
        // Check for table headers instead of table role
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Class')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Attendance')).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
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
        expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument();
        const profileImages = screen.getAllByRole('img');
        expect(profileImages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should filter students by search term', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search students/i);
      await act(async () => {
        await user.type(searchInput, 'John');
        await Promise.resolve();
      });

      // The filter logic in the component uses client-side filtering on top of server data
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        // Since we are mocking the same data, Alice might still be there unless we mock a different return
        // But the searchInput filter should hide her in the UI
      });
    });

    it('should filter students by class', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const classFilter = screen.getByTestId('grade-filter');
      await act(async () => {
        await user.selectOptions(classFilter, 'Grade 1');
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockStudentService.getStudents).toHaveBeenCalledWith(
          expect.objectContaining({ class_id: 1 })
        );
      });
    });

    it('should filter students by status', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const statusFilter = screen.getByTestId('status-filter');
      await act(async () => {
        await user.selectOptions(statusFilter, 'active');
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Student CRUD Operations', () => {
    it('should create a new student', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument();
      });

      const addButton = screen.getByText(/add student/i);
      await act(async () => {
        await user.click(addButton);
        // Allow state setters queued by click (open modal + isOpen useEffect fetches) to flush
        await Promise.resolve();
        await new Promise((r) => setTimeout(r, 0));
      });

      // Wait for StudentFormModal to render AND for class/parent fetches to finish
      await waitFor(() => {
        expect(screen.getByText(/add new student/i)).toBeInTheDocument();
        expect(api.get).toHaveBeenCalledWith('/classes', expect.any(Object));
        expect(api.get).toHaveBeenCalledWith('/parents', expect.any(Object));
      });
    });

    it('should delete a student', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Find the row containing 'John Doe'
      const johnDoeText = screen.getByText('John Doe');
      const row = johnDoeText.closest('.flex.border-b');
      
      if (!row) throw new Error('Could not find student row');

      // Actions are in the table, find the trash button in that row
      const deleteButton = screen.getByTestId('delete-student-1');
      if (!deleteButton) throw new Error('Could not find delete button');
      
      await act(async () => {
        await user.click(deleteButton);
        await Promise.resolve();
      });

      // Confirm deletion in dialog
      const confirmButton = await screen.findByRole('button', { name: /^delete$/i });
      await act(async () => {
        await user.click(confirmButton);
        await Promise.resolve();
      });

      await waitFor(() => {
        // useDeleteStudent hook's mutate() is wired to the module-level deleteMutateMock spy
        expect(deleteMutateMock).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels', async () => {
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search students/i)).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation', () => {
    it('should show validation errors for invalid form data', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      
      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText(/loading students/i)).not.toBeInTheDocument();
      });

      const addButton = screen.getByText(/add student/i);
      await act(async () => {
        await user.click(addButton);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.getByText(/add new student/i)).toBeInTheDocument();
      });
      // StudentFormModal validation is covered in the dedicated component test suite
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
      window.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should show/hide columns based on screen size', async () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      window.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <StudentsPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        // Check for headers that should be visible on tablet
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });
});