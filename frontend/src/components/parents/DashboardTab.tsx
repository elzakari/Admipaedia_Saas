// Top-level icon imports
import { BookOpen, CheckCircle, CreditCard, FileText } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { useToast } from "../../components/ui/use-toast";
import { useEnhancedApiCall } from '../../hooks/useEnhancedApiCall';
import ErrorDisplay from '../common/ErrorDisplay'; // Fixed: default import
import LoadingState from '../common/LoadingState'; // Fixed: default import
import { useEffect } from 'react';
import parentService from '../../services/parentService';
import { useWebSocket } from '../../services/websocketService';
import { useCallback } from 'react';
import { useTranslation } from "react-i18next";

interface DashboardTabProps {
  currentChild: any;
  currentAcademicData: any;
  currentAttendanceData: any;
  currentFeeData: any;
  currentHomeworkData: any[];
  currency: string;
}

function DashboardTab({
  currentChild,
  currentAcademicData: initialAcademicData,
  currentAttendanceData: initialAttendanceData,
  currentFeeData: initialFeeData,
  currentHomeworkData: initialHomeworkData,
  currency
}: DashboardTabProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Enhanced API call for dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    execute: fetchDashboardData,
    refetch,
    isRetrying,
    retryCount
  } = useEnhancedApiCall(
    async () => {
      const childId = Number(currentChild?.id);
      const canFetchChild = Number.isFinite(childId) && childId > 0;

      if (!canFetchChild) {
        return Promise.resolve({
          academicData: initialAcademicData,
          attendanceData: initialAttendanceData,
          feeData: initialFeeData,
          homeworkData: initialHomeworkData
        });
      }

      try {
        const results = await Promise.allSettled([
          parentService.getChildAcademicData(childId),
          parentService.getChildAttendanceData(childId),
          parentService.getChildFeeData(childId),
          parentService.getChildHomeworkData(childId)
        ]);

        const [academicRes, attendanceRes, feeRes, homeworkRes] = results;

        return {
          academicData: academicRes.status === 'fulfilled' ? academicRes.value : initialAcademicData,
          attendanceData: attendanceRes.status === 'fulfilled' ? attendanceRes.value : initialAttendanceData,
          feeData: feeRes.status === 'fulfilled' ? feeRes.value : initialFeeData,
          homeworkData: homeworkRes.status === 'fulfilled' ? homeworkRes.value : initialHomeworkData
        };
      } catch (err) {
        console.warn("⚠️ Background metrics fetch partially failed:", err);
        return {
          academicData: initialAcademicData,
          attendanceData: initialAttendanceData,
          feeData: initialFeeData,
          homeworkData: initialHomeworkData
        };
      }
    },
    {
      immediate: false,
      showErrorToast: true,
      showSuccessToast: false,
      retryOnError: true,
      maxRetries: 3,
      cacheKey: currentChild?.id ? `dashboard-${currentChild.id}` : 'dashboard',
      cacheDuration: 5 * 60 * 1000,
      fallbackData: {
        academicData: initialAcademicData,
        attendanceData: initialAttendanceData,
        feeData: initialFeeData,
        homeworkData: initialHomeworkData
      }
    }
  );
  
  // Use websocket without a handler parameter; subscribe to events explicitly
  const { subscribe } = useWebSocket('/notifications');
  
  // Handle incoming notifications and refetch
  const handleNotification = (notification: any) => {
    toast({
      title: notification?.title,
      description: notification?.message,
      variant: 'default',
    });
    if (['academic', 'attendance', 'fee', 'homework', 'event', 'message'].includes(notification?.type)) {
      refetch();
    }
  };
  
  // Define the loadDashboardData function
  const loadDashboardData = useCallback(() => {
    const childId = Number(currentChild?.id);
    if (Number.isFinite(childId) && childId > 0) {
      fetchDashboardData();
    }
  }, [currentChild?.id, fetchDashboardData]);
  
  // Load dashboard data when child changes
  useEffect(() => {
    const childId = Number(currentChild?.id);
    if (Number.isFinite(childId) && childId > 0) {
      loadDashboardData();
    }
  }, [currentChild?.id, currentChild?.parent_id, loadDashboardData]);
  
  // Subscribe to notification and update events (no isConnected check)
  useEffect(() => {
    const childId = Number(currentChild?.id);
    if (!Number.isFinite(childId) || childId <= 0) return;

    const handleSocketNotification = (payload: any) => {
      const notification = payload?.data ?? payload;
      if (!notification) return;
      handleNotification(notification);
    };

    const unsubscribeNotificationCreated = subscribe('notification_created', handleSocketNotification);
    const unsubscribeNewNotification = subscribe('new_notification', handleSocketNotification);

    const unsubscribeCallbacks = [
      subscribe('academic_update', () => refetch()),
      subscribe('attendance_update', () => refetch()),
      subscribe('fee_update', () => refetch()),
      subscribe('homework_update', () => refetch()),
      subscribe('event_update', () => refetch()),
      subscribe('message_update', () => refetch())
    ];

    return () => {
      unsubscribeNotificationCreated();
      unsubscribeNewNotification();
      unsubscribeCallbacks.forEach(unsub => unsub());
    };
  }, [currentChild?.id, subscribe, refetch]);
  
  // Enhanced loading state
  if (isLoading) {
    return (
      <LoadingState 
        message="Loading dashboard data..."
        isRetrying={isRetrying}
        retryCount={retryCount}
        maxRetries={3}
      />
    );
  }
  
  // Enhanced error state
  if (error) {
    return (
      <ErrorDisplay 
        error={error}
        onRetry={refetch}
        showDetails={process.env.NODE_ENV === 'development'}
        className="mt-4"
      />
    );
  }
  
  // Use data from enhanced API call or fallback to initial data
  const academicData = {
    ...initialAcademicData,
    ...(dashboardData?.academicData ?? {})
  };
  const attendanceData = {
    ...initialAttendanceData,
    ...(dashboardData?.attendanceData ?? {})
  };
  const feeData = {
    ...initialFeeData,
    ...(dashboardData?.feeData ?? {})
  };
  const homeworkData = dashboardData?.homeworkData ?? initialHomeworkData;
  const pendingHomeworkCount = Array.isArray(homeworkData)
    ? homeworkData.filter((item: any) => item.status === 'pending').length
    : 0;
  
  return (
    <>
      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="bg-blue-100 bg-opacity-20 p-2 rounded-full">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <Badge variant="outline" className="text-xs">
                {t('parent_portal.my_children.grade_class_short', 'Class: {{grade}}', { grade: academicData?.overallGrade || 'N/A' })}
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-indigo-900">{academicData?.overallPercentage || 0}%</h3>
              <p className="text-sm text-indigo-700">{t('parent_portal.my_children.academic_average', 'Academic Average')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="bg-green-100 bg-opacity-20 p-2 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <Badge variant="outline" className="text-xs">
                {t('parent_portal.my_children.this_month', 'This Month')}
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-indigo-900">{attendanceData?.percentage || 0}%</h3>
              <p className="text-sm text-indigo-700">{t('parent_portal.my_children.attendance_rate', 'Attendance Rate')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="bg-yellow-100 bg-opacity-20 p-2 rounded-full">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
              <Badge variant={
                feeData?.status === 'paid' ? 'success' :
                feeData?.status === 'partial' || feeData?.status === 'pending' ? 'warning' :
                feeData?.status === 'overdue' ? 'destructive' : 'outline'
              } className="text-xs">
                {feeData?.status 
                  ? (t(`parent_portal.my_children.fee_status_${feeData.status}`, String(feeData.status)) as string)
                  : (t('parent_portal.my_children.fee_status_unknown', 'Unknown') as string)}
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-indigo-900">{currency} {feeData?.amount || 0}</h3>
              <p className="text-sm text-indigo-700">{t('parent_portal.my_children.fee_status_label', 'Fee Status')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="bg-purple-100 bg-opacity-20 p-2 rounded-full">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <Badge variant="outline" className="text-xs">
                {pendingHomeworkCount > 0
                  ? `${pendingHomeworkCount} ${t('parent_portal.my_children.pending_label', 'Pending')}`
                  : t('parent_portal.my_children.assignments_label', 'Assignments')}
              </Badge>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-bold text-indigo-900">{homeworkData?.length || 0}</h3>
              <p className="text-sm text-indigo-700">{t('parent_portal.my_children.assignments_label', 'Assignments')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-indigo-900">Assignment Progress</h3>
              <p className="text-sm text-indigo-700">Track homework status and grading for this child.</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {homeworkData?.length || 0} total
            </Badge>
          </div>

          {Array.isArray(homeworkData) && homeworkData.length > 0 ? (
            <div className="space-y-3">
              {homeworkData.slice(0, 5).map((assignment: any) => (
                <div key={assignment.id} className="rounded-lg bg-white bg-opacity-20 p-3 border border-white border-opacity-20">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-indigo-900">{assignment.title}</div>
                      <div className="text-xs text-indigo-700">
                        {assignment.subject} • Due {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    <Badge
                      variant={
                        assignment.status === 'graded'
                          ? 'success'
                          : assignment.status === 'submitted'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="capitalize"
                    >
                      {assignment.status}
                    </Badge>
                  </div>
                  {assignment.score != null ? (
                    <div className="mt-2 text-xs text-indigo-700">Score: {assignment.score}</div>
                  ) : null}
                  {assignment.feedback ? (
                    <div className="mt-2 text-xs text-indigo-700">Feedback: {assignment.feedback}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-indigo-700">No assignments available for this child yet.</div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default DashboardTab;
