import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockApi = vi.hoisted(() => ({
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} } },
}));

vi.mock('@/lib/api', () => ({
  default: mockApi,
  api: mockApi,
}));

import parentService from '@/services/parentService';

describe('parentService portal workflow helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps homework from success_response payloads', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          homework: [{ id: 1, title: 'Math Homework' }],
        },
      },
    });

    const result = await parentService.getChildHomeworkData(11);

    expect(mockApi.get).toHaveBeenCalledWith('/parents/children/11/homework');
    expect(result).toEqual([{ id: 1, title: 'Math Homework' }]);
  });

  it('unwraps parent messages from success_response payloads', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          messages: [{ id: 7, subject: 'Teacher Update' }],
        },
      },
    });

    const result = await parentService.getParentMessages(5);

    expect(mockApi.get).toHaveBeenCalledWith('/parents/5/messages');
    expect(result).toEqual([{ id: 7, subject: 'Teacher Update' }]);
  });

  it('unwraps child grades from success_response payloads', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          grades: [
            {
              id: 12,
              exam_id: 4,
              percentage: 84,
              grade_letter: 'A',
              exam: {
                id: 4,
                title: 'Midterm Exam',
                exam_date: '2026-06-12T09:00:00Z',
              },
            },
          ],
        },
      },
    });

    const result = await parentService.getChildGrades(11, { page: 1, per_page: 20 });

    expect(mockApi.get).toHaveBeenCalledWith('/parents/children/11/grades', {
      params: { page: 1, per_page: 20 },
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: 12,
        exam_id: 4,
        percentage: 84,
        grade_letter: 'A',
      }),
    ]);
  });
});
