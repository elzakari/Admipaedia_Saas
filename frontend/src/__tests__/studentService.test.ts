import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';
import { studentService } from '../services/studentService';
import { Student } from '../types/student.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock data
const mockStudent: Student = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  studentId: 'STU001',
  class: 'Grade 10A',
  dateOfBirth: '2008-01-15',
  gender: 'male',
  address: '123 Main St',
  phone: '+1234567890',
  parentName: 'Jane Doe',
  parentPhone: '+1234567891',
  enrollmentDate: '2023-09-01',
  status: 'active',
  profilePicture: null,
  createdAt: '2023-09-01T00:00:00Z',
  updatedAt: '2023-09-01T00:00:00Z'
};

const mockStudents: Student[] = [mockStudent];

describe('studentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getAllStudents', () => {
    it('should fetch all students successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockStudents });

      const result = await studentService.getAllStudents();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/students');
      expect(result).toEqual(mockStudents);
    });

    it('should handle API errors', async () => {
      const errorMessage = 'Network Error';
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(studentService.getAllStudents()).rejects.toThrow(errorMessage);
    });
  });

  describe('getStudentById', () => {
    it('should fetch student by ID successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockStudent });

      const result = await studentService.getStudentById(1);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/students/1');
      expect(result).toEqual(mockStudent);
    });

    it('should handle student not found', async () => {
      mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

      await expect(studentService.getStudentById(999)).rejects.toMatchObject({
        response: { status: 404 }
      });
    });
  });

  describe('createStudent', () => {
    it('should create student successfully', async () => {
      const newStudentData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        studentId: 'STU002',
        class: 'Grade 9B'
      };
      
      const createdStudent = { ...mockStudent, ...newStudentData, id: 2 };
      mockedAxios.post.mockResolvedValue({ data: createdStudent });

      const result = await studentService.createStudent(newStudentData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/students', newStudentData);
      expect(result).toEqual(createdStudent);
    });
  });

  describe('updateStudent', () => {
    it('should update student successfully', async () => {
      const updateData = { firstName: 'Johnny' };
      const updatedStudent = { ...mockStudent, ...updateData };
      
      mockedAxios.put.mockResolvedValue({ data: updatedStudent });

      const result = await studentService.updateStudent(1, updateData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/students/1', updateData);
      expect(result).toEqual(updatedStudent);
    });
  });

  describe('deleteStudent', () => {
    it('should delete student successfully', async () => {
      mockedAxios.delete.mockResolvedValue({ data: { success: true } });

      await studentService.deleteStudent(1);

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/students/1');
    });
  });
});