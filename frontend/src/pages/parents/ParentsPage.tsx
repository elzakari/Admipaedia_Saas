// Top-level imports
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Home, ChevronRight, AlertCircle, BarChart3, BookOpen, FileText, MessageSquare, Clipboard, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { TouchFriendlyButton } from "../../components/common/TouchFriendlyButton";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import parentService from "../../services/parentService";
import { parentPortalPrimaryButtonClass, parentPortalSecondaryButtonClass } from "../../lib/parentPortalUi";

type ParentChild = any;
type AcademicRecord = any;
type AcademicSubject = any;

// Static constants inlined at module top-level to prevent Vite minifier TDZ circular reference errors
const ALLOWED_TABS = ["dashboard", "academics", "attendance", "fees", "messages"];
const TELEMETRY_TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "academics", label: "Études" },
  { id: "attendance", label: "Présence" },
  { id: "fees", label: "Frais en attente" }
];
const EMPTY_TELEMETRY_FALLBACK = {
  grade_average: 0,
  attendance_rate: 0,
  recent_grades: [] as any[],
  recent_attendance: [] as any[]
};

// Import tab components
import ParentChildProfile from "../../components/parents/ParentChildProfile";
import DashboardTab from "../../components/parents/DashboardTab";
import AcademicsTab from "../../components/parents/AcademicsTab";
import AttendanceTab from "../../components/parents/AttendanceTab";
import ConnectedFeesTab from "../../components/parents/ConnectedFeesTab";
import MessagesTab from "../../components/parents/MessagesTab";
import StudentTelemetryTabs from "../../components/parents/StudentTelemetryTabs";

// Import modal components
import StudentIdCard from "../../components/parents/StudentIdCard";
import StudentFullProfile from "../../components/parents/StudentFullProfile";
import StudentReport from "../../components/parents/StudentReport";

