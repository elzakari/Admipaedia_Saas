import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '../types/student.types';

const mockApi = vi.hoisted(() => ({
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
  default: mockApi,
  api: mockApi
}));

import { studentService } from '../services/studentService';

describe('studentService (legacy tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches students', async () => {
    const students: Partial<Student>[] = [{ id: 1, first_name: 'John', last_name: 'Doe' }];
    (mockApi.get as any).mockResolvedValue({
      data: {
        students,
        pagination: { total: 1, current_page: 1, total_pages: 1, per_page: 10 }
      }
    });

    const result = await studentService.getStudents({ page: 1, per_page: 10 });

    expect(mockApi.get).toHaveBeenCalledWith('/students', expect.objectContaining({ params: { page: 1, per_page: 10 } }));
    expect(result.data).toEqual(students);
  });

  it('fetches student by id', async () => {
    const student: Partial<Student> = { id: 1, first_name: 'John', last_name: 'Doe' };
    (mockApi.get as any).mockResolvedValue({ data: { student } });

    const result = await studentService.getStudentById(1);
    expect(mockApi.get).toHaveBeenCalledWith('/students/1');
    expect(result.data).toEqual(student);
  });

  it('creates student via enhanced endpoint when password is present', async () => {
    const studentData: any = { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', password: 'Password123!' };
    (mockApi.post as any).mockResolvedValue({ data: { data: { id: 2, first_name: 'Jane', last_name: 'Doe' } } });

    const result = await studentService.createStudent(studentData);

    expect(mockApi.post).toHaveBeenCalledWith('/enhanced-students/create-with-user', {
      student: { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' },
      user: { email: 'jane@example.com', password: 'Password123!' }
    });
    expect(result.data).toEqual({ id: 2, first_name: 'Jane', last_name: 'Doe' });
  });

  it('updates student', async () => {
    (mockApi.put as any).mockResolvedValue({ data: { student: { id: 1, first_name: 'John Updated' } } });
    const result = await studentService.updateStudent(1, { first_name: 'John Updated' } as any);
    expect(mockApi.put).toHaveBeenCalledWith('/students/1', { first_name: 'John Updated' });
    expect(result.data).toEqual({ id: 1, first_name: 'John Updated' });
  });

  it('deletes student', async () => {
    (mockApi.delete as any).mockResolvedValue({ data: { success: true } });
    await studentService.deleteStudent(1);
    expect(mockApi.delete).toHaveBeenCalledWith('/students/1');
  });
});
