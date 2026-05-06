import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, testAccessibility, mockTeacher, mockApiResponse } from '../../utils/testUtils';
import TeachersPage from '../pages/TeachersPage';
import * as teacherService from '../../services/teacherService';
import { it } from 'date-fns/locale';
import { describe, beforeEach } from 'node:test';

// Mock the teacher service
jest.mock('../../services/teacherService');
const mockedTeacherService = teacherService as jest.Mocked<typeof teacherService>;

describe('TeachersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders teachers list correctly', async () => {
    mockedTeacherService.getTeachers.mockResolvedValue({
      data: [mockTeacher],
      total: 1,
      page: 1,
      limit: 10,
    });

    const { container } = render(<TeachersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Test accessibility
    await testAccessibility(container);
  });

  it('handles search functionality', async () => {
    mockedTeacherService.getTeachers.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    render(<TeachersPage />);

    const searchInput = screen.getByPlaceholderText(/search teachers/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });

    await waitFor(() => {
      expect(mockedTeacherService.getTeachers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'John' })
      );
    });
  });

  it('handles loading state', () => {
    mockedTeacherService.getTeachers.mockReturnValue(new Promise(() => {}));

    render(<TeachersPage />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    mockedTeacherService.getTeachers.mockRejectedValue(new Error('API Error'));

    render(<TeachersPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading teachers/i)).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation', async () => {
    mockedTeacherService.getTeachers.mockResolvedValue({
      data: [mockTeacher],
      total: 1,
      page: 1,
      limit: 10,
    });

    render(<TeachersPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const teacherCard = screen.getByRole('button', { name: /john doe/i });
    expect(teacherCard).toHaveAttribute('tabIndex', '0');
    
    fireEvent.keyDown(teacherCard, { key: 'Enter' });
    // Verify navigation or modal opening
  });
});