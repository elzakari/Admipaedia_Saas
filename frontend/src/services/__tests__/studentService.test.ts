import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAxiosInstance = vi.hoisted(() => ({
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() }
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} } }
}));

vi.mock('@/lib/api', () => ({
  default: mockAxiosInstance,
  api: mockAxiosInstance
}));

// Now import the services using aliases
import api from '@/lib/api';
import studentService from '@/services/studentService';
const { getStudents, createStudent, updateStudent, deleteStudent } = studentService;

describe('Student Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStudents', () => {
    it('fetches students with pagination', async () => {
      const mockResponse = {
        data: {
          students: [{ id: 1, first_name: 'John', last_name: 'Doe' }],
          pagination: { total: 1, current_page: 1, total_pages: 1 }
        }
      };

      (api.get as any).mockResolvedValue(mockResponse);

      const result = await getStudents({ page: 1, per_page: 10 });

      expect(api.get).toHaveBeenCalledWith('/students', expect.objectContaining({
        params: { page: 1, per_page: 10 }
      }));
      expect(result.data).toEqual(mockResponse.data.students);
    });

    it('handles API errors', async () => {
      const errorMessage = 'Network Error';
      (api.get as any).mockRejectedValue(new Error(errorMessage));

      await expect(getStudents({ page: 1, per_page: 10 })).rejects.toThrow();
    });
  });

  describe('createStudent', () => {
    it('creates a new student', async () => {
      const newStudent: any = {
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        password: 'Password123!',
        date_of_birth: '2010-01-01',
        gender: 'female'
      };
      const { password: _password, ...studentPayload } = newStudent;
      const mockResponse = { data: { data: { id: 2, ...studentPayload } } };

      (api.post as any).mockResolvedValue(mockResponse);

      const result = await createStudent(newStudent);

      expect(api.post).toHaveBeenCalledWith('/enhanced-students/create-with-user', {
        student: studentPayload,
        user: {
          email: newStudent.email,
          password: newStudent.password
        }
      });
      expect(result.data).toEqual(mockResponse.data.data);
    });
  });

  describe('assignment workflow helpers', () => {
    it('finds a student assignment by id from the live assignments list', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          assignments: [
            { id: 4, title: 'Essay', status: 'open' },
            { id: 8, title: 'Math Worksheet', status: 'submitted' }
          ]
        }
      });

      const result = await studentService.getAssignmentById(8);

      expect(api.get).toHaveBeenCalledWith('/student/assignments', { params: { status: undefined } });
      expect(result).toEqual({ id: 8, title: 'Math Worksheet', status: 'submitted' });
    });

    it('submits a student assignment through the live API', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          submission: {
            id: 91,
            assignment_id: 8,
            student_id: 3,
            status: 'submitted'
          }
        }
      });

      const result = await studentService.submitAssignment(8, {
        content: 'Please find my answer attached.',
        file_path: 'worksheet.pdf'
      });

      expect(api.post).toHaveBeenCalledWith('/student/assignments/8/submit', {
        content: 'Please find my answer attached.',
        file_path: 'worksheet.pdf'
      });
      expect(result).toEqual({
        id: 91,
        assignment_id: 8,
        student_id: 3,
        status: 'submitted'
      });
    });
  });

  describe('updateStudent', () => {
    it('updates an existing student', async () => {
      const studentId = 1;
      const updateData = { first_name: 'John Updated' };
      const mockResponse = { data: { student: { id: studentId, ...updateData } } };

      (api.put as any).mockResolvedValue(mockResponse);

      const result = await updateStudent(studentId, updateData);

      expect(api.put).toHaveBeenCalledWith(`/students/${studentId}`, updateData);
      expect(result.data).toEqual(mockResponse.data.student);
    });
  });

  describe('deleteStudent', () => {
    it('deletes a student', async () => {
      const studentId = 1;
      (api.delete as any).mockResolvedValue({ data: { success: true } });

      await deleteStudent(studentId);

      expect(api.delete).toHaveBeenCalledWith(`/students/${studentId}`);
    });
  });
});
