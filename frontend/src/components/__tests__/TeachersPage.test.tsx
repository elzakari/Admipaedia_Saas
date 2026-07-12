import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, mockTeacher } from '../../utils/testUtils';

const { mockTeacherData } = vi.hoisted(() => {
  const mockTeacherData = {
    id: 1,
    name: 'John Doe',
    full_name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@school.com',
    subject: 'Mathematics',
    status: 'active' as const,
  };
  return { mockTeacherData };
});

// Mock the hooks so we control what data the component receives
vi.mock('../../hooks/useTeachers', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../hooks/useTeachers')>();
  return {
    ...mod,
    useTeachers: vi.fn(),
    useCreateTeacher: () => ({ mutate: vi.fn() }),
    useUpdateTeacher: () => ({ mutate: vi.fn() }),
    useDeleteTeacher: () => ({ mutate: vi.fn() }),
  };
});

vi.mock('@/services/teacherService', () => ({
  default: {
    getTeachers: vi.fn(),
    getTeacherById: vi.fn().mockResolvedValue(mockTeacherData),
    getTeacherClasses: vi.fn().mockResolvedValue({ classes: [] }),
    getTeacherSubjects: vi.fn().mockResolvedValue([]),
    transformTeacherFromBackend: (t: any) => t,
    withLegacyFields: (t: any) => t,
  },
  teacherService: {
    getTeachers: vi.fn(),
    getTeacherById: vi.fn().mockResolvedValue(mockTeacherData),
    getTeacherClasses: vi.fn().mockResolvedValue({ classes: [] }),
    getTeacherSubjects: vi.fn().mockResolvedValue([]),
    transformTeacherFromBackend: (t: any) => t,
    withLegacyFields: (t: any) => t,
  },
}));

vi.mock('../../lib/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { classes: [], data: [] } }) },
  api: { get: vi.fn().mockResolvedValue({ data: { classes: [], data: [] } }) },
}));

import TeachersPage from '../../pages/teachers/TeachersPage';
import { useTeachers } from '../../hooks/useTeachers';
const mockUseTeachers = useTeachers as ReturnType<typeof vi.fn>;

describe('TeachersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeachers.mockReturnValue({
      data: {
        teachers: [mockTeacherData],
        pagination: { total: 1, current_page: 1, total_pages: 1, per_page: 10 }
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders teachers list correctly', async () => {
    render(<TeachersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    render(<TeachersPage />);

    const searchInput = screen.getByPlaceholderText(/search teachers/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(searchInput).toHaveValue('John');
    });
  });

  it('handles loading state', () => {
    mockUseTeachers.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<TeachersPage />);
    expect(screen.getByText(/loading teachers/i)).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockUseTeachers.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('API Error'),
      refetch: vi.fn(),
    });

    render(<TeachersPage />);
    expect(screen.getByText(/failed to load teachers/i)).toBeInTheDocument();
  });

  it('shows teacher count', async () => {
    render(<TeachersPage />);

    await waitFor(() => {
      expect(screen.getByText(/1.*teachers found/i)).toBeInTheDocument();
    });
  });
});