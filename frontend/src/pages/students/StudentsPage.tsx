"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import {
  Users,
  Search,
  Download,
  BarChart3,
  AlertCircle,
  Clock,
  Plus,
  Mail,
  Phone,
  X,
  Printer,
  Share2,
  Pencil,
  Trash,
  RefreshCw
} from "lucide-react";
import { VirtualizedTable } from '../../components/common/VirtualizedTable';
import { LazyImage } from '../../components/common/LazyImage';

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Avatar,
  AvatarFallback,
} from "../../components/ui/avatar";

// Student Components
import StudentGrid from "../../components/students/StudentGrid";
import { StudentImportExport } from "../../components/students/StudentImportExport";

// Hooks & Services
import {
  useStudents,
  useDeleteStudent,
  useStudentAnalyticsSummary
} from "../../hooks/useStudents";
import { useClasses } from "../../hooks/useClasses";
import { Student as ServiceStudent, TransformedStudent } from "../../types/student";
import type { Student as ApiStudent } from "../../types/student.types";
import StudentFormModal from "../../components/students/StudentFormModal";
import { useToast } from "../../components/ui/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "../../components/ui/dialog";
import StudentPrintView from '../../components/students/StudentPrintView';

// Add this to your imports
import { StudentProfile } from '../../types/student';

import { TouchFriendlyButton } from '../../components/common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ApiDebugPanel from '../../components/debug/ApiDebugPanel';
import { useTranslation } from 'react-i18next';
import { getNormalizedGradeLevel } from "../../utils/formatters";
import { getClassDisplayName } from '../../utils/formatters';
import { ADMIN_PRIMARY_BUTTON_CLASS, ADMIN_SECONDARY_BUTTON_CLASS } from "../../lib/adminUi";
import { resolveStudentAvatar } from '../../utils/avatar';
import studentService from "../../services/studentService";

