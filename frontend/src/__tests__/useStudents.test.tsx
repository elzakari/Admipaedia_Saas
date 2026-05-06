import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { useStudents } from '../hooks/useStudents';

// Mock the student service
jest.mock('../services/studentService', () => ({
  __esModule: true,
  default: {
    getAllStudents: jest.fn(),
    getStudentById: jest.fn(),
    createStudent: jest.fn(),
    updateStudent: jest.fn(),
    deleteStudent: jest.fn(),
  },
}));

const mockStudentService = require('../services/studentService').default;

// Test wrapper with QueryClient
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
      {children}
    </QueryClientProvider>
  );
};

describe('useStudents', () => {
  const mockStudents = [
    {
      id: 1,
      admission_number: 'ADM001',
      first_name: 'John',
      last_name: 'Doe',
      display_name: 'John Doe',
      full_name: 'John Michael Doe',
      email: 'john.doe@example.com',
      date_of_birth: '2010-01-01',
      gender: 'male' as const,
      class_id: 1,
      class_name: 'Grade 1A',
      enrollment_date: '2021-09-01',
      status: 'active' as const,
      address: '123 Main St',
      city: 'Accra',
      country: 'Ghana',
    },
    {
      id: 2,
      admission_number: 'ADM002',
      first_name: 'Jane',
      last_name: 'Smith',
      display_name: 'Jane Smith',
      full_name: 'Jane Elizabeth Smith',
      email: 'jane.smith@example.com',
      date_of_birth: '2010-02-15',
      gender: 'female' as const,
      class_id: 1,
      class_name: 'Grade 1A',
      enrollment_date: '2021-09-01',
      status: 'active' as const,
      address: '456 Oak Ave',
      city: 'Accra',
      country: 'Ghana',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch students successfully', async () => {
    mockStudentService.getAllStudents.mockResolvedValueOnce({
      success: true,
      data: mockStudents,
      pagination: {
        current_page: 1,
        total_pages: 1,
        total: 2,
        per_page: 20,
      },
    });

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockStudents);
    expect(mockStudentService.getAllStudents).toHaveBeenCalledWith(undefined);
  });

  it('should handle error state', async () => {
    const error = new Error('Failed to fetch students');
    mockStudentService.getAllStudents.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to fetch students');
  });

  it('should refetch data when refetch is called', async () => {
    mockStudentService.getAllStudents.mockResolvedValueOnce({
      success: true,
      data: mockStudents,
      pagination: {
        current_page: 1,
        total_pages: 1,
        total: 2,
        per_page: 20,
      },
    });

    const { result } = renderHook(() => useStudents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Call refetch
    await result.current.refetch();

    expect(mockStudentService.getAllStudents).toHaveBeenCalledTimes(2);
  });

  it('should pass filters to the service', async () => {
    const filters = { class_id: 1, status: 'active' as const };
    
    mockStudentService.getAllStudents.mockResolvedValueOnce({
      success: true,
      data: mockStudents,
      pagination: {
        current_page: 1,
        total_pages: 1,
        total: 2,
        per_page: 20,
      },
    });

    const { result } = renderHook(() => useStudents(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockStudentService.getAllStudents).toHaveBeenCalledWith(filters);
  });
});