export default function ParentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedChild, setSelectedChild] = useState("");
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  // Modal states
  const [showIdCard, setShowIdCard] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showStudentReport, setShowStudentReport] = useState(false);

  // Live children API query
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => parentService.getMyChildren(),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const { data: parentDashboardData } = useQuery({
    queryKey: ['parent-dashboard'],
    queryFn: () => parentService.getMyDashboard(),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });
  const dashboardCurrency = parentDashboardData?.currency || 'GHS';

  const childrenList = useMemo(() => childrenData || [], [childrenData]);
  const childrenIdsKey = useMemo(() => {
    if (!childrenData) return "";
    return childrenData.map((c: any) => String(c.id)).join(",");
  }, [childrenData]);

  // Set the default selected child once the list loads
  useEffect(() => {
    if (!selectedChild && childrenList.length > 0) {
      setSelectedChild(String(childrenList[0].id));
    }
  }, [childrenIdsKey, selectedChild]);

  // Detailed summary API query
  const { data: childSummary, isLoading: summaryLoading, isError: isSummaryError } = useQuery({
    queryKey: ['child-detailed-summary', selectedChild],
    queryFn: () => parentService.getChildDetailedSummary(Number(selectedChild)),
    enabled: !!selectedChild,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData
  });

  // Get current child's data with proper type handling and transformation
  const currentChildRaw = useMemo(() => {
    const list = childrenData || [];
    if (!selectedChild) return list[0] || null;
    return list.find((child: any) => String(child.id) === selectedChild) || list[0] || null;
  }, [childrenData, selectedChild]);
  const currentChildId = Number(currentChildRaw?.id ?? 0);
  const currentParentId = Number(currentChildRaw?.parent_id ?? user?.id ?? 0);

  const { data: childAcademicResponse } = useQuery({
    queryKey: ['parent-child-academic', currentChildId],
    queryFn: () => parentService.getChildAcademicData(currentChildId),
    enabled: Number.isFinite(currentChildId) && currentChildId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData
  });

  const { data: childAttendanceResponse } = useQuery({
    queryKey: ['parent-child-attendance', currentChildId],
    queryFn: () => parentService.getChildAttendanceData(currentChildId),
    enabled: Number.isFinite(currentChildId) && currentChildId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData
  });

  const { data: childFeeResponse } = useQuery({
    queryKey: ['parent-child-fees', currentChildId],
    queryFn: () => parentService.getChildFeeData(currentChildId),
    enabled: Number.isFinite(currentChildId) && currentChildId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData
  });

  const { data: childHomeworkResponse } = useQuery({
    queryKey: ['parent-child-homework', currentChildId],
    queryFn: () => parentService.getChildHomeworkData(currentChildId),
    enabled: Number.isFinite(currentChildId) && currentChildId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData
  });

  const { data: parentMessagesResponse } = useQuery({
    queryKey: ['parent-messages', currentParentId],
    queryFn: () => parentService.getParentMessages(currentParentId),
    enabled: Number.isFinite(currentParentId) && currentParentId > 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData
  });

  // 🌟 Defensive Injection Blueprint
  const matchedGrade = useMemo(() => {
      if (!currentChildRaw || currentChildRaw.grade_level?.id === 'unassigned') {
          return { name: currentChildRaw?.grade_level?.name || 'Grade Unassigned', id: 'unassigned' };
      }
      
      // Ensure the array configuration object exists and is initialized before running selectors
      const N: any = null;
      if (typeof N !== 'undefined' && N) { 
          return N.find((g: any) => g.id === currentChildRaw.grade_level.id);
      }
      
      return null;
  }, [currentChildRaw, childrenData]);

  // Safe mapping variables from the live summary response
  const currentChild = useMemo(() => {
    if (!currentChildRaw) return null;
    const summaryChild = childSummary;
    
    const first = summaryChild?.first_name || currentChildRaw.firstName || currentChildRaw.first_name || "";
    const last = summaryChild?.last_name || currentChildRaw.lastName || currentChildRaw.last_name || "";
    const name = `${first} ${last}`.trim() || currentChildRaw.full_name || currentChildRaw.name || "Unknown";
    
    const classVal =
      summaryChild?.classroom?.name ||
      (currentChildRaw.grade_level?.id === 'unassigned' ? matchedGrade?.name : null) ||
      currentChildRaw.class ||
      currentChildRaw.class_name ||
      (currentChildRaw.class_id ? `Class ${currentChildRaw.class_id}` : "Unknown");

    return {
      studentId: String(summaryChild?.id ?? currentChildRaw.id ?? "0"),
      dob: String(currentChildRaw.dateOfBirth ?? currentChildRaw.date_of_birth ?? ""),
      email: currentChildRaw.email || `${name.toLowerCase().replace(/\s+/g, ".")}@school.edu`,
      id: String(summaryChild?.id ?? currentChildRaw.id ?? "0"),
      class_id: summaryChild?.classroom?.id ?? currentChildRaw.class_id ?? null,
      parent_id: currentChildRaw.parent_id ?? null,
      name: name,
      photo: currentChildRaw.photo ?? currentChildRaw.profile_picture ?? "",
      age: summaryChild?.age ?? (typeof currentChildRaw.age === "number" ? currentChildRaw.age : 0),
      gender: currentChildRaw.gender ?? "Unknown",
      class: classVal,
      admissionNumber: String(summaryChild?.admission_no ?? currentChildRaw.admissionNumber ?? currentChildRaw.admission_number ?? ""),
      dateOfBirth: String(currentChildRaw.dateOfBirth ?? currentChildRaw.date_of_birth ?? ""),
      bloodGroup: currentChildRaw.bloodGroup ?? currentChildRaw.blood_group ?? "Unknown",
      emergencyContact: currentChildRaw.emergencyContact ?? currentChildRaw.father_contact ?? currentChildRaw.mother_contact ?? "Unknown",
      address: currentChildRaw.address ?? currentChildRaw.residential_address ?? "",
      medicalConditions: Array.isArray(currentChildRaw.medicalConditions)
        ? currentChildRaw.medicalConditions
        : typeof currentChildRaw.medical_conditions === "string" && currentChildRaw.medical_conditions
        ? [currentChildRaw.medical_conditions]
        : []
    };
  }, [currentChildRaw, childSummary, matchedGrade]);
  const showSummarySkeleton = summaryLoading && !currentChild;

  const currentAcademicData = useMemo(() => {
    const avg = childSummary?.summary?.academic_average ?? null;
    const position = childSummary?.rank?.position ?? 0;
    const total = childSummary?.rank?.total_students ?? 0;
    const subjects = Array.isArray(childAcademicResponse?.subject_grades)
      ? childAcademicResponse.subject_grades.map((subject) => {
          const score = Number(subject?.grade ?? 0);
          const letterGrade =
            score >= 80 ? 'A' :
            score >= 70 ? 'B' :
            score >= 60 ? 'C' :
            score >= 50 ? 'D' :
            'F';

          return {
            name: subject.subject || t('subjects.subject', 'Subject'),
            score,
            grade: letterGrade,
            teacher: subject.teacher || t('parent_portal.my_children.class_teacher_name', 'Class Teacher')
          };
        })
      : [];

    const recentExams = Array.isArray(childAcademicResponse?.recent_exams)
      ? childAcademicResponse.recent_exams.map((exam) => ({
          name: exam.exam_name || exam.subject || t('parent_portal.my_children.assessment', 'Assessment'),
          score: Number(exam.score ?? 0),
          maxScore: 100,
          date: exam.date || ''
        }))
      : [];

    return {
      overallGrade: childSummary?.classroom?.name ?? "N/A",
      subjects,
      recentExams,
      upcomingExams: [],
      overallGPA: avg ? parseFloat((avg / 25).toFixed(2)) : 0,
      overallPercentage: avg ?? Number(childAcademicResponse?.overall_grade ?? 0),
      rank: position ? `${position} of ${total}` : "N/A",
      classRank: position,
      totalStudents: total,
      attendance: childSummary?.summary?.attendance_rate ?? 0,
      classTeacher: t('parent_portal.my_children.class_teacher_name', 'Class Teacher'),
      currentGrade: childSummary?.classroom?.name ?? "N/A"
    };
  }, [childAcademicResponse, childSummary, t]);

  const currentAttendanceData = useMemo(() => {
    const monthlyBreakdown = Array.isArray(childAttendanceResponse?.monthly_breakdown)
      ? childAttendanceResponse.monthly_breakdown
      : [];
    const present = monthlyBreakdown.reduce((sum, month) => sum + Number(month.present_days ?? 0), 0);
    const totalDays = monthlyBreakdown.reduce((sum, month) => sum + Number(month.total_days ?? 0), 0);
    const absent = Math.max(0, totalDays - present);
    const recentAbsences = Array.isArray(childAttendanceResponse?.recent_absences)
      ? childAttendanceResponse.recent_absences.map((absence) => ({
          date: absence.date,
          reason: absence.reason || '',
          status: absence.excused ? 'Excused' : 'Unexcused'
        }))
      : [];
    const excused = recentAbsences.filter((absence) => absence.status === 'Excused').length;
    const rate = childAttendanceResponse?.overall_rate ?? childSummary?.summary?.attendance_rate ?? 0;

    return {
      percentage: rate,
      daysPresent: String(present),
      present,
      absent,
      late: 0,
      excused,
      attendancePercentage: rate,
      monthlyAttendance: monthlyBreakdown.map((month) => ({
        month: month.month,
        present: Number(month.present_days ?? 0),
        absent: Math.max(0, Number(month.total_days ?? 0) - Number(month.present_days ?? 0)),
        late: 0
      })),
      recentAbsences
    };
  }, [childAttendanceResponse, childSummary]);

  const currentFeeData = useMemo(() => {
    const balance = childSummary?.summary?.pending_balance ?? 0;
    const totalFee = Number(childFeeResponse?.total_fees ?? balance);
    const paid = Number(childFeeResponse?.paid_amount ?? Math.max(0, totalFee - balance));
    const pending = Number(childFeeResponse?.pending_amount ?? balance);
    const feeStructure = Array.isArray(childFeeResponse?.fee_structure) ? childFeeResponse.fee_structure : [];
    const paymentHistory = Array.isArray(childFeeResponse?.payment_history) ? childFeeResponse.payment_history : [];
    
    return {
      amount: pending,
      balance: pending,
      due: pending,
      status: childSummary?.summary?.fee_status ?? (pending > 0 ? 'pending' : 'paid'),
      total_fees: totalFee,
      paid_amount: paid,
      pending_amount: pending,
      fee_structure: feeStructure,
      payment_history: paymentHistory,
      
      // Exact FeeData interface fields
      tuitionFee: totalFee,
      transportFee: 0,
      libraryFee: 0,
      computerLabFee: 0,
      activityFee: 0,
      totalFee,
      paid: paid,
      dueDate: feeStructure.find((item) => item.due_date)?.due_date || '',
      paymentHistory: paymentHistory.map((payment, index) => ({
        id: String(index + 1),
        date: payment.date,
        amount: Number(payment.amount ?? 0),
        method: payment.method || 'Payment',
        status: 'completed'
      })),
      upcomingPayments: feeStructure
        .filter((item) => item.status !== 'paid')
        .map((item, index) => ({
          id: String(index + 1),
          dueDate: item.due_date,
          amount: Number(item.amount ?? 0),
          description: item.category || t('parent_portal.my_children.fees', 'Fees')
        }))
    };
  }, [childFeeResponse, childSummary, t]);

  const currentHomeworkData = useMemo(() => {
    return Array.isArray(childHomeworkResponse) ? childHomeworkResponse : [];
  }, [childHomeworkResponse]);

  const currentMessagesData = useMemo(() => {
    return Array.isArray(parentMessagesResponse) ? parentMessagesResponse : [];
  }, [parentMessagesResponse]);

  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && ALLOWED_TABS.includes(tabParam) ? tabParam : 'dashboard';

  useEffect(() => {
    if (!tabParam) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'dashboard');
        return next;
      }, { replace: true });
    }
  }, [tabParam]);

  const handleTabChange = (nextTab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    }, { replace: true });
  };

  // Loading state
  const isLoading = childrenLoading;
  const showPageSkeleton = isLoading && !currentChildRaw;

  // Handle offline mode
  useEffect(() => {
    const handleOnlineStatus = () => {
      setOfflineMode(!navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    
    // Check initial status
    setOfflineMode(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const renderSkeletons = () => (
    <div className="flex flex-col lg:flex-row gap-6 animate-pulse">
      {/* Sidebar Skeleton */}
      <div className="lg:w-1/4 space-y-4 bg-white bg-opacity-10 p-6 rounded-xl border border-white border-opacity-20 shadow-lg backdrop-blur-md animate-pulse">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-24 w-24 rounded-full bg-indigo-100 bg-opacity-20 animate-pulse" />
          <div className="h-6 w-32 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
          <div className="h-4 w-24 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
          <div className="flex space-x-2">
            <div className="h-5 w-16 bg-indigo-100 bg-opacity-20 rounded-full animate-pulse" />
            <div className="h-5 w-16 bg-indigo-100 bg-opacity-20 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-white border-opacity-10">
          <div className="h-4 w-full bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="lg:w-3/4 space-y-6">
        {/* Tabs skeleton */}
        <div className="flex space-x-4 bg-white bg-opacity-10 p-2 rounded-lg border border-white border-opacity-20 animate-pulse">
          <div className="h-8 w-24 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
          <div className="h-8 w-24 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
          <div className="h-8 w-24 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
        </div>

        {/* KPI Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white bg-opacity-10 p-6 rounded-xl border border-white border-opacity-20 shadow-lg backdrop-blur-md space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-8 w-8 rounded-full bg-indigo-100 bg-opacity-20 animate-pulse" />
                <div className="h-5 w-16 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
              </div>
              <div className="h-8 w-20 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
              <div className="h-4 w-28 bg-indigo-100 bg-opacity-20 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Content detail card skeleton */}
        <div className="bg-white bg-opacity-10 p-6 rounded-xl border border-white border-opacity-20 shadow-lg backdrop-blur-md h-64 animate-pulse" />
      </div>
    </div>
  );

  // Loading state
  if (showPageSkeleton) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4 animate-pulse"></div>
        <h1 className="text-2xl font-bold text-gray-800 animate-pulse">{t('parents_page.loading_title', 'Loading Parent Portal')}</h1>
        <p className="text-gray-600 mt-2 animate-pulse">{t('parents_page.loading_desc', "Please wait while we load your children's information...")}</p>
      </div>
    );
  }

  // If there are no students linked to this account
  if (!isLoading && childrenList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center animate-pulse">
        <AlertCircle className="h-16 w-16 text-indigo-600 mb-4 animate-bounce" />
        <h1 className="text-2xl font-bold text-indigo-900">{t('parents_page.no_students', 'No students linked to this account.')}</h1>
        <p className="text-gray-600 mt-2 max-w-md">{t('parents_page.no_students_desc', 'If you believe this is an error, please contact the school administration.')}</p>
        <TouchFriendlyButton className="mt-6 glass-button" onClick={() => window.location.reload()}>
          {t('parents_page.contact_admin', 'Contact Support')}
        </TouchFriendlyButton>
      </div>
    );
  }

  // If there's an error with the data and we don't have children list, show a fallback
  if (!isLoading && childrenList.length === 0 && (isSummaryError || !childSummary)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center animate-pulse">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-indigo-900">{t('parent_portal.my_children.error_title', 'Sync Connection Refused')}</h1>
        <p className="text-gray-600 mt-2 max-w-md">
          {t('parent_portal.my_children.error_desc', 'The school portal server was unable to retrieve live academic transcripts. Please try again.')}
        </p>
        <TouchFriendlyButton className="mt-6 glass-button" onClick={() => window.location.reload()}>
          {t('common.retry', 'Retry Synchronizing')}
        </TouchFriendlyButton>
      </div>
    );
  }

  const openMessagesCompose = (options?: { recipientType?: string; classId?: string | number | null; subject?: string }) => {
    const params = new URLSearchParams({ compose: '1' });
    if (options?.recipientType) {
      params.set('recipient_type', options.recipientType);
    }
    if (options?.classId) {
      params.set('class_id', String(options.classId));
    }
    if (options?.subject) {
      params.set('subject', options.subject);
    }
    navigate(`/messages?${params.toString()}`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Breadcrumb navigation */}
      <div className="flex items-center text-sm text-indigo-700 mb-2">
        <Link to="/parent/dashboard" className="flex items-center hover:text-indigo-900">
          <Home className="h-4 w-4 mr-1" />
          <span>{t('parent_portal.dashboard.title', 'Dashboard')}</span>
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-indigo-900">{t('parent_portal.my_children.title', 'My Children')}</span>
      </div>

      {/* Offline mode indicator */}
      {offlineMode && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{t('parent_portal.my_children.offline_mode_warning', "You are currently in offline mode. Changes will be saved locally and synced when you're back online.")}</span>
          </div>
        </div>
      )}

      {/* Page header with child selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white bg-opacity-30 p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{t('parent_portal.my_children.title', 'My Children')}</h1>
          <p className="mt-1 text-sm text-indigo-700">
            {t('parent_portal.my_children.subtitle', "Monitor your child's academic journey and school activities")}
          </p>
          {summaryLoading && currentChild && (
            <p className="mt-2 text-xs font-medium text-indigo-500">
              {t('parent_portal.my_children.refreshing', 'Refreshing child summary...')}
            </p>
          )}
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-full sm:w-[200px] glass-button-outline">
              <SelectValue placeholder={t('parent_portal.my_children.select_child', 'Select Child')} />
            </SelectTrigger>
            <SelectContent>
              {childrenList.map((child: any) => {
                const childName = child.full_name || child.name || `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Student';
                const childClass = child.class || child.class_name || (child.class_id ? `Class ${child.class_id}` : 'Class');
                return (
                  <SelectItem key={String(child.id)} value={String(child.id)}>
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src={child.photo || child.profile_picture} alt={childName} />
                        <AvatarFallback>{childName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {childName} - {childClass}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <TouchFriendlyButton 
            className={`flex items-center ${parentPortalPrimaryButtonClass}`}
            onClick={() => setShowStudentReport(true)}
            icon={<FileText className="h-4 w-4" />}
            size={isMobile ? "lg" : "md"}
          >
            {t('parent_portal.my_children.actions.reports', 'Reports')}
          </TouchFriendlyButton>
          <TouchFriendlyButton 
            variant="outline" 
            className={`flex items-center ${parentPortalSecondaryButtonClass}`}
            onClick={() => openMessagesCompose({
              recipientType: 'teacher',
              classId: currentChild?.class_id,
              subject: currentChild?.name ? `Regarding ${currentChild.name}` : undefined
            })}
            icon={<MessageSquare className="h-4 w-4" />}
            size={isMobile ? "lg" : "md"}
          >
            {t('parent_portal.my_children.actions.message_teacher', 'Message Teacher')}
          </TouchFriendlyButton>
        </div>
      </div>

      {/* Main content */}
      {showSummarySkeleton ? (
        renderSkeletons()
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Child profile sidebar */}
          <div className="lg:w-1/4">
            <ParentChildProfile 
              currentChild={currentChild} 
              currentAcademicData={currentAcademicData}
              currentAttendanceData={currentAttendanceData}
              currentFeeData={currentFeeData}
              currency={dashboardCurrency}
              onIdCardClick={() => setShowIdCard(true)}
              onFullProfileClick={() => setShowFullProfile(true)}
            />
          </div>

          {/* Main content area */}
          <div className="lg:w-3/4">
            <StudentTelemetryTabs currentStudentId={currentChild?.id || ""} />
            <Tabs value={activeTab}>

              <TabsContent value="dashboard">
                <DashboardTab 
                  currentChild={currentChild}
                  currentAcademicData={currentAcademicData}
                  currentAttendanceData={currentAttendanceData}
                  currentFeeData={currentFeeData}
                  currentHomeworkData={currentHomeworkData}
                  currency={dashboardCurrency}
                />
              </TabsContent>
              
              <TabsContent value="academics">
                <AcademicsTab 
                  currentAcademicData={currentAcademicData}
                />
              </TabsContent>
              
              <TabsContent value="attendance">
                <AttendanceTab 
                  currentAttendanceData={currentAttendanceData}
                />
              </TabsContent>

              <TabsContent value="fees">
                <ConnectedFeesTab childId={currentChild?.id || ""} fallbackFeeData={currentFeeData} />
              </TabsContent>
              
              <TabsContent value="messages">
                <MessagesTab
                  messagesData={currentMessagesData}
                  onComposeClick={() => openMessagesCompose()}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}

      {/* Modals */}
      {showIdCard && (
        <StudentIdCard 
          student={currentChild}
          isOpen={showIdCard}
          onClose={() => setShowIdCard(false)}
        />
      )}
      
      {showFullProfile && (
        <StudentFullProfile 
          currentChild={currentChild}
          currentAcademicData={currentAcademicData}
          currentAttendanceData={currentAttendanceData}
          currentFeeData={currentFeeData}
          isOpen={showFullProfile}
          onClose={() => setShowFullProfile(false)}
        />
      )}
      
      {showStudentReport && (
        <StudentReport
          currentChild={currentChild}
          currentAcademicData={currentAcademicData}
          currentAttendanceData={currentAttendanceData}
          onClose={() => setShowStudentReport(false)}
          className="mt-6"
        />
      )}
    </div>
  );
}