export function StudentsPage() {
  const { t } = useTranslation();
  useTheme();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const navigate = useNavigate();
  const location = useLocation();
  
  // === State Management ===
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy] = useState("name");
  const [sortOrder] = useState("asc");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "detailed">(isMobile ? "grid" : "list");
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState("performance");
  const [currentPage] = useState(1);
  const [itemsPerPage] = useState(isMobile ? 5 : 10);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<ServiceStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<ServiceStudent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [printStudentData, setPrintStudentData] = useState<StudentProfile | null>(null);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] = useState(false);
  const isCreateRoute = location.pathname === '/students/new';

  // === Data Fetching ===
  const {
    data: studentsData,
    isLoading,
    isError,
    error,
    refetch
  } = useStudents({
    page: currentPage,
    per_page: itemsPerPage,
    ...(selectedGrade !== 'all'
      ? (() => {
          const classId = Number(selectedGrade);
          return Number.isFinite(classId) ? { class_id: classId } : {};
        })()
      : {}),
    ...(() => {
      const status = activeTab !== 'all' ? activeTab : selectedStatus !== 'All' ? selectedStatus : undefined;
      return status ? { status } : {};
    })(),
    ...(() => {
      const search = searchQuery.trim();
      return search ? { search } : {};
    })()
  });

  const { data: analyticsSummary } = useStudentAnalyticsSummary();
  const { data: classesResponse } = useClasses({ page: 1, per_page: 200 });

  // Mutations
  const { mutate: deleteStudent, isPending: isDeletingStudent } = useDeleteStudent();

  // Update view mode when screen size changes
  useEffect(() => {
    if (isMobile && viewMode === 'list') {
      setViewMode('grid');
    }
  }, [isMobile, viewMode]);

  useEffect(() => {
    if (isCreateRoute) {
      setSelectedStudentForEdit(null);
      setIsStudentFormOpen(true);
      return;
    }

    if (!selectedStudentForEdit) {
      setIsStudentFormOpen(false);
    }
  }, [isCreateRoute, selectedStudentForEdit]);

  // === Helper Functions and Handlers ===

  // Transform API student data to match component expectations
  const transformStudentData = (apiStudents: ApiStudent[]): TransformedStudent[] => {
    return apiStudents.map(student => ({
      classId: student.class_id,
      id: student.id.toString(),
      // Include all name fields from the API
      first_name: student.first_name,
      last_name: student.last_name,
      middle_name: student.middle_name || '',
      display_name: student.display_name,
      full_name: student.full_name,
      name: student.display_name || student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || "Unknown Student",
      studentId: student.admission_number,
      grade: student.class_name || getNormalizedGradeLevel(student) || "Unassigned",
      // Use real contact data with proper fallbacks
      email: student.email || "No email provided",
      phone: student.phone || student.telephone || "No phone provided",
      // Add gender property from the API
      gender: student.gender || "",
      // Use real attendance and performance data from backend
      attendance: student.attendance_percentage || 0,
      performance: student.performance_average || 0,
      status: student.status || "active",
      lastActive: (((student as any).updatedAt || (student as any).updated_at))
        ? `Updated ${new Date((student as any).updatedAt || (student as any).updated_at).toLocaleDateString()}`
        : student.created_at
          ? `Enrolled ${new Date(student.created_at).toLocaleDateString()}`
          : "No recent activity",
      updatedAt: (student as any).updatedAt || (student as any).updated_at || student.created_at,
      profileImage: resolveStudentAvatar(student) || "",
      recentGrades: [],
      subjects: [],
      pendingAssignments: Number((student as any).pending_assignments_count || 0),
      completedAssignments: Number((student as any).completed_assignments_count || 0),
      enrollmentDate: student.created_at ? new Date(student.created_at).toLocaleDateString() : "Unknown",
      parentInfo: {
        name: String(student.parent_name || student.father_name || student.mother_name || "").trim() || "No linked parent",
        email: String(student.parent_email || student.father_email || student.mother_email || "").trim() || "No parent email provided",
        phone: String(student.parent_phone || student.father_contact || student.mother_contact || "").trim() || "No parent phone provided"
      },
      parentLinked: Boolean(student.parent_id || student.parent_name || student.parent_email || student.parent_phone),
      riskLevel:
        (student.status && student.status !== 'active') ||
        (student.attendance_percentage || 0) < 70 ||
        (student.performance_average || 0) < 45
          ? 'urgent'
          : (student.attendance_percentage || 0) < 80 ||
              (student.performance_average || 0) < 60 ||
              !(student.parent_id || student.parent_name || student.parent_email || student.parent_phone)
            ? 'monitor'
            : 'on-track',
      achievements: [],
      attendanceHistory: [],
      performanceHistory: [],
      upcomingExams: [],
      notifications: []
    }));
  };

  // Transform the API data to the format expected by components
  const students: TransformedStudent[] = useMemo(
    () => (studentsData?.data ? transformStudentData(studentsData.data) : []),
    [studentsData?.data]
  );

  const classOptions = useMemo(() => {
    const classes = classesResponse?.data || [];
    return classes.map((classRecord) => ({
      value: String(classRecord.id),
      label: getClassDisplayName(classRecord)
    }));
  }, [classesResponse?.data]);

  const studentManagementSummary = useMemo(() => {
    const linkedParents = students.filter((student) => student.parentLinked).length;
    const urgentAttention = students.filter((student) => student.riskLevel === 'urgent').length;
    const missingContacts = students.filter(
      (student) => student.email === "No email provided" || student.phone === "No phone provided"
    ).length;
    const unassignedClasses = students.filter((student) => !student.classId).length;

    return {
      linkedParents,
      urgentAttention,
      missingContacts,
      unassignedClasses
    };
  }, [students]);
  
  // Calculate student statistics
  const calculateStudentStats = () => {
    const totalStudents = analyticsSummary?.total_students ?? studentsData?.pagination?.total ?? studentsData?.data?.length ?? 0;
    const avgAttendance = analyticsSummary?.average_attendance_rate;
    const avgPerformance = analyticsSummary?.average_performance_score;
    const atRiskCount = analyticsSummary?.at_risk_students_count;

    return [
      { name: t('students_page.total_students', 'Total Students'), value: String(totalStudents), icon: Users, color: "bg-blue-500" },
      { name: t('students_page.avg_attendance', 'Average Attendance'), value: typeof avgAttendance === 'number' ? `${Math.round(avgAttendance)}%` : "—", icon: Clock, color: "bg-emerald-500" },
      { name: t('students_page.avg_performance', 'Average Performance'), value: typeof avgPerformance === 'number' ? `${Math.round(avgPerformance)}%` : "—", icon: BarChart3, color: "bg-purple-500" },
      { name: t('students_page.at_risk_students', 'At-Risk Students'), value: typeof atRiskCount === 'number' ? String(atRiskCount) : "—", icon: AlertCircle, color: "bg-amber-500" },
    ];
  };

  // Sort and filter students
  const sortedStudents = students
    .filter((student: TransformedStudent) => {
      const matchesSearch =
        searchQuery === "" ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = selectedGrade === "all" || String(student.classId ?? '') === selectedGrade;
      const matchesStatus = selectedStatus === "All" || student.status === selectedStatus;
      const matchesTab = activeTab === "all" || student.status === activeTab;
      return matchesSearch && matchesGrade && matchesStatus && matchesTab;
    })
    .sort((a: TransformedStudent, b: TransformedStudent) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortBy === "name") {
        aValue = a.name;
        bValue = b.name;
      } else if (sortBy === "performance") {
        aValue = a.performance;
        bValue = b.performance;
      } else if (sortBy === "attendance") {
        aValue = a.attendance;
        bValue = b.attendance;
      } else {
        aValue = a.name;
        bValue = b.name;
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        const numA = aValue as number;
        const numB = bValue as number;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }
    });

  // Select a student to show in side panel
  const handleStudentSelect = (id: string) => {
    setSelectedStudent(id);
    setShowProfilePanel(true);
  };

  // Get selected student data
  const selectedStudentData: TransformedStudent | null = selectedStudent 
    ? students.find((s: TransformedStudent) => s.id === selectedStudent) || null 
    : null;

  const handleOpenCreateStudent = () => {
    setSelectedStudentForEdit(null);
    if (!isCreateRoute) {
      navigate('/students/new');
      return;
    }
    setIsStudentFormOpen(true);
  };

  const handleCloseStudentForm = () => {
    setIsStudentFormOpen(false);
    setSelectedStudentForEdit(null);
    if (isCreateRoute) {
      navigate('/students', { replace: true });
    }
  };

  // Quick actions (Add, Export, Print, Share)
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        handleOpenCreateStudent();
        break;
      case 'export':
        setIsImportExportDialogOpen(true);
        break;
      case 'print':
        if (selectedStudentData) {
          // Transform the selected student data to match StudentProfile format
          const studentProfile = {
            id: selectedStudentData.id,
            first_name: selectedStudentData.first_name || selectedStudentData.name?.split(' ')[0] || '',
            last_name: selectedStudentData.last_name || (selectedStudentData.name?.split(' ').slice(1).join(' ') || ''),
            display_name: selectedStudentData.display_name || selectedStudentData.name || '',
            full_name: selectedStudentData.full_name || selectedStudentData.name || '',
            email: selectedStudentData.email || '',
            phone: selectedStudentData.phone || '',
            admission_number: selectedStudentData.studentId || '',
            // Use properties from parentInfo object for parent details with fallbacks
            date_of_birth: new Date().toISOString(), // Default value as it's required
            gender: selectedStudentData.gender || '', // Default value as it's required
            address: '', // Default value
            class_name: selectedStudentData.grade || '',
            parent_name: selectedStudentData.parentInfo?.name || '',
            parent_email: selectedStudentData.parentInfo?.email || '',
            parent_phone: selectedStudentData.parentInfo?.phone || '',
            enrollment_date: selectedStudentData.enrollmentDate || new Date().toISOString(),
            status: selectedStudentData.status || 'Active',
            attendance_percentage: selectedStudentData.attendance || 0,
            performance_average: selectedStudentData.performance || 0,
            profile_picture: selectedStudentData.profileImage || ''
          };
          
          // Set the student profile for printing
          setPrintStudentData(studentProfile);
          setTimeout(() => {
            window.print();
          }, 100);
        } else {
          window.print();
        }
        break;
      case 'share':
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Share link copied to clipboard",
        });
        break;
      default:
        break;
    }
  };

  // Handle edit student
  const handleEditStudent = async (transformedStudent: TransformedStudent) => {
    // Find the original Student object from the API data
    const originalStudent = studentsData?.data?.find(
      (s: ApiStudent) => s.id.toString() === transformedStudent.id
    );
    
    if (originalStudent) {
      try {
        const fullStudentResponse = await studentService.getStudentById(Number(originalStudent.id));
        const fullStudent = fullStudentResponse?.data || originalStudent;
        const serviceStudent: ServiceStudent = {
          ...(fullStudent as ServiceStudent),
          name: fullStudent.name || `${fullStudent.first_name} ${fullStudent.last_name}`,
          gender: (fullStudent.gender as "male" | "female" | "other") || "other",
          created_at: fullStudent.created_at || new Date().toISOString()
        };
        setSelectedStudentForEdit(serviceStudent);
        setIsStudentFormOpen(true);
      } catch (error) {
        console.error('Failed to load full student record for editing:', error);
        toast({
          title: "Error",
          description: "Failed to load the full student record for editing.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle delete student
  const handleDeleteStudent = (transformedStudent: TransformedStudent) => {
    // Find the original Student object from the API data
    const originalStudent = studentsData?.data?.find(
      (s: ApiStudent) => s.id.toString() === transformedStudent.id
    );
    
    if (originalStudent) {
      // Convert ApiStudent to ServiceStudent format
      const serviceStudent: ServiceStudent = {
        ...originalStudent,
        name: originalStudent.name || `${originalStudent.first_name} ${originalStudent.last_name}`,
        gender: originalStudent.gender as "male" | "female" | "other", // Type assertion for gender
        created_at: originalStudent.created_at || new Date().toISOString() // Ensure created_at is provided
      };
      setStudentToDelete(serviceStudent);
      setIsDeleteDialogOpen(true);
    }
  };

  // Confirm delete student
  const confirmDeleteStudent = () => {
    if (studentToDelete) {
      deleteStudent(parseInt(studentToDelete.id.toString()), {
        onSuccess: () => {
          toast({
            title: "Student Deleted",
            description: `${studentToDelete.name} has been removed from the system.`,
          });
          
          // If the deleted student was selected, clear the selection
          if (selectedStudent === studentToDelete.id.toString()) {
            setSelectedStudent(null);
            setShowProfilePanel(false);
          }
          
          setIsDeleteDialogOpen(false);
          setStudentToDelete(null);
        },
        onError: (error: Error) => {
          console.error('Student deletion failed:', error.message);
          toast({
            title: "Error",
            description: "Failed to delete student. Please try again.",
            variant: "destructive",
          });
        }
      });
    }
  };

  // Define table columns for responsive table with correct priority types
  const columns = [
    { 
      header: 'Name', 
      accessor: (student: any) => (
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            {student.profileImage ? (
              <LazyImage 
                src={student.profileImage} 
                alt={student.name}
                className="w-full h-full rounded-full"
              />
            ) : (
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <div className="font-medium">{student.name}</div>
            <div className="text-sm text-gray-500">{student.studentId}</div>
          </div>
        </div>
      ),
      mobileLabel: 'Student',
      priority: 'high' as const,
      width: 200
    },
    { 
      header: 'Class', 
      accessor: (student: any) => {
        const gradeStr = student.grade || "Unassigned";
        let badgeColor = "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
        if (gradeStr.includes("KG") || gradeStr.includes("Phase 1") || gradeStr.includes("Nursery")) {
          badgeColor = "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800/30";
        } else if (gradeStr.includes("Grade 1") || gradeStr.includes("Grade 2") || gradeStr.includes("B1") || gradeStr.includes("B2")) {
          badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800/30";
        } else if (gradeStr.includes("Grade 3") || gradeStr.includes("Grade 4") || gradeStr.includes("B3") || gradeStr.includes("B4")) {
          badgeColor = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/30";
        } else if (gradeStr.includes("Grade 5") || gradeStr.includes("Grade 6") || gradeStr.includes("B5") || gradeStr.includes("B6")) {
          badgeColor = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800/30";
        } else if (gradeStr.includes("JHS") || gradeStr.includes("Junior")) {
          badgeColor = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800/30";
        } else if (gradeStr.includes("SHS") || gradeStr.includes("Senior")) {
          badgeColor = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/30";
        }

        return (
          <Badge variant="outline" className={`font-medium px-2 py-0.5 rounded ${badgeColor}`}>
            {gradeStr}
          </Badge>
        );
      },
      mobileLabel: 'Class',
      priority: 'medium' as const
    },
    { 
      header: 'Email', 
      accessor: (student: any) => student.email,
      mobileLabel: 'Email',
      priority: 'low' as const
    },
    { 
      header: 'Attendance', 
      accessor: (student: any) => (
        <div className="w-full">
          <div className="flex justify-between mb-1">
            <span className="text-sm">{student.attendance}%</span>
          </div>
          <Progress value={student.attendance} className="h-2" />
        </div>
      ),
      mobileLabel: 'Attendance',
      priority: 'medium' as const
    },
    { 
      header: 'Performance', 
      accessor: (student: any) => (
        <div className="w-full">
          <div className="flex justify-between mb-1">
            <span className="text-sm">{student.performance}%</span>
          </div>
          <Progress value={student.performance} className="h-2" />
        </div>
      ),
      mobileLabel: 'Performance',
      priority: 'medium' as const
    },
    { 
      header: 'Status', 
      accessor: (student: any) => (
        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
          {student.status}
        </Badge>
      ),
      mobileLabel: 'Status',
      priority: 'high' as const
    },
    { 
      header: 'Actions', 
      accessor: (student: any) => (
        <div className="flex space-x-2">
          <TouchFriendlyButton
            size="sm"
            variant="outline"
            onClick={() => handleEditStudent(student)}
            data-testid={`edit-student-${student.id}`}
          >
            <Pencil className="h-4 w-4" />
          </TouchFriendlyButton>
          <TouchFriendlyButton
            size="sm"
            variant="outline"
            onClick={() => handleDeleteStudent(student)}
            data-testid={`delete-student-${student.id}`}
          >
            <Trash className="h-4 w-4" />
          </TouchFriendlyButton>
        </div>
      ),
      mobileLabel: 'Actions',
      priority: 'high' as const
    }
  ];

  // === Render Functions ===
  const renderQuickActions = () => (
    <div className="flex flex-wrap gap-2">
      <TouchFriendlyButton
        size="sm"
        variant="primary"
        onClick={() => handleQuickAction('add')}
        className={`flex items-center gap-2 ${ADMIN_PRIMARY_BUTTON_CLASS}`}
      >
        <Plus className="h-4 w-4" />
        {t('students_page.add_student', 'Add Student')}
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction('export')}
        className={`flex items-center gap-2 ${ADMIN_SECONDARY_BUTTON_CLASS}`}
      >
        <Download className="h-4 w-4" />
        {t('common.export', 'Export')}
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction('print')}
        className={`flex items-center gap-2 ${ADMIN_SECONDARY_BUTTON_CLASS}`}
      >
        <Printer className="h-4 w-4" />
        {t('common.print', 'Print')}
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction('share')}
        className={`flex items-center gap-2 ${ADMIN_SECONDARY_BUTTON_CLASS}`}
      >
        <Share2 className="h-4 w-4" />
        {t('common.share', 'Share')}
      </TouchFriendlyButton>
    </div>
  );

  const renderSearchAndFilters = () => (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t('students_page.search_placeholder', 'Search students by name, email, or ID...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(e.target.value)}
          className="px-3 py-2 border rounded-md"
          data-testid="grade-filter"
        >
          <option value="all">{t('students_page.all_grades', 'All Classes')}</option>
          {classOptions.map((classOption) => (
            <option key={classOption.value} value={classOption.value}>
              {classOption.label}
            </option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border rounded-md"
          data-testid="status-filter"
        >
          <option value="All">{t('students_page.all_statuses', 'All Status')}</option>
          <option value="active">{t('common.active', 'Active')}</option>
          <option value="inactive">{t('common.inactive', 'Inactive')}</option>
          <option value="graduated">{t('common.graduated', 'Graduated')}</option>
        </select>
        <Button
          variant="outline"
          onClick={() => {
            setSearchQuery('');
            setSelectedGrade('all');
            setSelectedStatus('All');
            setActiveTab('all');
          }}
          className={ADMIN_SECONDARY_BUTTON_CLASS}
        >
          {t('common.reset', 'Reset')}
        </Button>
      </div>
    </div>
  );

  const renderManagementOverview = () => (
    <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('students_page.management_overview', 'Student Management Overview')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('students_page.management_desc', 'Track linked guardians, contact readiness, and students who need follow-up.')}
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} className={ADMIN_SECONDARY_BUTTON_CLASS}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-700">{t('students_page.linked_parents', 'Linked Parents')}</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{studentManagementSummary.linkedParents}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-700">{t('students_page.needs_follow_up', 'Needs Follow-up')}</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{studentManagementSummary.urgentAttention}</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
            <p className="text-sm font-medium text-rose-700">{t('students_page.missing_contact_data', 'Missing Contact Data')}</p>
            <p className="mt-1 text-2xl font-bold text-rose-900">{studentManagementSummary.missingContacts}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">{t('students_page.unassigned_classes', 'Unassigned Classes')}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{studentManagementSummary.unassignedClasses}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderViewModeToggle = () => (
    <div className="flex gap-2 mb-4">
      <TouchFriendlyButton
        size="sm"
        variant={viewMode === 'list' ? 'primary' : 'outline'}
        onClick={() => setViewMode('list')}
        disabled={isMobile}
      >
        {t('common.list', 'List')}
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant={viewMode === 'grid' ? 'primary' : 'outline'}
        onClick={() => setViewMode('grid')}
      >
        {t('common.grid', 'Grid')}
      </TouchFriendlyButton>
    </div>
  );

  const renderStudentProfile = () => {
    if (!selectedStudentData || !showProfilePanel) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('students_page.profile.title', 'Student Profile')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfilePanel(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <Avatar className="w-16 h-16">
              {selectedStudentData.profileImage ? (
                <LazyImage 
                  src={selectedStudentData.profileImage} 
                  alt={selectedStudentData.name}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <AvatarFallback className="text-lg">
                  {selectedStudentData.name.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">{selectedStudentData.name}</h3>
              <p className="text-gray-600 break-words">{selectedStudentData.studentId}</p>
              <Badge variant={selectedStudentData.status === 'active' ? 'default' : 'secondary'}>
                {selectedStudentData.status}
              </Badge>
            </div>
          </div>

          <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="performance" className="min-w-[130px]">{t('common.performance', 'Performance')}</TabsTrigger>
              <TabsTrigger value="attendance" className="min-w-[130px]">{t('navigation.attendance', 'Attendance')}</TabsTrigger>
              <TabsTrigger value="contact" className="min-w-[130px]">{t('students_page.profile.contact', 'Contact')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>{t('students_page.profile.overall_performance', 'Overall Performance')}</span>
                  <span className="font-semibold">{selectedStudentData.performance}%</span>
                </div>
                <Progress value={selectedStudentData.performance} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedStudentData.completedAssignments}</div>
                  <div className="text-sm text-gray-600">{t('students_page.profile.completed', 'Completed')}</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{selectedStudentData.pendingAssignments}</div>
                  <div className="text-sm text-gray-600">{t('students_page.profile.pending', 'Pending')}</div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="attendance" className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>{t('students_page.profile.attendance_rate', 'Attendance Rate')}</span>
                  <span className="font-semibold">{selectedStudentData.attendance}%</span>
                </div>
                <Progress value={selectedStudentData.attendance} className="h-3" />
              </div>
              <div className="text-sm text-gray-600">
                {selectedStudentData.lastActive}
              </div>
            </TabsContent>
            
            <TabsContent value="contact" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{selectedStudentData.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{selectedStudentData.phone}</span>
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">{t('students_page.profile.parent_info', 'Parent Information')}</h4>
                  <div className="space-y-2 text-sm">
                    <div>{t('students_page.profile.parent_name', 'Name')}: {selectedStudentData.parentInfo.name}</div>
                    <div>{t('auth.email', 'Email')}: {selectedStudentData.parentInfo.email}</div>
                    <div>{t('students_page.profile.parent_phone', 'Phone')}: {selectedStudentData.parentInfo.phone}</div>
                    <div>{t('students_page.profile.link_status', 'Link Status')}: {selectedStudentData.parentLinked ? t('students_page.profile.linked_to_parent', 'Linked to parent record') : t('students_page.profile.legacy_contact', 'Legacy contact only')}</div>
                    <div>{t('students_page.profile.attention_level', 'Attention Level')}: {selectedStudentData.riskLevel}</div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  };

  // === Main Render ===

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('students_page.loading_title', 'Loading students...')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('students_page.loading_desc', 'Fetching data from /api/v1/students')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isNetworkError = errorMessage.includes('Network Error') || errorMessage.includes('timeout');
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Unauthorized');
    
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('students_page.loading_error_title', 'Failed to Load Students')}</h3>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            
            {/* Detailed error information */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-red-800 mb-2">Troubleshooting Information:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• API Endpoint: /api/v1/students</li>
                <li>• Base URL: {import.meta.env.VITE_API_URL || '(Relative)'}</li>
                {isNetworkError && <li>• Check if the backend server is running</li>}
                {isAuthError && <li>• Authentication token may be expired</li>}
                <li>• Check browser console for detailed error logs</li>
              </ul>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button onClick={() => refetch()} variant="default">
                {t('common.try_again', 'Try Again')}
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                {t('common.refresh_page', 'Refresh Page')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('navigation.students', 'Students')}</h1>
            <p className="text-gray-600">{t('students_page.subtitle', 'Manage student records and academic information')}</p>
          </div>
          {renderQuickActions()}
        </div>
        
        <div className="space-y-6">
        {/* Student Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {calculateStudentStats().map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className="border border-slate-200 dark:border-slate-800 rounded-2xl hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.color} text-white shadow-sm`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filters */}
        {renderSearchAndFilters()}
        {renderManagementOverview()}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>{t('students_page.directory_title', 'Student Directory')}</CardTitle>
                <CardDescription>
                  {sortedStudents.length} {t('students_page.students_found', 'students found')}
                </CardDescription>
              </div>
              {renderViewModeToggle()}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">{t('students_page.all_students', 'All Students')}</TabsTrigger>
                <TabsTrigger value="active">{t('common.active', 'Active')}</TabsTrigger>
                <TabsTrigger value="inactive">{t('common.inactive', 'Inactive')}</TabsTrigger>
                <TabsTrigger value="graduated">{t('common.graduated', 'Graduated')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {viewMode === "list" ? (
                  <VirtualizedTable
                    data={sortedStudents}
                    columns={columns}
                    keyExtractor={(student) => student.id}
                    onRowClick={(student) => handleStudentSelect(student.id)}
                    containerHeight={600}
                    itemHeight={80}
                    emptyMessage={t('students_page.no_students_found', 'No students found')}
                    isLoading={isLoading}
                  />
                ) : (
                  <StudentGrid
                    students={sortedStudents}
                    selectedStudent={selectedStudent}
                    handleStudentSelect={handleStudentSelect}
                    handleEditStudent={handleEditStudent}
                    handleDeleteStudent={handleDeleteStudent}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="active" className="space-y-4">
                {viewMode === "list" ? (
                  <VirtualizedTable
                    data={sortedStudents.filter(s => s.status === "active")}
                    columns={columns}
                    keyExtractor={(student) => student.id}
                    onRowClick={(student) => handleStudentSelect(student.id)}
                    containerHeight={600}
                    itemHeight={80}
                    emptyMessage={t('students_page.no_active_students_found', 'No active students found')}
                    isLoading={isLoading}
                  />
                ) : (
                  <StudentGrid
                    students={sortedStudents.filter(s => s.status === "active")}
                    selectedStudent={selectedStudent}
                    handleStudentSelect={handleStudentSelect}
                    handleEditStudent={handleEditStudent}
                    handleDeleteStudent={handleDeleteStudent}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="inactive" className="space-y-4">
                {viewMode === "list" ? (
                  <VirtualizedTable
                    data={sortedStudents.filter(s => s.status === "inactive")}
                    columns={columns}
                    keyExtractor={(student) => student.id}
                    onRowClick={(student) => handleStudentSelect(student.id)}
                    containerHeight={600}
                    itemHeight={80}
                    emptyMessage={t('students_page.no_inactive_students_found', 'No inactive students found')}
                    isLoading={isLoading}
                  />
                ) : (
                  <StudentGrid
                    students={sortedStudents.filter(s => s.status === "inactive")}
                    selectedStudent={selectedStudent}
                    handleStudentSelect={handleStudentSelect}
                    handleEditStudent={handleEditStudent}
                    handleDeleteStudent={handleDeleteStudent}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="graduated" className="space-y-4">
                {viewMode === "list" ? (
                  <VirtualizedTable
                    data={sortedStudents.filter(s => s.status === "graduated")}
                    columns={columns}
                    keyExtractor={(student) => student.id}
                    onRowClick={(student) => handleStudentSelect(student.id)}
                    containerHeight={600}
                    itemHeight={80}
                    emptyMessage={t('students_page.no_graduated_students_found', 'No graduated students found')}
                    isLoading={isLoading}
                  />
                ) : (
                  <StudentGrid
                    students={sortedStudents.filter(s => s.status === "graduated")}
                    selectedStudent={selectedStudent}
                    handleStudentSelect={handleStudentSelect}
                    handleEditStudent={handleEditStudent}
                    handleDeleteStudent={handleDeleteStudent}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Student Profile Panel */}
        {renderStudentProfile()}

        {/* Student Form Modal */}
        <StudentFormModal
          isOpen={isStudentFormOpen}
          onClose={handleCloseStudentForm}
          student={selectedStudentForEdit ? {
            ...selectedStudentForEdit,
            // Ensure all optional string properties have fallback empty strings
            address: selectedStudentForEdit.address || '',
            place_of_birth: selectedStudentForEdit.place_of_birth || '',
            religious_denomination: selectedStudentForEdit.religious_denomination || '',
            surname: selectedStudentForEdit.surname || selectedStudentForEdit.last_name || '',
            date_of_birth: selectedStudentForEdit.date_of_birth || '',
            whatsapp: selectedStudentForEdit.whatsapp || '',
            postal_address: selectedStudentForEdit.postal_address || '',
            digital_address: selectedStudentForEdit.digital_address || '',
            city: selectedStudentForEdit.city || '',
            country: selectedStudentForEdit.country || '',
            residential_address: selectedStudentForEdit.residential_address || '',
            local_landmark: selectedStudentForEdit.local_landmark || '',
            special_circumstance: selectedStudentForEdit.special_circumstance || '',
            allergies: selectedStudentForEdit.allergies || '',
            medication: selectedStudentForEdit.medication || '',
            physician_name: selectedStudentForEdit.physician_name || '',
            physician_phone: selectedStudentForEdit.physician_phone || '',
            previous_school: selectedStudentForEdit.previous_school || '',
            previous_class: selectedStudentForEdit.previous_class || '',
            previous_team: selectedStudentForEdit.previous_team || '',
            previous_year: selectedStudentForEdit.previous_year || '',
            father_name: selectedStudentForEdit.father_name || '',
            father_email: selectedStudentForEdit.father_email || '',
            father_contact: selectedStudentForEdit.father_contact || '',
            father_address: selectedStudentForEdit.father_address || '',
            father_profession: selectedStudentForEdit.father_profession || '',
            father_workplace: selectedStudentForEdit.father_workplace || '',
            mother_name: selectedStudentForEdit.mother_name || '',
            mother_email: selectedStudentForEdit.mother_email || '',
            mother_contact: selectedStudentForEdit.mother_contact || '',
            mother_address: selectedStudentForEdit.mother_address || '',
            mother_profession: selectedStudentForEdit.mother_profession || '',
            mother_workplace: selectedStudentForEdit.mother_workplace || '',
            // Optional properties that might be undefined
            email: selectedStudentForEdit.email || '',
            phone: selectedStudentForEdit.phone || '',
            telephone: selectedStudentForEdit.telephone || '',
            middle_name: selectedStudentForEdit.middle_name || '',
            // Add required properties that are missing
            profile_image: '',
            class_name: selectedStudentForEdit.class_id ? `Grade ${selectedStudentForEdit.class_id}` : '',
            enrollment_date: selectedStudentForEdit.created_at || new Date().toISOString(),
            parent_name: selectedStudentForEdit.father_name || selectedStudentForEdit.mother_name || '',
            parent_phone: selectedStudentForEdit.father_contact || selectedStudentForEdit.mother_contact || '',
            parent_email: selectedStudentForEdit.father_email || selectedStudentForEdit.mother_email || '',
            profileImage: '',
            studentId: selectedStudentForEdit.admission_number || '',
            // Add the missing required parent_id property with proper typing
            parent_id: selectedStudentForEdit.parent_id || undefined,
            // Add required timestamp properties
            created_at: selectedStudentForEdit.created_at || new Date().toISOString(),
            // Add gender with proper type assertion
            gender: (selectedStudentForEdit.gender as "male" | "female" | "other") || "other",
            // Add required class_id property
            class_id: selectedStudentForEdit.class_id || 0,
            // Add status with proper type assertion
            status: (selectedStudentForEdit.status as "active" | "inactive" | "graduated" | "transferred") || "active"
          } : null}
          onSuccess={() => {
            handleCloseStudentForm();
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('students_page.delete_student_title', 'Delete Student')}</DialogTitle>
              <DialogDescription>
                {t('students_page.delete_student_confirm', 'Are you sure you want to delete')} {studentToDelete?.name}? {t('common.cannot_be_undone', 'This action cannot be undone.')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className={ADMIN_SECONDARY_BUTTON_CLASS}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteStudent}
                disabled={isDeletingStudent}
              >
                {isDeletingStudent ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import/Export Dialog */}
        <Dialog open={isImportExportDialogOpen} onOpenChange={setIsImportExportDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t('students_page.import_export_title', 'Import/Export Students')}</DialogTitle>
              <DialogDescription>
                {t('students_page.import_export_desc', 'Import students from CSV or export current student data.')}
              </DialogDescription>
            </DialogHeader>
            <StudentImportExport />
          </DialogContent>
        </Dialog>

        {/* Print View (Hidden) */}
        {printStudentData && (
          <div className="hidden print:block">
            <StudentPrintView student={printStudentData} />
          </div>
        )}
        </div>

        {/* Debug Panel - Only show in development */}
        {import.meta.env.MODE === 'development' && <ApiDebugPanel />}
      </div>
  );
}

export default StudentsPage;
