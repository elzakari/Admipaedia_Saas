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
import attendanceService from '@/services/attendanceService';
import { queueDataForSync, STORES } from '@/utils/offline';

const mockQueueDataForSync = vi.hoisted(() => vi.fn());
vi.mock('@/utils/offline', async () => {
  const actual: any = await vi.importActual('@/utils/offline');
  return { ...actual, queueDataForSync: mockQueueDataForSync };
});

describe('attendanceService', () => {
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

    describe('getAttendances', () => {
        it('should fetch attendances successfully', async () => {
            const mockAttendances = [{ id: 1, status: 'present' }];
            const mockData = {
                attendances: mockAttendances,
                pagination: { total: 1, pages: 1, page: 1, per_page: 20, next: null, prev: null }
            };
            (api.get as any).mockResolvedValue({ data: mockData });

            const result = await attendanceService.getAttendances({ page: 1 });

            expect(api.get).toHaveBeenCalledWith('/attendances', { params: { page: 1 } });
            expect(result.data).toEqual(mockAttendances);
            expect(result.pagination).toEqual(mockData.pagination);
        });
    });

    describe('createAttendance', () => {
        const attendanceData = {
            student_id: 1,
            class_id: 1,
            subject_id: 1,
            date: '2023-10-01',
            status: 'present' as const
        };

        it('should create attendance successfully when online', async () => {
            const mockResponse = { id: 10, ...attendanceData };
            (api.post as any).mockResolvedValue({ data: { attendance: mockResponse } });

            const result = await attendanceService.createAttendance(attendanceData);

            expect(api.post).toHaveBeenCalledWith('/attendances', attendanceData);
            expect(result).toEqual(mockResponse);
        });

        it('should queue for sync when offline', async () => {
            Object.defineProperty(navigator, 'onLine', { value: false });
            localStorage.setItem('token', 'test-token');

            await expect(attendanceService.createAttendance(attendanceData)).rejects.toThrow('OFFLINE_QUEUED');

            expect(mockQueueDataForSync).toHaveBeenCalledWith(STORES.ATTENDANCE, attendanceData, 'test-token');
        });
    });

    describe('bulkCreateAttendance', () => {
        const bulkData = {
            class_id: 1,
            subject_id: 1,
            date: '2023-10-01',
            attendance_records: [{ student_id: 1, status: 'present' as const }]
        };

        it('should create bulk attendance successfully when online', async () => {
            const mockResponse = [{ id: 1, ...bulkData.attendance_records[0] }];
            (api.post as any).mockResolvedValue({ data: { attendances: mockResponse } });

            const result = await attendanceService.bulkCreateAttendance(bulkData);

            expect(api.post).toHaveBeenCalledWith('/attendances/bulk', {
                class_id: bulkData.class_id,
                subject_id: bulkData.subject_id,
                date: bulkData.date,
                attendances: bulkData.attendance_records
            });
            expect(result).toEqual(mockResponse);
        });

        it('should queue for sync when offline', async () => {
            Object.defineProperty(navigator, 'onLine', { value: false });
            localStorage.setItem('token', 'test-token');

            await expect(attendanceService.bulkCreateAttendance(bulkData)).rejects.toThrow('OFFLINE_QUEUED');

            expect(mockQueueDataForSync).toHaveBeenCalledWith(STORES.ATTENDANCE, bulkData, 'test-token');
        });
    });
});
