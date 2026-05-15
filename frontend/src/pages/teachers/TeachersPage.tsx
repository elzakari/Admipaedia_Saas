import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  Download,
  Filter,
  Home,
  ChevronRight
} from 'lucide-react';

// Import UI components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Avatar } from '../../components/ui/avatar';
import { Pagination } from '../../components/ui/pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

// Import teacher components
// Remove TeachersList import
import { TeacherDashboardTab } from './components/TeacherDashboardTab';
// import { TeachersList } from './components/TeachersList'; // Remove this line
import { TeachersGrid } from './components/TeachersGrid';
import { TeacherFilters } from './components/TeacherFilters';
import { TeacherFormModal } from './components/TeacherFormModal';
import { BulkOperations } from './components/BulkOperations';
import { EnhancedTeacherDashboard } from './components/EnhancedTeacherDashboard';

// For specialized features, import from shared components
import { TeacherDashboardAnalytics } from '../../components/teachers/TeacherDashboardAnalytics';
import { AssignmentManagement } from '../../components/teachers/AssignmentManagement';

// Import hooks and services
import { useTeachers, useCreateTeacher, useUpdateTeacher, useDeleteTeacher } from '../../hooks/useTeachers';
import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import useOffline from '../../hooks/useOffline';
import teacherService from '@/services/teacherService';
import timetableService from '../../services/timetableService';
import api from '../../lib/api';

// Import types
import { Teacher } from '../../types/teacher.types';

// Updated interface with specialization property
interface TeacherFiltersType {
  department?: string;
  subject?: string;
  status?: string;
  experience?: string;
  qualification?: string;
  specialization?: string; // Added missing property
  search?: string;
}

// Loading Component
const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center gap-3">
      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
      <span className="text-gray-600">{message}</span>
    </div>
  </div>
);

// Error Component
const ErrorDisplay: React.FC<{ error: any; onRetry?: () => void; title?: string }> = ({ 
  error, 
  onRetry, 
  title = 'Error' 
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-4">{error?.message || 'An error occurred'}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    )}
  </div>
);

// Empty State Component
const EmptyState: React.FC<{ 
  icon: React.ComponentType<any>; 
  title: string; 
  description: string; 
  action?: React.ReactNode 
}> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <Icon className="w-16 h-16 text-gray-400 mb-4" />
    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6 max-w-md">{description}</p>
    {action}
  </div>
);

const TeachersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // State variables - Remove viewMode state
  const [activeTab, setActiveTab] = useState<string>('management');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [perPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<Teacher[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [actionTeacher, setActionTeacher] = useState<Teacher | null>(null);
  const [assignClassId, setAssignClassId] = useState<string>('');
  const [timetable, setTimetable] = useState<any>(null);
  const [profileTeacher, setProfileTeacher] = useState<any>(null);
  const [profileClasses, setProfileClasses] = useState<any[]>([]);
  const [profileSubjects, setProfileSubjects] = useState<any[]>([]);
  const [classesCatalog, setClassesCatalog] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);

  const days = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], [])

  useEffect(() => {
    if (!profileOpen || !actionTeacher) return
    setProfileTeacher(null)
    setProfileClasses([])
    setProfileSubjects([])

    teacherService.getTeacherById(actionTeacher.id)
      .then((t) => setProfileTeacher(t))
      .catch(() => setProfileTeacher(actionTeacher))

    teacherService.getTeacherClasses(actionTeacher.id, { page: 1, per_page: 50 })
      .then((res) => setProfileClasses(res?.classes || []))
      .catch(() => setProfileClasses([]))

    teacherService.getTeacherSubjects(actionTeacher.id)
      .then((res) => setProfileSubjects(Array.isArray(res) ? res : []))
      .catch(() => setProfileSubjects([]))
  }, [profileOpen, actionTeacher])

  useEffect(() => {
    if (!assignOpen) return
    api.get('/classes', { params: { per_page: 200 } })
      .then((res) => setClassesCatalog(res.data?.classes || []))
      .catch(() => setClassesCatalog([]))
  }, [assignOpen])

  useEffect(() => {
    if (!assignOpen || !actionTeacher) return
    teacherService.getTeacherClasses(actionTeacher.id, { page: 1, per_page: 50 })
      .then((res) => setProfileClasses(res?.classes || []))
      .catch(() => setProfileClasses([]))
  }, [assignOpen, actionTeacher])

  useEffect(() => {
    if (!scheduleOpen) return
    api.get('/timetable/periods')
      .then((res) => setPeriods(res.data?.data || []))
      .catch(() => setPeriods([]))
  }, [scheduleOpen])
  const [filters, setFilters] = useState<TeacherFiltersType>({
    specialization: searchParams.get('specialization') || '',
    status: searchParams.get('status') || '',
    search: searchParams.get('search') || ''
  });

  // Data fetching - Add explicit typing
  const {
    data: teachersResponse,
    isLoading: isLoadingTeachers,
    error: teachersError,
    refetch: refetchTeachers
  } = useTeachers({
    page,
    per_page: perPage,
    status: filters.status as 'active' | 'inactive' | 'on_leave' | undefined,
    specialization: filters.specialization,
    search: searchQuery
  });

  // Mutations
  const { mutate: createTeacher } = useCreateTeacher();
  const { mutate: updateTeacher } = useUpdateTeacher();
  const { mutate: deleteTeacher } = useDeleteTeacher();

  // Derived state - Fixed data structure access
  const teachers = teachersResponse?.teachers || [];
  const totalTeachers = teachersResponse?.pagination?.total || 0;

  // Missing handleRefresh function
  const handleRefresh = useCallback(async () => {
    try {
      await refetchTeachers();
      toast.success('Teachers list refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh teachers list');
    }
  }, [refetchTeachers]);

  // Missing handleTeacherSubmit function
  const handleFormSubmit = useCallback(async (data: Partial<Teacher>) => {
    if (selectedTeacher) {
      // Update existing teacher - ensure data matches TeacherUpdate type
      const updateData = {
        first_name: data.firstName || selectedTeacher.firstName,
        last_name: data.lastName || selectedTeacher.lastName,
        employee_id: data.employeeId || selectedTeacher.employeeId,
        phone_number: data.phone || selectedTeacher.phone,
        joining_date: data.joinDate || selectedTeacher.joinDate,
        email: data.email || selectedTeacher.email,
        specialization: data.specialization || selectedTeacher.specialization,
        status: data.status || selectedTeacher.status
      };
      
      updateTeacher(
        { id: selectedTeacher.id, data: updateData },
        {
          onSuccess: () => {
            toast.success('Teacher updated successfully');
            setIsEditModalOpen(false);
            setSelectedTeacher(null);
            refetchTeachers();
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to update teacher');
          }
        }
      );
    } else {
      // Create new teacher - ensure data matches TeacherCreate type
      const createData = {
        first_name: data.firstName!,
        last_name: data.lastName!,
        employee_id: data.employeeId!,
        phone_number: data.phone || '',
        joining_date: data.joinDate || new Date().toISOString().split('T')[0],
        email: data.email!,
        specialization: data.specialization || '',
        status: data.status || 'active'
      };
      
      createTeacher(
        createData,
        {
          onSuccess: () => {
            toast.success('Teacher created successfully');
            setIsAddModalOpen(false);
            refetchTeachers();
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to create teacher');
          }
        }
      );
    }
  }, [selectedTeacher, updateTeacher, createTeacher, refetchTeachers]);

  // Event handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setFilters((prev) => ({ ...prev, search: query || undefined }));
    setPage(1);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (query) {
        newParams.set('search', query);
      } else {
        newParams.delete('search');
      }
      newParams.set('page', '1');
      return newParams;
    });
  }, [setSearchParams]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', newPage.toString());
      return newParams;
    });
  }, [setSearchParams]);

  const handleTeacherSelect = useCallback((teacherId: string | number) => {
    const teacher = teachers.find((t: { id: string | number; }) => t.id === teacherId);
    if (teacher) {
      setSelectedTeacherId(teacher.id);
      setSelectedTeacher(teacher);
    }
  }, [teachers]);

  const handleTeacherEdit = useCallback((teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsEditModalOpen(true);
  }, []);

  const handleTeacherDelete = useCallback((teacherId: string | number) => {
    const teacher = teachers.find((t: { id: string | number; }) => t.id === teacherId);
    if (teacher) {
      setTeacherToDelete(teacher);
      setIsDeleteDialogOpen(true);
    }
  }, [teachers]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!teacherToDelete) return;
    
    deleteTeacher(
      teacherToDelete.id,
      {
        onSuccess: () => {
          toast.success('Teacher deleted successfully');
          setIsDeleteDialogOpen(false);
          setTeacherToDelete(null);
          refetchTeachers();
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to delete teacher');
        }
      }
    );
  }, [teacherToDelete, deleteTeacher, refetchTeachers]);

  const handleFiltersChange = useCallback((newFilters: TeacherFiltersType) => {
    setFilters(newFilters);
    setPage(1);
    if (typeof newFilters.search === 'string') {
      setSearchQuery(newFilters.search);
    }
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (newFilters.search) newParams.set('search', newFilters.search);
      else newParams.delete('search');
      if (newFilters.status) newParams.set('status', newFilters.status);
      else newParams.delete('status');
      if (newFilters.specialization) newParams.set('specialization', newFilters.specialization);
      else newParams.delete('specialization');
      newParams.set('page', '1');
      return newParams;
    });
  }, [setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery('');
    setPage(1);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('search');
      newParams.delete('status');
      newParams.delete('specialization');
      newParams.set('page', '1');
      return newParams;
    });
  }, [setSearchParams]);

  const handleBulkDelete = useCallback(async (teacherIds: number[]) => {
    try {
      await Promise.all(teacherIds.map(id => teacherService.deleteTeacher(id)));
      toast.success(`${teacherIds.length} teachers deleted successfully`);
      setSelectedTeachers([]);
      refetchTeachers();
    } catch (error) {
      toast.error('Failed to delete selected teachers');
    }
  }, [refetchTeachers]);

  const handleBulkExport = useCallback((teacherIds: number[]) => {
    const selectedData = teachers.filter(t => teacherIds.includes(t.id));
    const csvContent = 'First Name,Last Name,Employee ID,Email,Phone,Specialization,Status\n' +
      selectedData.map(t => 
        `"${t.firstName}","${t.lastName}","${t.employeeId}","${t.email}","${t.phone || ''}","${t.specialization || ''}","${t.status}"`
      ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Teachers exported successfully');
  }, [teachers]);

  const handleBulkStatusUpdate = useCallback(async (teacherIds: number[], status: string) => {
    try {
      await Promise.all(teacherIds.map(id => teacherService.updateTeacherStatus(id, status as any)));
      toast.success(`Status updated for ${teacherIds.length} teachers`);
      setSelectedTeachers([]);
      refetchTeachers();
    } catch (error) {
      toast.error('Failed to update status for selected teachers');
    }
  }, [refetchTeachers]);

  const handleTeacherSelection = useCallback((teacher: Teacher, isSelected: boolean) => {
    if (isSelected) {
      setSelectedTeachers(prev => [...prev, teacher]);
    } else {
      setSelectedTeachers(prev => prev.filter(t => t.id !== teacher.id));
    }
  }, []);

  const handleViewProfile = useCallback((teacher: Teacher) => {
    setActionTeacher(teacher);
    setProfileOpen(true);
  }, []);

  const handleAssignClasses = useCallback((teacher: Teacher) => {
    setActionTeacher(teacher);
    setAssignClassId('');
    setAssignOpen(true);
  }, []);

  const handleViewSchedule = useCallback((teacher: Teacher) => {
    setActionTeacher(teacher);
    setTimetable(null);
    setScheduleOpen(true);
    timetableService
      .getTeacherTimetable(teacher.id)
      .then((t) => setTimetable(t))
      .catch(() => toast.error('Failed to load teacher timetable'));
  }, []);

  // Early returns for loading and error states
  if (isLoadingTeachers && teachers.length === 0) {
    return <LoadingState message="Loading teachers..." />;
  }

  if (teachersError && teachers.length === 0) {
    return (
      <ErrorDisplay 
        error={teachersError} 
        onRetry={handleRefresh}
        title="Failed to load teachers"
      />
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Teachers
            </h1>
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Teacher
            </Button>
          </div>
          
          {/* Search and Controls - Remove view mode toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {totalTeachers} teachers found
              </span>
              {!isOnline && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Offline
                </Badge>
              )}
              
              {/* Filters Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
              
              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoadingTeachers}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingTeachers ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="mt-4">
              <TeacherFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
              />
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="management">Management</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="management" className="mt-6">
              {/* Bulk Operations */}
              {selectedTeachers.length > 0 && (
                <div className="mb-4">
                  <BulkOperations
                    selectedTeachers={selectedTeachers}
                    onClearSelection={() => setSelectedTeachers([])}
                    onBulkDelete={() => handleBulkDelete(selectedTeachers.map(t => t.id))}
                    onBulkExport={() => handleBulkExport(selectedTeachers.map(t => t.id))}
                    onBulkStatusUpdate={(teacherIds, status) => handleBulkStatusUpdate(teacherIds, status)}
                  />
                </div>
              )}
              
              {/* Teachers Display - Use only TeachersGrid */}
              {isLoadingTeachers ? (
                <LoadingState message="Loading teachers..." />
              ) : teachersError ? (
                <ErrorDisplay 
                  error={teachersError} 
                  onRetry={handleRefresh}
                  title="Failed to load teachers"
                />
              ) : teachers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No teachers found"
                  description="Get started by adding your first teacher or adjust your search filters."
                  action={
                    <Button onClick={() => setIsAddModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Teacher
                    </Button>
                  }
                />
              ) : (
                <TeachersGrid
                  teachers={teachers}
                  selectedTeachers={selectedTeachers}
                  onSelectTeacher={handleTeacherSelect}
                  onEditTeacher={handleTeacherEdit}
                  onDeleteTeacher={handleTeacherDelete}
                  onTeacherSelect={handleTeacherSelection}
                  showBulkSelect={true}
                  isLoading={isLoadingTeachers}
                  error={teachersError}
                  onViewProfile={handleViewProfile}
                  onAssignClasses={handleAssignClasses}
                  onViewSchedule={handleViewSchedule}
                />
              )}
              
              {/* Pagination */}
              {teachers.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(totalTeachers / perPage)}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="dashboard" className="mt-6">
              {selectedTeacher ? (
                <TeacherDashboardTab 
                  teacher={selectedTeacher} 
                  classesCount={5} 
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Select a teacher to view dashboard
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <TeacherDashboardAnalytics teacherId={selectedTeacher?.id || 0} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Replace custom modals with proper TeacherFormModal */}
      <TeacherFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <TeacherFormModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {teacherToDelete?.firstName} {teacherToDelete?.lastName}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setTeacherToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Teacher profile</DialogTitle>
            <DialogDescription>Overview, assignments, and quick actions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="text-sm font-medium">
                  {profileTeacher?.full_name || `${profileTeacher?.first_name || profileTeacher?.firstName || ''} ${profileTeacher?.last_name || profileTeacher?.lastName || ''}`.trim()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Employee ID</div>
                <div className="text-sm font-medium">{profileTeacher?.employee_id || profileTeacher?.employeeId || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-sm font-medium">{profileTeacher?.email || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="text-sm font-medium">{profileTeacher?.phone_number || profileTeacher?.phone || profileTeacher?.phoneNumber || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Specialization</div>
                <div className="text-sm font-medium">{profileTeacher?.specialization || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Status</div>
                <div className="text-sm font-medium">{profileTeacher?.status || '—'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium mb-2">Assigned classes</div>
                {profileClasses.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No classes assigned.</div>
                ) : (
                  <div className="space-y-1">
                    {profileClasses.map((c: any) => (
                      <div key={c.id} className="text-sm">{c.name || `Class ${c.id}`}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium mb-2">Assigned subjects</div>
                {profileSubjects.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No subjects assigned.</div>
                ) : (
                  <div className="space-y-1">
                    {profileSubjects.map((s: any) => (
                      <div key={s.id} className="text-sm">{s.name || `Subject ${s.id}`}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProfileOpen(false)}>Close</Button>
            <Button variant="outline" onClick={() => {
              if (!actionTeacher) return;
              setProfileOpen(false);
              handleAssignClasses(actionTeacher);
            }}>Assign Classes</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
              if (!actionTeacher) return;
              setProfileOpen(false);
              handleViewSchedule(actionTeacher);
            }}>View Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Assign classes</DialogTitle>
            <DialogDescription>Assign this teacher as a class teacher.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <Select value={assignClassId} onValueChange={setAssignClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classesCatalog.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name || `Class ${c.id}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!actionTeacher || !assignClassId}
                  onClick={async () => {
                    if (!actionTeacher) return
                    try {
                      await teacherService.assignClass(actionTeacher.id, { class_id: Number(assignClassId) })
                      toast.success('Class assigned')
                      const res = await teacherService.getTeacherClasses(actionTeacher.id, { page: 1, per_page: 50 })
                      setProfileClasses(res?.classes || [])
                      setAssignClassId('')
                    } catch (e: any) {
                      toast.error(e?.response?.data?.message || 'Failed to assign class')
                    }
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium mb-2">Currently assigned</div>
              {profileClasses.length === 0 ? (
                <div className="text-sm text-muted-foreground">No assigned classes.</div>
              ) : (
                <div className="space-y-2">
                  {profileClasses.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-3">
                      <div className="text-sm">{c.name || `Class ${c.id}`}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          if (!actionTeacher) return
                          try {
                            await teacherService.removeClassAssignment(actionTeacher.id, Number(c.id))
                            toast.success('Class unassigned')
                            const res = await teacherService.getTeacherClasses(actionTeacher.id, { page: 1, per_page: 50 })
                            setProfileClasses(res?.classes || [])
                          } catch (e: any) {
                            toast.error(e?.response?.data?.message || 'Failed to unassign class')
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Teacher timetable</DialogTitle>
            <DialogDescription>Weekly schedule based on allocated timetable slots.</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            {periods.length === 0 ? (
              <div className="text-sm text-muted-foreground">Loading periods…</div>
            ) : !timetable ? (
              <div className="text-sm text-muted-foreground">Loading timetable…</div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="p-3 text-left font-medium">Time</th>
                    {days.map((d) => (
                      <th key={d} className="p-3 text-left font-medium">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p: any) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 whitespace-nowrap font-medium">{p.start} - {p.end}</td>
                      {days.map((d) => {
                        const cell = timetable?.[d]?.[p.id]
                        return (
                          <td key={d} className="p-3 align-top">
                            {cell ? (
                              <div className="rounded-lg border bg-muted p-3">
                                <div className="font-medium">{cell.subject}</div>
                                <div className="text-xs text-muted-foreground mt-1">{cell.class}</div>
                                <div className="text-xs text-muted-foreground mt-1">{cell.room ? `Room: ${cell.room}` : ''}</div>
                              </div>
                            ) : (
                              <div className="h-14 rounded-lg border border-dashed" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersPage;
