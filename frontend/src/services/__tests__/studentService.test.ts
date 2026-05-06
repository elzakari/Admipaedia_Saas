import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Define the mock axios instance first
const mockAxiosInstance = {
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: { headers: { common: {} } }
};

// Mock axios BEFORE any imports that use api.ts
jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() }
  }
}));

// Now import the services using aliases
import api from '@/lib/api';
import studentService from '@/services/studentService';
const { getStudents, createStudent, updateStudent, deleteStudent } = studentService;

describe('Student Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      const mockResponse = { data: { student: { id: 2, ...newStudent } } };

      (api.post as any).mockResolvedValue(mockResponse);

      const result = await createStudent(newStudent);

      expect(api.post).toHaveBeenCalledWith('/students', newStudent);
      expect(result.data).toEqual(mockResponse.data.student);
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