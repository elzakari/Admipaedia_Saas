// Top-level imports
import { useEffect, useMemo, useState } from "react";
import { Home, ChevronRight, AlertCircle, BarChart3, BookOpen, FileText, MessageSquare, Clipboard, CreditCard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { TouchFriendlyButton } from "../../components/common/TouchFriendlyButton";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import api from "../../lib/api";
import parentService from "../../services/parentService";

type ParentChild = any;

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [offlineMode, setOfflineMode] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const isMobile = useMediaQuery('(max-width: 640px)');
  
  // Modal states
  const [showIdCard, setShowIdCard] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [showMessageTeacher, setShowMessageTeacher] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showComposeMessage, setShowComposeMessage] = useState(false);

  const {
    data: children,
    isLoading,
    error
  } = useQuery({
    queryKey: ["parent-children"],
    queryFn: () => parentService.getMyChildren(),
    staleTime: 30_000
  });

  useEffect(() => {
    if (!selectedChild && children?.length) {
      setSelectedChild(String(children[0].id));
    }
  }, [children, selectedChild]);

  const currentChildRaw: ParentChild | null =
    (children || []).find((child: any) => String(child.id) === selectedChild) ??
    ((children || []).length > 0 ? (children as any)[0] : null);

  const childId = Number(currentChildRaw?.id);

  const { data: feeBalance } = useQuery({
    queryKey: ["student-fee-balance", childId],
    queryFn: async () => {
      const res = await api.get(`/finance/students/${childId}/balance`);
      return Number(res.data?.balance) || 0;
    },
    enabled: Number.isFinite(childId) && childId > 0,
    staleTime: 30_000
  });

  const currentChild = useMemo(() => {
    const firstName = currentChildRaw?.first_name || currentChildRaw?.firstName || '';
    const lastName = currentChildRaw?.last_name || currentChildRaw?.lastName || '';
    const safeName = currentChildRaw?.full_name || `${firstName} ${lastName}`.trim() || currentChildRaw?.name || 'Student';
    const admissionNumber = String(currentChildRaw?.admission_number || currentChildRaw?.admissionNumber || '');
    const emailBase = safeName.toLowerCase().replace(/\s+/g, ".");

    return {
      studentId: admissionNumber || String(currentChildRaw?.id ?? "0"),
      dob: String(currentChildRaw?.date_of_birth ?? currentChildRaw?.dateOfBirth ?? ""),
      email: currentChildRaw?.email || `${emailBase}@school.edu`,
      id: String(currentChildRaw?.id ?? "0"),
      name: safeName,
      photo: currentChildRaw?.profile_picture ?? currentChildRaw?.photo ?? "",
      age: typeof currentChildRaw?.age === "number" ? currentChildRaw.age : 0,
      gender: currentChildRaw?.gender ?? "Unknown",
      class: currentChildRaw?.class_name || (currentChildRaw?.class_id ? `Class ${currentChildRaw.class_id}` : "Unknown"),
      admissionNumber,
      dateOfBirth: String(currentChildRaw?.date_of_birth ?? currentChildRaw?.dateOfBirth ?? ""),
      bloodGroup: currentChildRaw?.blood_group ?? currentChildRaw?.bloodGroup ?? "Unknown",
      emergencyContact: currentChildRaw?.emergency_contact_phone ?? currentChildRaw?.emergencyContact ?? "Unknown",
      address: currentChildRaw?.address ?? "",
      medicalConditions: Array.isArray(currentChildRaw?.medicalConditions)
        ? currentChildRaw.medicalConditions
        : []
    };
  }, [currentChildRaw]);

  const currentAcademicData = useMemo(() => {
    const overallPercentage = Number(currentChildRaw?.grade_average) || 0;
    const overallGrade = overallPercentage >= 90 ? 'A+' : overallPercentage >= 80 ? 'A' : overallPercentage >= 70 ? 'B+' : overallPercentage >= 60 ? 'B' : overallPercentage >= 50 ? 'C+' : overallPercentage >= 40 ? 'C' : 'F';
    return {
      overallPercentage,
      overallGrade,
      overallGPA: Math.round((overallPercentage / 25) * 100) / 100,
      rank: null,
      subjects: [],
      recentExams: [],
      upcomingExams: [],
      attendance: Number(currentChildRaw?.attendance_rate) || 0,
      classTeacher: '',
      currentGrade: overallGrade
    };
  }, [currentChildRaw]);

  const currentAttendanceData = useMemo(() => {
    const percentage = Number(currentChildRaw?.attendance_rate) || 0;
    return {
      percentage,
      daysPresent: '',
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      attendancePercentage: percentage,
      monthlyAttendance: [],
      recentAbsences: []
    };
  }, [currentChildRaw]);

  const currentFeeData = useMemo(() => {
    const amount = Number(feeBalance) || 0;
    return {
      balance: amount,
      due: amount,
      paid: 0,
      total: 0,
      status: amount <= 0 ? 'paid' : 'pending'
    };
  }, [feeBalance]);
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

  

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-800">Loading Parent Portal</h1>
        <p className="text-gray-600 mt-2">Please wait while we load your children's information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Data Loading Error</h1>
        <p className="text-gray-600 mt-2">Unable to load parent data. Please try again later.</p>
        <TouchFriendlyButton className="mt-4" onClick={() => window.location.reload()}>
          Refresh Page
        </TouchFriendlyButton>
      </div>
    );
  }

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

  if (!currentChildRaw) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">No Children Found</h1>
        <p className="text-gray-600 mt-2">No children are linked to this parent account.</p>
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
          <span>Dashboard</span>
        </Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-indigo-900">My Children</span>
      </div>

      {/* Offline mode indicator */}
      {offlineMode && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>You are currently in offline mode. Changes will be saved locally and synced when you're back online.</span>
          </div>
        </div>
      )}

      {/* Page header with child selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white bg-opacity-30 p-4 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">My Children</h1>
          <p className="mt-1 text-sm text-indigo-700">
            Monitor your child's academic journey and school activities
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-[200px] glass-button-outline">
              <SelectValue placeholder="Select Child" />
            </SelectTrigger>
            <SelectContent>
              {(children || []).map((child: any) => (
                <SelectItem key={child.id} value={String(child.id)}>
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={child.profile_picture || child.photo} alt={String(child.full_name || child.name || '')} />
                      <AvatarFallback>{typeof (child.full_name || child.name) === 'string' ? String(child.full_name || child.name).charAt(0) : ''}</AvatarFallback>
                    </Avatar>
                    {(child.full_name || child.name || 'Student')} - {child.class_name || (child.class_id ? `Class ${child.class_id}` : 'Class')}
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
            Reports
          </TouchFriendlyButton>
          <TouchFriendlyButton 
            variant="outline" 
            className="flex items-center glass-button-outline"
            onClick={() => setShowMessageTeacher(true)}
            icon={<MessageSquare className="h-4 w-4" />}
            size={isMobile ? "lg" : "md"}
          >
            Message Teacher
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
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="academics" className="min-w-[120px]">
                <BookOpen className="h-4 w-4 mr-2" />
                Academics
              </TabsTrigger>
              <TabsTrigger value="attendance" className="min-w-[120px]">
                <Clipboard className="h-4 w-4 mr-2" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="fees" className="min-w-[120px]">
                <CreditCard className="h-4 w-4 mr-2" />
                Fees
              </TabsTrigger>
              <TabsTrigger value="messages" className="min-w-[120px]">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <DashboardTab 
                currentChild={currentChild}
                currentAcademicData={currentAcademicData}
                currentAttendanceData={currentAttendanceData}
                currentFeeData={currentFeeData}
                currentHomeworkData={[]}
                messagesData={[]}
                schoolEvents={[]}
              />
            </TabsContent>
            
            <TabsContent value="academics">
              <AcademicsTab childId={childId} />
            </TabsContent>
            
            <TabsContent value="attendance">
              <AttendanceTab childId={childId} />
            </TabsContent>

            <TabsContent value="fees">
              <ConnectedFeesTab childId={currentChild.id} fallbackFeeData={currentFeeData} />
            </TabsContent>
            
            <TabsContent value="messages">
              <MessagesTab onComposeClick={() => setShowComposeMessage(true)} />
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
