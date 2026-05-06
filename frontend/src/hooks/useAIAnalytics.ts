import { useState, useEffect, useCallback } from 'react';
import AIAnalyticsService, {
    StudentPrediction,
    RiskAssessment,
    Recommendation,
    ClassPrediction
} from '../services/aiAnalyticsService';

/**
 * Hook for fetching student-specific AI analytics
 */
export const useStudentAIAnalytics = (studentId?: number | null) => {
    const [prediction, setPrediction] = useState<StudentPrediction | null>(null);
    const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        if (!studentId) return;
        setLoading(true);
        setError(null);
        try {
            const [pred, risk, recs] = await Promise.all([
                AIAnalyticsService.getStudentPrediction(studentId),
                AIAnalyticsService.getStudentRiskAssessment(studentId),
                AIAnalyticsService.getStudentRecommendations(studentId)
            ]);
            setPrediction(pred);
            setRiskAssessment(risk);
            setRecommendations(recs);
        } catch (err: any) {
            console.error('Error fetching student AI analytics:', err);
            setError(err.message || 'Failed to fetch AI analytics');
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (studentId) {
            fetchAnalytics();
        }
    }, [studentId, fetchAnalytics]);

    return {
        prediction,
        riskAssessment,
        recommendations,
        loading,
        error,
        refetch: fetchAnalytics
    };
};

/**
 * Hook for fetching class-wide AI analytics
 */
export const useClassAIAnalytics = (classId?: number | null) => {
    const [classPrediction, setClassPrediction] = useState<ClassPrediction | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchClassAnalytics = useCallback(async () => {
        if (!classId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await AIAnalyticsService.getClassPredictions(classId);
            setClassPrediction(data);
        } catch (err: any) {
            console.error('Error fetching class AI analytics:', err);
            setError(err.message || 'Failed to fetch class predictions');
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        if (classId) {
            fetchClassAnalytics();
        }
    }, [classId, fetchClassAnalytics]);

    return {
        classPrediction,
        loading,
        error,
        refetch: fetchClassAnalytics
    };
};

/**
 * Hook for fetching school-wide AI insights
 */
export const useSchoolAIInsights = () => {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInsights = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await AIAnalyticsService.getSchoolInsights();
            setInsights(data);
        } catch (err: any) {
            console.error('Error fetching school AI insights:', err);
            setError(err.message || 'Failed to fetch school insights');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInsights();
    }, [fetchInsights]);

    return { insights, loading, error, refetch: fetchInsights };
};
