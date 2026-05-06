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
import attendanceService from '@/services/attendanceService';
import { queueDataForSync, STORES } from '@/utils/offline';

// Mock offline utilities
jest.mock('@/utils/offline');
const mockQueueDataForSync = queueDataForSync as jest.MockedFunction<typeof queueDataForSync>;

describe('attendanceService', () => {
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

    describe('getAttendances', () => {
        it('should fetch attendances successfully', async () => {
            const mockData = {
                results: [{ id: 1, status: 'present' }],
                total: 1,
                page: 1,
                per_page: 20
            };
            (api.get as any).mockResolvedValue({ data: mockData });

            const result = await attendanceService.getAttendances({ page: 1 });

            expect(api.get).toHaveBeenCalledWith('/attendances', { params: { page: 1 } });
            expect(result).toEqual(mockData);
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
            (api.post as any).mockResolvedValue({ data: mockResponse });

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
            (api.post as any).mockResolvedValue({ data: mockResponse });

            const result = await attendanceService.bulkCreateAttendance(bulkData);

            expect(api.post).toHaveBeenCalledWith('/attendances/bulk', bulkData);
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
