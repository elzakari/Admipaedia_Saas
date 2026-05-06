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
import aiAnalyticsService from '@/services/aiAnalyticsService';

describe('aiAnalyticsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getStudentPrediction', () => {
        it('should fetch student prediction successfully', async () => {
            const mockResponse = { data: { data: { prediction: 'High' } } };
            (api.get as any).mockResolvedValue(mockResponse);

            const result = await aiAnalyticsService.getStudentPrediction(1);

            // It calls with query params: /ai-analytics/predictions/student/1?period=30
            expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/ai-analytics/predictions/student/1'));
            expect(result).toEqual(mockResponse.data.data);
        });
    });

    describe('getStudentRiskAssessment', () => {
        it('should fetch risk assessment successfully', async () => {
            const mockResponse = { data: { data: { risk_level: 'Low' } } };
            (api.get as any).mockResolvedValue(mockResponse);

            const result = await aiAnalyticsService.getStudentRiskAssessment(1);

            expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/ai-analytics/risk-assessment/student/1'));
            expect(result).toEqual(mockResponse.data.data);
        });
    });
});
