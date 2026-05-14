"use client";

import { useEffect, useState } from "react";
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
  Trash
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
  AvatarImage
} from "../../components/ui/avatar";

// Student Components
import StudentList from "../../components/students/StudentList";
import StudentGrid from "../../components/students/StudentGrid";
import StudentStats from "../../components/students/StudentStats";
import StudentFilters from "../../components/students/StudentFilters";
import { StudentImportExport } from "../../components/students/StudentImportExport";

// Dropdown & Tooltip Components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "../../components/ui/tooltip";

// Hooks & Services
import {
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useStudentAnalyticsSummary
} from "../../hooks/useStudents";
import { Student as ServiceStudent, TransformedStudent } from "../../types/student";
import type { Student as ApiStudent } from "../../types/student.types";
import StudentFormModal from "../../components/students/StudentFormModal";
import { useToast } from "../../components/ui/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "../../components/ui/dialog";
import StudentPrintView from '../../components/students/StudentPrintView';

// Add this to your imports
import { StudentProfile } from '../../types/student';

import { ResponsiveTable } from '../../components/common/ResponsiveTable';
import { TouchFriendlyButton } from '../../components/common/TouchFriendlyButton';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ApiDebugPanel from '../../components/debug/ApiDebugPanel';
import React from "react";

export function StudentsPage() {
  useTheme();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1023px)');
  
  // === State Management ===
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid" | "detailed">(isMobile ? "grid" : "list");
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState("performance");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 5 : 10);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<ServiceStudent | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<ServiceStudent | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [printStudentData, setPrintStudentData] = useState<StudentProfile | null>(null);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] = useState(false);

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
    ...(selectedGrade !== 'All'
      ? (() => {
          const classId = Number((selectedGrade.match(/\d+/) || [])[0]);
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

  // Mutations
  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const { mutate: deleteStudent, isPending: isDeletingStudent } = useDeleteStudent();

  // Update view mode when screen size changes
  useEffect(() => {
    if (isMobile && viewMode === 'list') {
      setViewMode('grid');
    }
  }, [isMobile, viewMode]);

  // === Helper Functions and Handlers ===

  // Transform API student data to match component expectations
  const transformStudentData = (apiStudents: ApiStudent[]): TransformedStudent[] => {
    return apiStudents.map(student => ({
      id: student.id.toString(),
      // Include all name fields from the API
      first_name: student.first_name,
      last_name: student.last_name,
      middle_name: student.middle_name || '',
      display_name: student.display_name,
      full_name: student.full_name,
      name: student.display_name || student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || "Unknown Student",
      studentId: student.admission_number,
      grade: student.class_id ? `Grade ${student.class_id}` : "Unassigned",
      // Use real contact data with proper fallbacks
      email: student.email || "No email provided",
      phone: student.phone || student.telephone || "No phone provided",
      // Add gender property from the API
      gender: student.gender || "",
      // Use real attendance and performance data from backend
      attendance: student.attendance_percentage || 0,
      performance: student.performance_average || 0,
      status: student.status || "active",
      lastActive: "Recently",
      profileImage: student.gender ? `https://randomuser.me/api/portraits/${student.gender === 'female' ? 'women' : 'men'}/${student.id % 100}.jpg` : "",
      recentGrades: [],
      subjects: [],
      pendingAssignments: 0,
      completedAssignments: 0,
      enrollmentDate: student.created_at ? new Date(student.created_at).toLocaleDateString() : "Unknown",
      parentInfo: {
        name: student.father_name || student.mother_name || "No parent name provided",
        email: student.father_email || student.mother_email || "No parent email provided",
        phone: student.father_contact || student.mother_contact || "No parent phone provided"
      },
      achievements: [],
      attendanceHistory: [],
      performanceHistory: [],
      upcomingExams: [],
      notifications: []
    }));
  };

  // Transform the API data to the format expected by components
  const students: TransformedStudent[] = studentsData?.data ? transformStudentData(studentsData.data) : [];
  
  // Calculate student statistics
  const calculateStudentStats = () => {
    const totalStudents = analyticsSummary?.total_students ?? studentsData?.pagination?.total ?? studentsData?.data?.length ?? 0;
    const avgAttendance = analyticsSummary?.average_attendance_rate;
    const avgPerformance = analyticsSummary?.average_performance_score;
    const atRiskCount = analyticsSummary?.at_risk_students_count;

    return [
      { name: "Total Students", value: String(totalStudents), icon: Users, color: "bg-blue-500" },
      { name: "Average Attendance", value: typeof avgAttendance === 'number' ? `${Math.round(avgAttendance)}%` : "—", icon: Clock, color: "bg-emerald-500" },
      { name: "Average Performance", value: typeof avgPerformance === 'number' ? `${Math.round(avgPerformance)}%` : "—", icon: BarChart3, color: "bg-purple-500" },
      { name: "At-Risk Students", value: typeof atRiskCount === 'number' ? String(atRiskCount) : "—", icon: AlertCircle, color: "bg-amber-500" },
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
      const matchesGrade = selectedGrade === "All" || student.grade === selectedGrade;
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

  // Handle sorting change
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Select a student to show in side panel
  const handleStudentSelect = (id: string) => {
    setSelectedStudent(id);
    setShowProfilePanel(true);
  };

  // Get selected student data
  const selectedStudentData: TransformedStudent | null = selectedStudent 
    ? students.find((s: TransformedStudent) => s.id === selectedStudent) || null 
    : null;

  // Pagination handler
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Quick actions (Add, Export, Print, Share)
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        setSelectedStudentForEdit(null);
        setIsStudentFormOpen(true);
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
  const handleEditStudent = (transformedStudent: TransformedStudent) => {
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
      setSelectedStudentForEdit(serviceStudent);
      setIsStudentFormOpen(true);
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
          
          // Remove from selected students if in bulk selection
          if (selectedStudents.includes(studentToDelete.id.toString())) {
            setSelectedStudents(selectedStudents.filter(id => id !== studentToDelete.id.toString()));
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

  // Handle bulk selection
  const handleSelectStudent = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents([...selectedStudents, id]);
    } else {
      setSelectedStudents(selectedStudents.filter(studentId => studentId !== id));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(sortedStudents.map((student: { id: string }) => student.id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedStudents.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to perform this action.",
        variant: "destructive",
      });
      return;
    }

    switch (action) {
      case 'export':
        // Filter only selected students for export
        const selectedStudentsData = students.filter((student: { id: string }) => 
          selectedStudents.includes(student.id)
        );
        
        // Create a simplified version for export
        const exportData = selectedStudentsData.map(student => ({
          name: student.name,
          id: student.studentId,
          grade: student.grade,
          email: student.email,
          phone: student.phone,
          status: student.status,
          attendance: `${student.attendance}%`,
          performance: `${student.performance}%`
        }));
        
        const headers = exportData && exportData.length > 0 ? Object.keys(exportData[0]!).join(',') : '';
        const csvData = exportData ? exportData.map(student => Object.values(student).join(',')).join('\n') : '';
        const csv = `${headers}\n${csvData}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'selected_students.csv';
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: "Export Successful",
          description: `${selectedStudents.length} student records exported to CSV`,
        });
        break;
      default:
        break;
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
      accessor: (student: any) => student.grade,
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
          >
            <Pencil className="h-4 w-4" />
          </TouchFriendlyButton>
          <TouchFriendlyButton
            size="sm"
            variant="outline"
            onClick={() => handleDeleteStudent(student)}
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
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Student
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction('export')}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction('print')}
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Print
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant="outline"
        onClick={() => handleQuickAction('share')}
        className="flex items-center gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </TouchFriendlyButton>
    </div>
  );

  const renderSearchAndFilters = () => (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search students by name, email, or ID..."
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
        >
          <option value="All">All Grades</option>
          <option value="Grade 1">Grade 1</option>
          <option value="Grade 2">Grade 2</option>
          <option value="Grade 3">Grade 3</option>
          <option value="Grade 4">Grade 4</option>
          <option value="Grade 5">Grade 5</option>
          <option value="Grade 6">Grade 6</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="graduated">Graduated</option>
        </select>
      </div>
    </div>
  );

  const renderViewModeToggle = () => (
    <div className="flex gap-2 mb-4">
      <TouchFriendlyButton
        size="sm"
        variant={viewMode === 'list' ? 'primary' : 'outline'}
        onClick={() => setViewMode('list')}
        disabled={isMobile}
      >
        List
      </TouchFriendlyButton>
      <TouchFriendlyButton
        size="sm"
        variant={viewMode === 'grid' ? 'primary' : 'outline'}
        onClick={() => setViewMode('grid')}
      >
        Grid
      </TouchFriendlyButton>
    </div>
  );

  const renderStudentProfile = () => {
    if (!selectedStudentData || !showProfilePanel) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Student Profile</CardTitle>
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
              <TabsTrigger value="performance" className="min-w-[130px]">Performance</TabsTrigger>
              <TabsTrigger value="attendance" className="min-w-[130px]">Attendance</TabsTrigger>
              <TabsTrigger value="contact" className="min-w-[130px]">Contact</TabsTrigger>
            </TabsList>
            
            <TabsContent value="performance" className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>Overall Performance</span>
                  <span className="font-semibold">{selectedStudentData.performance}%</span>
                </div>
                <Progress value={selectedStudentData.performance} className="h-3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedStudentData.completedAssignments}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{selectedStudentData.pendingAssignments}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="attendance" className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span>Attendance Rate</span>
                  <span className="font-semibold">{selectedStudentData.attendance}%</span>
                </div>
                <Progress value={selectedStudentData.attendance} className="h-3" />
              </div>
              <div className="text-sm text-gray-600">
                Last Active: {selectedStudentData.lastActive}
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
                  <h4 className="font-semibold mb-2">Parent Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>Name: {selectedStudentData.parentInfo.name}</div>
                    <div>Email: {selectedStudentData.parentInfo.email}</div>
                    <div>Phone: {selectedStudentData.parentInfo.phone}</div>
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
            <p className="text-gray-600">Loading students...</p>
            <p className="text-sm text-gray-500 mt-2">Fetching data from /api/v1/students</p>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Students</h3>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            
            {/* Detailed error information */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
              <h4 className="font-medium text-red-800 mb-2">Troubleshooting Information:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• API Endpoint: /api/v1/students</li>
                <li>• Base URL: {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</li>
                {isNetworkError && <li>• Check if the backend server is running</li>}
                {isAuthError && <li>• Authentication token may be expired</li>}
                <li>• Check browser console for detailed error logs</li>
              </ul>
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button onClick={() => refetch()} variant="default">
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Refresh Page
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
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600">Manage student records and academic information</p>
          </div>
          {renderQuickActions()}
        </div>
        
        <div className="space-y-6">
        {/* Student Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {calculateStudentStats().map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.color}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search and Filters */}
        {renderSearchAndFilters()}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Student Directory</CardTitle>
                <CardDescription>
                  {sortedStudents.length} students found
                </CardDescription>
              </div>
              {renderViewModeToggle()}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Students</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
                <TabsTrigger value="graduated">Graduated</TabsTrigger>
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
                    emptyMessage="No students found"
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
                    emptyMessage="No active students found"
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
                    emptyMessage="No inactive students found"
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
                    emptyMessage="No graduated students found"
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
          onClose={() => setIsStudentFormOpen(false)}
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
            setIsStudentFormOpen(false);
            setSelectedStudentForEdit(null);
          }}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Student</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {studentToDelete?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteStudent}
                disabled={isDeletingStudent}
              >
                {isDeletingStudent ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import/Export Dialog */}
        <Dialog open={isImportExportDialogOpen} onOpenChange={setIsImportExportDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Import/Export Students</DialogTitle>
              <DialogDescription>
                Import students from CSV or export current student data.
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
