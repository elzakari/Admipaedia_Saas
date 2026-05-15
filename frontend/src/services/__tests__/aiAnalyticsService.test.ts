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
import aiAnalyticsService from '@/services/aiAnalyticsService';

describe('aiAnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
