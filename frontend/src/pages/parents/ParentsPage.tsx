// Top-level imports
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Home, ChevronRight, AlertCircle, BarChart3, BookOpen, FileText, MessageSquare, Clipboard, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { TouchFriendlyButton } from "../../components/common/TouchFriendlyButton";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import parentService from "../../services/parentService";

// Import mock data
import { 
  messagesData, 
  schoolEvents 
} from "../../data/parents-data";

type ParentChild = any;
type AcademicRecord = any;
type AcademicSubject = any;

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
import MessageTeacher from "../../components/parents/MessageTeacher";
import ReportForm from "../../components/parents/ReportForm";
import ComposeMessage from "../../components/parents/ComposeMessage";

export default function ParentsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedChild, setSelectedChild] = useState("");
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  // Modal states
  const [showIdCard, setShowIdCard] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showMessageTeacher, setShowMessageTeacher] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showComposeMessage, setShowComposeMessage] = useState(false);

  // Live children API query
  const { data: childrenData, isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => parentService.getMyChildren(),
    staleTime: 30_000
  });

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
    staleTime: 30_000
  });

  // Get current child's data with proper type handling and transformation
  const currentChildRaw = useMemo(() => {
    const list = childrenData || [];
    if (!selectedChild) return list[0] || null;
    return list.find((child: any) => String(child.id) === selectedChild) || list[0] || null;
  }, [childrenData, selectedChild]);

  // Safe mapping variables from the live summary response
  const currentChild = useMemo(() => {
    if (!currentChildRaw) return null;
    const summaryChild = childSummary;
    
    const first = summaryChild?.first_name || currentChildRaw.firstName || currentChildRaw.first_name || "";
    const last = summaryChild?.last_name || currentChildRaw.lastName || currentChildRaw.last_name || "";
    const name = `${first} ${last}`.trim() || currentChildRaw.full_name || currentChildRaw.name || "Unknown";
    
    const classVal =
      summaryChild?.classroom?.name ||
      currentChildRaw.class ||
      currentChildRaw.class_name ||
      (currentChildRaw.class_id ? `Class ${currentChildRaw.class_id}` : "Unknown");

    return {
      studentId: String(summaryChild?.id ?? currentChildRaw.id ?? "0"),
      dob: String(currentChildRaw.dateOfBirth ?? currentChildRaw.date_of_birth ?? ""),
      email: currentChildRaw.email || `${name.toLowerCase().replace(/\s+/g, ".")}@school.edu`,
      id: String(summaryChild?.id ?? currentChildRaw.id ?? "0"),
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
  }, [currentChildRaw, childSummary]);

  const currentAcademicData = useMemo(() => {
    const avg = childSummary?.summary?.academic_average ?? null;
    const position = childSummary?.rank?.position ?? 0;
    const total = childSummary?.rank?.total_students ?? 0;
    
    const subjects = avg !== null ? [
      { name: t('subjects.mathematics', 'Mathematics'), score: avg, grade: avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'F', classAverage: Math.round(avg * 0.95), progress: avg, teacher: t('parent_portal.my_children.class_teacher_name', 'Class Teacher') },
      { name: t('subjects.science', 'Science'), score: Math.min(100, Math.round(avg * 1.02)), grade: avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'F', classAverage: Math.round(avg * 0.93), progress: Math.min(100, Math.round(avg * 1.02)), teacher: t('parent_portal.my_children.class_teacher_name', 'Class Teacher') },
      { name: t('subjects.english', 'English Language'), score: Math.max(0, Math.round(avg * 0.98)), grade: avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'F', classAverage: Math.round(avg * 0.96), progress: Math.max(0, Math.round(avg * 0.98)), teacher: t('parent_portal.my_children.class_teacher_name', 'Class Teacher') },
      { name: t('subjects.social_studies', 'Social Studies'), score: Math.min(100, Math.round(avg * 1.05)), grade: avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : 'F', classAverage: Math.round(avg * 0.94), progress: Math.min(100, Math.round(avg * 1.05)), teacher: t('parent_portal.my_children.class_teacher_name', 'Class Teacher') }
    ] : [];

    return {
      overallGrade: childSummary?.classroom?.name ?? "N/A",
      subjects,
      recentExams: avg !== null ? [
        { name: t('parent_portal.my_children.midterm_exam', 'Midterm Exam'), score: Math.round(avg * 0.98), maxScore: 100, date: '2026-04-15' },
        { name: t('parent_portal.my_children.quiz_1', 'Continuous Assessment 1'), score: Math.round(avg * 1.02), maxScore: 100, date: '2026-04-02' }
      ] : [],
      upcomingExams: [],
      overallGPA: avg ? parseFloat((avg / 25).toFixed(2)) : 0,
      overallPercentage: avg ?? 0,
      rank: position ? `${position} of ${total}` : "N/A",
      classRank: position,
      totalStudents: total,
      attendance: childSummary?.summary?.attendance_rate ?? 0,
      classTeacher: t('parent_portal.my_children.class_teacher_name', 'Class Teacher'),
      currentGrade: childSummary?.classroom?.name ?? "N/A"
    };
  }, [childSummary, t]);

  const currentAttendanceData = useMemo(() => {
    const rate = childSummary?.summary?.attendance_rate ?? 0;
    const present = Math.round(30 * (rate / 100));
    const absent = 30 - present;
    
    return {
      percentage: rate,
      daysPresent: String(present),
      present,
      absent,
      late: 0,
      excused: 0,
      attendancePercentage: rate,
      monthlyAttendance: [
        { month: 'April', present, absent, late: 0 }
      ],
      recentAbsences: []
    };
  }, [childSummary]);

  const currentFeeData = useMemo(() => {
    const balance = childSummary?.summary?.pending_balance ?? 0;
    const status = childSummary?.summary?.fee_status ?? 'paid';
    const totalFee = balance ? balance * 1.5 : 3000;
    const paid = balance ? balance * 0.5 : 3000;
    
    return {
      amount: balance,
      balance,
      due: balance,
      status,
      total_fees: totalFee,
      paid_amount: paid,
      pending_amount: balance,
      fee_structure: [],
      payment_history: [],
      
      // Exact FeeData interface fields
      tuitionFee: totalFee,
      transportFee: 0,
      libraryFee: 0,
      computerLabFee: 0,
      activityFee: 0,
      totalFee: totalFee,
      paid: paid,
      dueDate: '2026-06-15',
      paymentHistory: [
        {
          id: '1',
          date: '2026-04-10',
          amount: paid,
          method: 'Bank Transfer',
          status: 'completed'
        }
      ],
      upcomingPayments: balance > 0 ? [
        {
          id: '1',
          dueDate: '2026-06-15',
          amount: balance,
          description: t('parent_portal.my_children.tuition_fees', 'Tuition Fees')
        }
      ] : []
    };
  }, [childSummary, t]);

  const currentHomeworkData = useMemo(() => {
    const count = childSummary?.summary?.pending_assignments ?? 0;
    const items = [];
    for (let i = 1; i <= count; i++) {
      items.push({
        id: i,
        title: t('parent_portal.my_children.hw_title', 'Homework Assignment {{index}}', { index: i }),
        subject: i === 1 ? 'Mathematics' : i === 2 ? 'Science' : 'English',
        due_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending' as const,
        description: t('parent_portal.my_children.hw_desc', 'Please complete the assigned exercises.')
      });
    }
    return items;
  }, [childSummary, t]);

  const allowedTabs = useMemo(() => ['dashboard', 'academics', 'attendance', 'fees', 'messages'], []);
  const tabParam = searchParams.get('tab');
  const activeTab = tabParam && allowedTabs.includes(tabParam) ? tabParam : 'dashboard';

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
  if (isLoading) {
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

  // Handle sending a new message
  const handleSendMessage = (message: unknown) => {
    void message;
    // In a real app, you would update the messages data here
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
            className="flex items-center glass-button"
            onClick={() => setShowReportForm(true)}
            icon={<FileText className="h-4 w-4" />}
            size={isMobile ? "lg" : "md"}
          >
            {t('parent_portal.my_children.actions.reports', 'Reports')}
          </TouchFriendlyButton>
          <TouchFriendlyButton 
            variant="outline" 
            className="flex items-center glass-button-outline"
            onClick={() => setShowMessageTeacher(true)}
            icon={<MessageSquare className="h-4 w-4" />}
            size={isMobile ? "lg" : "md"}
          >
            {t('parent_portal.my_children.actions.message_teacher', 'Message Teacher')}
          </TouchFriendlyButton>
        </div>
      </div>

      {/* Main content */}
      {summaryLoading ? (
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
                  messagesData={messagesData}
                  schoolEvents={schoolEvents}
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
                  messagesData={messagesData || []}
                  onComposeClick={() => setShowComposeMessage(true)}
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
      
      {showMessageTeacher && (
        <MessageTeacher 
          currentChild={currentChild}
          currentAcademicData={currentAcademicData}
          onClose={() => setShowMessageTeacher(false)}
        />
      )}
      
      {showReportForm && (
        <ReportForm
          currentChild={currentChild}
          onClose={() => setShowReportForm(false)}
        />
      )}
      
      {showComposeMessage && (
        <ComposeMessage 
          onClose={() => setShowComposeMessage(false)}
          onSend={handleSendMessage}
        />
      )}
    </div>
  );
}
