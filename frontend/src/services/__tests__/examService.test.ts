import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import api from '@/lib/api';
import examService from '@/services/examService';
import { queueDataForSync, STORES } from '@/utils/offline';

const mockQueueDataForSync = vi.hoisted(() => vi.fn());
vi.mock('@/utils/offline', async () => {
  const actual: any = await vi.importActual('@/utils/offline');
  return { ...actual, queueDataForSync: mockQueueDataForSync };
});

describe('examService', () => {
    const originalOnLine = navigator.onLine;

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        });
        localStorage.clear();
    });

    afterEach(() => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: originalOnLine,
        });
    });

    describe('getExams', () => {
        it('should fetch exams successfully', async () => {
            const mockExamsData = {
                results: [{ id: 1, title: 'Midterm' }],
                total: 1,
                page: 1,
                per_page: 20
            };
            (api.get as any).mockResolvedValue({ data: mockExamsData });

            const result = await examService.getExams({ page: 1 });

            expect(api.get).toHaveBeenCalledWith('/exams', { params: { page: 1 } });
            expect(result).toEqual(mockExamsData);
        });
    });

    describe('createExam', () => {
        const examData = {
            title: 'Final Exam',
            class_id: 1,
            subject_id: 1,
            date: '2023-12-15',
            max_score: 100,
            term: 'Term 1',
            academic_year: '2023-2024'
        };

        it('should create an exam successfully when online', async () => {
            const mockResponse = { exam: { id: 10, ...examData } };
            (api.post as any).mockResolvedValue({ data: mockResponse });

            const result = await examService.createExam(examData as any);

            expect(api.post).toHaveBeenCalledWith('/exams', examData);
            expect(result).toEqual(mockResponse.exam);
        });

        it('should queue for sync when offline', async () => {
            Object.defineProperty(navigator, 'onLine', { value: false });
            localStorage.setItem('token', 'test-token');

            await expect(examService.createExam(examData as any)).rejects.toThrow('OFFLINE_QUEUED');

            expect(mockQueueDataForSync).toHaveBeenCalledWith(
                STORES.EXAMS,
                { ...examData, endpoint: '/api/v1/exams' },
                'test-token'
            );
        });
    });

    describe('getGradingScheme', () => {
        it('should fetch grading scheme successfully', async () => {
            const mockSchemeData = { gradingScheme: [{ grade: 'A', minScore: 80 }] };
            (api.get as any).mockResolvedValue({ data: mockSchemeData });

            const result = await examService.getGradingScheme();

            expect(api.get).toHaveBeenCalledWith('/academics/grading-scheme');
            expect(result).toEqual(mockSchemeData.gradingScheme);
        });

        it('should return fallback data on error', async () => {
            (api.get as any).mockRejectedValue(new Error('API Error'));

            const result = await examService.getGradingScheme();

            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({ grade: 'A+' }),
                expect.objectContaining({ grade: 'F' })
            ]));
        });
    });
});
