import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock axios instance
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

import api from '@/lib/api';
import gradeService from '@/services/gradeService';
import { queueDataForSync, STORES } from '@/utils/offline';

// Mock offline utilities
jest.mock('@/utils/offline');
const mockQueueDataForSync = queueDataForSync as jest.MockedFunction<typeof queueDataForSync>;

describe('gradeService', () => {
    const originalOnLine = navigator.onLine;

    beforeEach(() => {
        jest.clearAllMocks();
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

    describe('getGrades', () => {
        it('should fetch grades successfully', async () => {
            const mockData = {
                grades: [{ id: 1, score: 85 }],
                pagination: { total: 1, page: 1, per_page: 20 }
            };
            (api.get as any).mockResolvedValue({ data: mockData });

            const result = await gradeService.getGrades({ page: 1 });

            expect(api.get).toHaveBeenCalledWith('/grades', { params: { page: 1 } });
            expect(result).toEqual(mockData);
        });

        it('should handle errors', async () => {
            (api.get as any).mockRejectedValue(new Error('API Error'));
            await expect(gradeService.getGrades()).rejects.toThrow('API Error');
        });
    });

    describe('createGrade', () => {
        const gradeData = {
            student_id: 1,
            subject_id: 1,
            class_id: 1,
            term: 'Term 1',
            academic_year: '2023-2024',
            assessment_type: 'exam' as const,
            score: 90,
            max_score: 100
        };

        it('should create a grade successfully when online', async () => {
            const mockResponse = { grade: { id: 10, ...gradeData } };
            (api.post as any).mockResolvedValue({ data: mockResponse });

            const result = await gradeService.createGrade(gradeData);

            expect(api.post).toHaveBeenCalledWith('/grades', gradeData);
            expect(result).toEqual(mockResponse.grade);
        });

        it('should queue for sync when offline', async () => {
            Object.defineProperty(navigator, 'onLine', { value: false });
            localStorage.setItem('token', 'test-token');

            await expect(gradeService.createGrade(gradeData)).rejects.toThrow('OFFLINE_QUEUED');

            expect(mockQueueDataForSync).toHaveBeenCalledWith(STORES.GRADES, gradeData, 'test-token');
        });
    });

    describe('createBulkGrades', () => {
        const bulkData = {
            subject_id: 1,
            class_id: 1,
            term: 'Term 1',
            academic_year: '2023-2024',
            assessment_type: 'exam' as const,
            max_score: 100,
            grades: [{ student_id: 1, score: 95 }]
        };

        it('should create bulk grades successfully when online', async () => {
            const mockResponse = { grades: [{ id: 1, ...bulkData.grades[0] }] };
            (api.post as any).mockResolvedValue({ data: mockResponse });

            const result = await gradeService.createBulkGrades(bulkData);

            expect(api.post).toHaveBeenCalledWith('/grades/bulk', bulkData);
            expect(result).toEqual(mockResponse);
        });

        it('should queue for sync when offline', async () => {
            Object.defineProperty(navigator, 'onLine', { value: false });
            localStorage.setItem('token', 'test-token');

            await expect(gradeService.createBulkGrades(bulkData)).rejects.toThrow('OFFLINE_QUEUED');

            expect(mockQueueDataForSync).toHaveBeenCalledWith(STORES.GRADES, bulkData, 'test-token');
        });
    });
});
