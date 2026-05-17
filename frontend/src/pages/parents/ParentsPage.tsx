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

// Import mock data
import { 
  parentData, 
  academicData, 
  attendanceData, 
  feeData, 
  homeworkData, 
  messagesData, 
  schoolEvents 
} from "../../data/parents-data";

type ParentChild = (typeof parentData.children)[number];
type AcademicRecord = (typeof academicData)[keyof typeof academicData];
type AcademicSubject = AcademicRecord['subjects'][number];

// Import tab components
import ParentChildProfile from "../../components/parents/ParentChildProfile";
import DashboardTab from "../../components/parents/DashboardTab";
import AcademicsTab from "../../components/parents/AcademicsTab";
import AttendanceTab from "../../components/parents/AttendanceTab";
import ConnectedFeesTab from "../../components/parents/ConnectedFeesTab";
import MessagesTab from "../../components/parents/MessagesTab";

// Import modal components
import StudentIdCard from "../../components/parents/StudentIdCard";
import StudentFullProfile from "../../components/parents/StudentFullProfile";
import MessageTeacher from "../../components/parents/MessageTeacher";
import ReportForm from "../../components/parents/ReportForm";
import ComposeMessage from "../../components/parents/ComposeMessage";

export default ParentsPage;

function ParentsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedChild, setSelectedChild] = useState("child1");
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  // Modal states
  const [showIdCard, setShowIdCard] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showMessageTeacher, setShowMessageTeacher] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showComposeMessage, setShowComposeMessage] = useState(false);

  // Get current child's data with proper type handling and transformation
  const currentChildRaw: ParentChild | null =
    parentData.children.find((child) => child.id === selectedChild) ??
    (parentData.children.length > 0 ? parentData.children[0] : null);

  // Build StudentData with safe defaults for required fields
  const safeName =
    typeof currentChildRaw?.name === "string" && currentChildRaw.name.trim()
      ? currentChildRaw.name
      : "Unknown";

  const currentChild = {
    studentId: String(currentChildRaw?.admissionNumber ?? currentChildRaw?.id ?? "0"),
    dob: String(currentChildRaw?.dateOfBirth ?? ""),
    email: `${safeName.toLowerCase().replace(/\s+/g, ".")}@school.edu`,
    id: String(currentChildRaw?.id ?? "0"),
    name: safeName,
    photo: currentChildRaw?.photo ?? "",
    age: typeof currentChildRaw?.age === "number" ? currentChildRaw.age : 0,
    gender: currentChildRaw?.gender ?? "Unknown",
    class: currentChildRaw?.class ?? "Unknown",
    admissionNumber: String(currentChildRaw?.admissionNumber ?? ""),
    dateOfBirth: String(currentChildRaw?.dateOfBirth ?? ""),
    bloodGroup: currentChildRaw?.bloodGroup ?? "Unknown",
    emergencyContact: currentChildRaw?.emergencyContact ?? "Unknown",
    address: currentChildRaw?.address ?? "",
    medicalConditions: Array.isArray(currentChildRaw?.medicalConditions)
      ? currentChildRaw.medicalConditions
      : []
  };

  const currentAcademicDataRaw = academicData[selectedChild as keyof typeof academicData];
  const currentAttendanceDataRaw = attendanceData[selectedChild as keyof typeof attendanceData];

  const currentAcademicData = {
    ...currentAcademicDataRaw,
    overallGrade: currentAcademicDataRaw?.currentGrade ?? "",
    subjects: (currentAcademicDataRaw?.subjects ?? []).map((subject: AcademicSubject) => ({
      ...subject,
      progress: subject.score
    })),
    recentExams: currentAcademicDataRaw?.recentExams ?? [],
    upcomingExams: currentAcademicDataRaw?.upcomingExams ?? [],
    overallGPA: currentAcademicDataRaw?.overallGPA ?? 0,
    rank: currentAcademicDataRaw?.rank ?? "",
    attendance: currentAcademicDataRaw?.attendance ?? 0,
    classTeacher: currentAcademicDataRaw?.classTeacher ?? "",
    currentGrade: currentAcademicDataRaw?.currentGrade ?? ""
  };

  const currentAttendanceData = {
    ...currentAttendanceDataRaw,
    percentage: currentAttendanceDataRaw?.attendancePercentage ?? 0,
    daysPresent: String(currentAttendanceDataRaw?.present ?? 0),
    present: currentAttendanceDataRaw?.present ?? 0,
    absent: currentAttendanceDataRaw?.absent ?? 0,
    late: currentAttendanceDataRaw?.late ?? 0,
    excused: currentAttendanceDataRaw?.excused ?? 0,
    attendancePercentage: currentAttendanceDataRaw?.attendancePercentage ?? 0,
    monthlyAttendance: currentAttendanceDataRaw?.monthlyAttendance ?? [],
    recentAbsences: currentAttendanceDataRaw?.recentAbsences ?? []
  };

  const currentFeeData = feeData[selectedChild as keyof typeof feeData];
  const currentHomeworkData = homeworkData[selectedChild as keyof typeof homeworkData];
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
  }, [setSearchParams, tabParam]);

  const handleTabChange = (nextTab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', nextTab);
      return next;
    }, { replace: true });
  };

  // NOTE: Removed duplicate re-declarations of currentChild/currentAcademicData/currentAttendanceData

  

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-800">{t('parents_page.loading_title', 'Loading Parent Portal')}</h1>
        <p className="text-gray-600 mt-2">{t('parents_page.loading_desc', "Please wait while we load your children's information...")}</p>
      </div>
    );
  }

  // If there's an error with the data, show a fallback
  if (!currentChild || !currentAcademicData || !currentAttendanceData || !currentFeeData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">{t('parents_page.loading_error_title', 'Data Loading Error')}</h1>
        <p className="text-gray-600 mt-2">{t('parents_page.loading_error_desc', 'Unable to load parent data. Please try again later.')}</p>
        <TouchFriendlyButton className="mt-4" onClick={() => window.location.reload()}>
          {t('common.refresh_page', 'Refresh Page')}
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
          <span>{t('navigation.dashboard', 'Dashboard')}</span>
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-indigo-900">{t('parent_portal.dashboard.cards.my_children', 'My Children')}</span>
      </div>

      {/* Offline mode indicator */}
      {offlineMode && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{t('parents_page.offline_mode_warning', 'You are currently in offline mode. Changes will be saved locally and synced when you\'re back online.')}</span>
          </div>
        </div>
      )}

      {/* Page header with child selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white bg-opacity-30 p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{t('parent_portal.dashboard.cards.my_children', 'My Children')}</h1>
          <p className="mt-1 text-sm text-indigo-700">
            {t('parents_page.subtitle', "Monitor your child's academic journey and school activities")}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="w-full sm:w-[200px] glass-button-outline">
              <SelectValue placeholder={t('parents_page.select_child', 'Select Child')} />
            </SelectTrigger>
            <SelectContent>
              {parentData.children.map((child: ParentChild) => (
                <SelectItem key={child.id} value={child.id}>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={child.photo} alt={String(child.name || '')} />
                      <AvatarFallback>{typeof child.name === 'string' ? child.name.charAt(0) : ''}</AvatarFallback>
                    </Avatar>
                    {child.name} - Class {child.class}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TouchFriendlyButton 
            className="flex items-center glass-button"
            onClick={() => setShowReportForm(true)}
            icon={<FileText className="h-4 w-4" />}
            size={isMobile ? "lg" : "md"}
          >
            {t('parent_portal.dashboard.shortcuts.admissions', 'Reports')}
          </TouchFriendlyButton>
          <TouchFriendlyButton 
            variant="outline" 
            className="flex items-center glass-button-outline"
            onClick={() => setShowMessageTeacher(true)}
            icon={<MessageSquare className="h-4 w-4" />}
            size={isMobile ? "lg" : "md"}
          >
            {t('parents_page.message_teacher', 'Message Teacher')}
          </TouchFriendlyButton>
        </div>
      </div>

      {/* Main content */}
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
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 w-full justify-start overflow-x-auto">
              <TabsTrigger value="dashboard" className="min-w-[120px]">
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('navigation.dashboard', 'Dashboard')}
              </TabsTrigger>
              <TabsTrigger value="academics" className="min-w-[120px]">
                <BookOpen className="h-4 w-4 mr-2" />
                {t('navigation.academics', 'Academics')}
              </TabsTrigger>
              <TabsTrigger value="attendance" className="min-w-[120px]">
                <Clipboard className="h-4 w-4 mr-2" />
                {t('navigation.attendance', 'Attendance')}
              </TabsTrigger>
              <TabsTrigger value="fees" className="min-w-[120px]">
                <CreditCard className="h-4 w-4 mr-2" />
                {t('parent_portal.dashboard.cards.pending_fees', 'Fees')}
              </TabsTrigger>
              <TabsTrigger value="messages" className="min-w-[120px]">
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('parent_portal.dashboard.shortcuts.messages', 'Messages')}
              </TabsTrigger>
            </TabsList>

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
              <ConnectedFeesTab childId={currentChild.id} fallbackFeeData={currentFeeData} />
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
