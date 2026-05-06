import { jest, describe, it, expect, beforeEach } from '@jest/globals';

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
import reportsService from '@/services/reportsService';
import { analyticsService } from '@/services/analyticsService';

// Mock analyticsService
jest.mock('@/services/analyticsService');
const mockAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe('reportsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('generateAcademicReport', () => {
        it('should generate a grade report successfully', async () => {
            const filters = { reportType: 'grades' as const };
            const result = await reportsService.generateAcademicReport(filters);

            expect(result.type).toBe('academic');
            expect(result.data).toHaveProperty('grades');
        });

        it('should throw error for unknown report type', async () => {
            const filters = { reportType: 'unknown' as any };
            await expect(reportsService.generateAcademicReport(filters)).rejects.toThrow('Unknown report type: unknown');
        });
    });

    describe('generateAttendanceReport', () => {
        it('should generate an attendance report successfully', async () => {
            const filters = {
                classFilter: [1],
                dateRange: { start: '2023-01-01', end: '2023-12-31', from: '2023-01-01', to: '2023-12-31' }
            };

            mockAnalyticsService.getAdvancedAttendanceAnalytics.mockResolvedValue({} as any);

            const result = await reportsService.generateAttendanceReport(filters);

            expect(result.type).toBe('attendance');
            expect(mockAnalyticsService.getAdvancedAttendanceAnalytics).toHaveBeenCalledWith(
                1,
                '2023-01-01',
                '2023-12-31'
            );
        });
    });

    describe('exportReport', () => {
        it('should fetch report export as blob', async () => {
            const mockBlob = new Blob(['csv-data'], { type: 'text/csv' });
            (api.get as any).mockResolvedValue({ data: mockBlob });

            const result = await reportsService.exportReport('report-123', 'csv');

            expect(api.get).toHaveBeenCalledWith('/reports/report-123/export', {
                params: { format: 'csv' },
                responseType: 'blob'
            });
            expect(result).toEqual(mockBlob);
        });
    });
});
