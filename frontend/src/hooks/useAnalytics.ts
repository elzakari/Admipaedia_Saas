import { useState, useEffect } from 'react';
import { analyticsService, TeacherAnalytics, StudentAnalytics, DashboardStatistic } from '../services/analyticsService';

// Hook for dashboard statistics
export const useDashboardStatistics = (role?: string) => {
  const [statistics, setStatistics] = useState<DashboardStatistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboardStatistics(role);
      setStatistics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [role]);

  return { statistics, loading, error, refetch: fetchStatistics };
};

// Hook for teacher analytics
export const useTeacherAnalytics = (teacherId: number | null) => {
  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getTeacherAnalytics(teacherId);
        setAnalytics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch teacher analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [teacherId]);

  return { analytics, loading, error };
};

// Hook for student analytics
export const useStudentAnalytics = (
  studentId: number | null,
  dateFrom?: string,
  dateTo?: string
) => {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getStudentAnalytics(studentId, dateFrom, dateTo);
        setAnalytics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch student analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [studentId, dateFrom, dateTo]);

  return { analytics, loading, error };
};

// Hook for attendance analytics
export const useAttendanceAnalytics = (
  classId?: number,
  dateFrom?: string,
  dateTo?: string
) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getAdvancedAttendanceAnalytics(classId, dateFrom, dateTo);
        setAnalytics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch attendance analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [classId, dateFrom, dateTo]);

  return { analytics, loading, error };
};