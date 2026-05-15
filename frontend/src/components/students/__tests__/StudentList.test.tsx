import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@/utils/testUtils';
import StudentList from '../StudentList';
import { TransformedStudent } from '../../../types/student';

const mockStudents: TransformedStudent[] = [
  {
    id: '1',
    studentId: 'STD-001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    grade: '10',
    attendance: 95,
    performance: 88,
    status: 'active',
    profileImage: ''
  },
  {
    id: '2',
    studentId: 'STD-002',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '098-765-4321',
    grade: '11',
    attendance: 82,
    performance: 91,
    status: 'warning',
    profileImage: ''
  }
] as unknown as TransformedStudent[];

describe('StudentList Component', () => {
  const mockHandleStudentSelect = vi.fn();
  const mockHandleEditStudent = vi.fn();
  const mockHandleDeleteStudent = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of students', () => {
    render(
      <StudentList 
        students={mockStudents} 
        selectedStudent={null} 
        handleStudentSelect={mockHandleStudentSelect} 
      />
    );
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('STD-001')).toBeInTheDocument();
    expect(screen.getByText('STD-002')).toBeInTheDocument();
  });

  it('renders the Empty State when no students are provided', () => {
    render(
      <StudentList 
        students={[]} 
        selectedStudent={null} 
        handleStudentSelect={mockHandleStudentSelect} 
      />
    );
    
    expect(screen.getByText('No students found')).toBeInTheDocument();
    expect(screen.getByText('There are no students matching your current criteria.')).toBeInTheDocument();
  });

  it('calls handleStudentSelect when a student row is clicked', () => {
    render(
      <StudentList 
        students={mockStudents} 
        selectedStudent={null} 
        handleStudentSelect={mockHandleStudentSelect} 
      />
    );
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(firstRow!);
    
    expect(mockHandleStudentSelect).toHaveBeenCalledWith('1');
  });

  it('renders edit and delete buttons if handlers are provided', () => {
    render(
      <StudentList 
        students={[mockStudents[0]]} 
        selectedStudent={null} 
        handleStudentSelect={mockHandleStudentSelect} 
        handleEditStudent={mockHandleEditStudent}
        handleDeleteStudent={mockHandleDeleteStudent}
      />
    );
    
    // There are two buttons inside the row + actions dropdown
    // Let's find the dropdown triggers. Since they are icons, we can find by button roles.
    const buttons = screen.getAllByRole('button');
    // Eye, Pencil, Trash2, MoreHorizontal
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });
});
