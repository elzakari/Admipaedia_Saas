import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import reportsService from '@/services/reportsService';
import { analyticsService } from '@/services/analyticsService';

const mockAnalyticsService = vi.hoisted(() => ({
  getAdvancedAttendanceAnalytics: vi.fn()
}));
vi.mock('@/services/analyticsService', () => ({
  analyticsService: mockAnalyticsService,
  default: mockAnalyticsService
}));

describe('reportsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateAcademicReport', () => {
        it('should generate a grade report successfully', async () => {
            const filters = { reportType: 'grades' as const };
            (api.post as any).mockResolvedValue({
                data: {
                    sections: [
                        { type: 'metric', title: 'Average Grade', value: 75 },
                        { type: 'table', title: 'Student Grades', data: [{ subject: 'Math' }] }
                    ]
                }
            });
            const result = await reportsService.generateAcademicReport(filters);

            expect(result.type).toBe('academic');
            expect(result.data).toHaveProperty('sections');
            expect(Array.isArray((result.data as any).sections)).toBe(true);
        });

        it('supports unknown report type values', async () => {
            const filters = { reportType: 'unknown' as any };
            (api.post as any).mockResolvedValue({
                data: {
                    sections: []
                }
            });

            const result = await reportsService.generateAcademicReport(filters);
            expect(result.type).toBe('academic');
            expect(result.title).toMatch(/Unknown/i);
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

    describe('exportReportData', () => {
        it('should export report data as blob', async () => {
            const mockBlob = new Blob(['csv-data'], { type: 'text/csv' });
            (api.post as any).mockResolvedValue({ data: mockBlob });

            const result = await reportsService.exportReportData({
                title: 'Report',
                type: 'academic',
                generatedAt: new Date().toISOString(),
                data: { sections: [] }
            } as any, 'csv');

            expect(api.post).toHaveBeenCalled();
            expect(result).toEqual(mockBlob);
        });
    });
});
