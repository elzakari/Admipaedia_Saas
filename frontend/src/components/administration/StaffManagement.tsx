import React, { useEffect, useMemo, useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "../../components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { 
  Users, 
  PlusCircle, 
  Search, 
  Download,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  GraduationCap,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Award,
  PieChart,
  Loader2
} from 'lucide-react';
import { TeacherFormModal } from '../teachers/TeacherFormModal';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { 
  useTeachers, 
  useTeacher
} from '../../hooks/useTeachers';
// Update imports to use only teacher.types.ts
import { 
  Teacher, 
  TeacherClass,
  Qualification,
  ScheduleItem
} from '../../types/teacher.types';
import departmentService, { Department as ApiDepartment } from '../../services/departmentService';
import staffService, { StaffRecord, StaffDirectoryItem } from '../../services/staffService';

// Remove these conflicting local interface declarations:
// interface Qualification {
//   degree: string;
//   institution: string;
//   year: string;
// }

// interface ScheduleItem {
//   day: string;
//   time: string;
//   subject: string;
//   class: string;
// }

// Keep the rest of the interfaces that don't conflict
interface StaffMember {
  id: number;
  name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'on_leave';
}

type DirectoryEntityType = 'teacher' | 'staff';

interface Department {
  id: number;
  name: string;
  code?: string;
  description?: string;
  staff_count?: number;
  head?: { id: number; name?: string; email?: string };
  is_active: boolean;
}

interface AttendanceRecord {
  id: number;
  name: string;
  position: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

interface SummaryStats {
  totalStaff: number;
  activeStaff: number;
  departments: number;
  avgAttendance: number;
  teachingStaff: number;
  administrativeStaff: number;
  message?: string;
}

// Create a proper extension interface that doesn't conflict
interface EnhancedTeacher extends Omit<Teacher, 'qualifications' | 'schedule'> {
  qualifications?: Qualification[];
  schedule?: ScheduleItem[];
  displayName?: string;
}

const StaffManagement: React.FC = () => {
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedStaffType, setSelectedStaffType] = useState<DirectoryEntityType | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  // Add the missing activeTab state
  const [activeTab, setActiveTab] = useState<string>('directory');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffRecord | null>(null);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaffRecord, setEditingStaffRecord] = useState<StaffRecord | null>(null);
  const [staffForm, setStaffForm] = useState<Partial<StaffRecord> & { email?: string }>({
    first_name: '',
    last_name: '',
    job_title: '',
    phone_number: '',
    address: '',
    joining_date: '',
    gender: 'other',
    email: '',
    department_id: undefined,
  });

  const exportCsv = (filename: string, rows: Array<Record<string, any>>) => {
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      const needs = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needs ? `"${escaped}"` : escaped;
    };
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  
  // Fetch teachers data
  const { 
    data: teachersData, 
    isLoading: isLoadingTeachers, 
    error: teachersError 
  } = useTeachers({
    page,
    per_page: perPage,
    ...(searchTerm ? { search: searchTerm } : {})
  });
  
  // Fix useTeacher hook - provide all required parameters
  const { 
    data: selectedTeacher, 
    isLoading: isLoadingSelectedTeacher 
  } = useTeacher(
    selectedStaff?.toString() || null, // selectedTeacherId
    { enabled: !!selectedStaff && selectedStaffType === 'teacher' }, // options object
    selectedStaff || 0 // teacherId
  );

  const { data: directoryResponse, isLoading: isLoadingDirectory, error: directoryError } = useQuery({
    queryKey: ['staff-directory', searchTerm],
    queryFn: () => staffService.getDirectory(searchTerm || undefined),
    staleTime: 30_000
  });

  const { data: selectedStaffRecord, isLoading: isLoadingSelectedStaffRecord } = useQuery({
    queryKey: ['staff-detail', selectedStaff],
    queryFn: () => staffService.getStaffById(selectedStaff || 0),
    enabled: !!selectedStaff && selectedStaffType === 'staff',
    staleTime: 30_000
  });
  
  const { data: departmentsData, isLoading: isLoadingDepartments, error: departmentsError } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getOperationalDepartments(),
    staleTime: 60_000
  });

  const departments: Department[] = ((departmentsData || []) as ApiDepartment[]).map((d: any) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description,
    staff_count: d.staff_count,
    head: d.head,
    is_active: !!d.is_active
  }));
  
  const directoryRows: StaffDirectoryItem[] = useMemo(() => {
    return directoryResponse?.directory || [];
  }, [directoryResponse?.directory]);
  
  // Enhanced summary stats with all required properties
  const summaryStats: SummaryStats = useMemo(() => {
    const totalStaff = directoryResponse?.summary?.total || directoryRows.length;
    const activeStaff = directoryResponse?.summary?.active || directoryRows.filter((row) => row.status === 'active').length;
    const teachingStaff = directoryResponse?.summary?.teachers || directoryRows.filter((row) => row.entity_type === 'teacher').length;
    const administrativeStaff = directoryResponse?.summary?.staff || directoryRows.filter((row) => row.entity_type === 'staff').length;
    const attendanceSummary = monthlyAttendanceQuery.data?.summary || [];
    const avgAttendance = attendanceSummary.length > 0
      ? Math.round(attendanceSummary.reduce((sum: number, row: AttendanceRecord) => sum + row.attendanceRate, 0) / attendanceSummary.length)
      : 0;
    
    return {
      totalStaff,
      activeStaff,
      departments: departments.length,
      avgAttendance,
      teachingStaff,
      administrativeStaff,
      message: 'Staff data loaded successfully'
    };
  }, [departments.length, directoryResponse?.summary, directoryRows, monthlyAttendanceQuery.data?.summary]);

  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: '', code: '', description: '', head_id: '', is_active: true });

  const createDepartmentMutation = useMutation({
    mutationFn: (payload: Partial<ApiDepartment>) => departmentService.createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department saved');
      setDepartmentDialogOpen(false);
    },
    onError: () => toast.error('Failed to save department')
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: (payload: Partial<ApiDepartment> & { id: number }) => departmentService.updateDepartment(payload as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated');
      setDepartmentDialogOpen(false);
    },
    onError: () => toast.error('Failed to update department')
  });

  const [attendanceMarkDialogOpen, setAttendanceMarkDialogOpen] = useState(false);
  const [attendanceDetailDialogOpen, setAttendanceDetailDialogOpen] = useState(false);
  const [attendanceSelectedId, setAttendanceSelectedId] = useState<number | null>(null);
  const [attendanceSelectedType, setAttendanceSelectedType] = useState<DirectoryEntityType>('teacher');

  const [attendanceMonth, setAttendanceMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))
  type AttendanceStatus = 'present' | 'absent' | 'late'
  type AttendanceRecordItem = { id: number; entity_type: DirectoryEntityType; entity_id: number; entity_key: string; date: string; status: AttendanceStatus; note?: string | null }

  const [attendanceForm, setAttendanceForm] = useState<{ date: string; status: AttendanceStatus; note: string }>({
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
    note: ''
  })

  const monthlyAttendanceQuery = useQuery({
    queryKey: ['staff-attendance', attendanceMonth],
    queryFn: () => staffService.getAttendanceSummary(attendanceMonth),
    staleTime: 30_000
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (payload: { entityType: DirectoryEntityType; entityId: number; date: string; status: AttendanceStatus; note?: string }) => {
      const endpoint = payload.entityType === 'teacher' ? `/teachers/${payload.entityId}/attendance` : `/staff/${payload.entityId}/attendance`;
      const { data } = await api.post(endpoint, {
        date: payload.date,
        status: payload.status,
        note: payload.note || undefined
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
      toast.success('Attendance saved');
      setAttendanceMarkDialogOpen(false);
    },
    onError: () => toast.error('Failed to save attendance')
  });
  
  // Fixed attendance stats with proper typing and null checking
  const attendanceStats: AttendanceRecord[] = useMemo(() => {
    return monthlyAttendanceQuery.data?.summary || [];
  }, [monthlyAttendanceQuery.data?.summary]);
  
  // Enhanced teacher display with proper typing
  const enhancedSelectedTeacher: EnhancedTeacher | null = useMemo(() => {
    if (!selectedTeacher || selectedStaffType !== 'teacher') return null;
    
    return {
      ...selectedTeacher,
      displayName: `${selectedTeacher.firstName || ''} ${selectedTeacher.lastName || ''}`.trim(),
      qualifications: [],
      schedule: []
    };
  }, [selectedTeacher]);

  const attendanceMonthLabel = useMemo(() => {
    const [year, month] = attendanceMonth.split('-').map(Number);
    if (!year || !month) return attendanceMonth;
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric'
    });
  }, [attendanceMonth]);

  const selectedStaffProfile = useMemo(() => {
    if (selectedStaffType !== 'staff' || !selectedStaffRecord) return null;
    return selectedStaffRecord;
  }, [selectedStaffRecord, selectedStaffType]);

  const departmentDistribution = useMemo(() => {
    return [...departments]
      .map((department) => {
        const staffCount = directoryRows.filter((row) => row.department_name === department.name).length;
        return {
          ...department,
          staff_count: department.staff_count || staffCount
        };
      })
      .filter((department) => (department.staff_count || 0) > 0)
      .sort((a, b) => (b.staff_count || 0) - (a.staff_count || 0));
  }, [departments, directoryRows]);
  
  // Event handlers with proper typing
  const handleStaffSelect = (staffId: number, entityType: DirectoryEntityType = 'teacher'): void => {
    setSelectedStaff(staffId);
    setSelectedStaffType(entityType);
  };
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(event.target.value);
  };
  
  const handleTabChange = (value: string): void => {
    setActiveTab(value);
  };
  
  const queryClient = useQueryClient();

  const deleteTeacherMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/teachers/${id}`);
    },
    onSuccess: () => {
      toast.success('Teacher deleted successfully');
      setIsDeleteModalOpen(false);
      setTeacherToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete teacher');
    }
  });

  const handleAddTeacher = () => {
    setIsAddModalOpen(true);
  };

  const handleEditTeacher = (teacherId: number) => {
    setSelectedStaff(teacherId);
    setSelectedStaffType('teacher');
    setIsEditModalOpen(true);
  };

  const handleDeleteTeacher = (teacherId: number, fallbackName?: string) => {
    const teacher = teachersData?.teachers?.find((item: Teacher) => item.id === teacherId);
    setTeacherToDelete(teacher || {
      id: teacherId,
      firstName: fallbackName?.split(' ')[0] || '',
      lastName: fallbackName?.split(' ').slice(1).join(' ') || '',
      first_name: fallbackName?.split(' ')[0] || '',
      last_name: fallbackName?.split(' ').slice(1).join(' ') || '',
      email: '',
      hire_date: '',
      employee_id: '',
      specialization: 'Teacher',
      qualifications: [],
      experience_years: 0,
      status: 'active',
      created_at: '',
      updated_at: '',
    } as Teacher);
    setIsDeleteModalOpen(true);
  };

  const syncStaffDepartment = async (staffId: number, departmentId?: number | null) => {
    if (!departmentId) return;
    await staffService.assignDepartment(staffId, { department_id: departmentId });
  };

  const createStaffMutation = useMutation({
    mutationFn: async (payload: Partial<StaffRecord> & { email?: string; department_id?: number }) => {
      const { department_id, ...staffPayload } = payload;
      const staff = await staffService.createStaff(staffPayload);
      await syncStaffDepartment(staff.id, department_id);
      return staff;
    },
    onSuccess: () => {
      toast.success('Staff profile created successfully');
      setStaffDialogOpen(false);
      setEditingStaffRecord(null);
      queryClient.invalidateQueries({ queryKey: ['staff-directory'] });
      queryClient.invalidateQueries({ queryKey: ['staff-detail'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to create staff profile')
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Partial<StaffRecord> & { department_id?: number } }) => {
      const { department_id, ...staffPayload } = payload;
      const staff = await staffService.updateStaff(id, staffPayload);
      await syncStaffDepartment(id, department_id);
      return staff;
    },
    onSuccess: () => {
      toast.success('Staff profile updated successfully');
      setStaffDialogOpen(false);
      setEditingStaffRecord(null);
      queryClient.invalidateQueries({ queryKey: ['staff-directory'] });
      queryClient.invalidateQueries({ queryKey: ['staff-detail'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update staff profile')
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id: number) => staffService.deleteStaff(id),
    onSuccess: () => {
      toast.success('Staff deleted successfully');
      setStaffToDelete(null);
      setIsDeleteModalOpen(false);
      if (selectedStaffType === 'staff') {
        setSelectedStaff(null);
        setSelectedStaffType(null);
      }
      queryClient.invalidateQueries({ queryKey: ['staff-directory'] });
      queryClient.invalidateQueries({ queryKey: ['staff-detail'] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to delete staff')
  });

  const openCreateStaffDialog = () => {
    setEditingStaffRecord(null);
    setStaffForm({
      first_name: '',
      last_name: '',
      job_title: '',
      phone_number: '',
      address: '',
      joining_date: '',
      gender: 'other',
      email: '',
      department_id: undefined,
    });
    setStaffDialogOpen(true);
  };

  const openEditStaffDialog = (staff: StaffRecord) => {
    setEditingStaffRecord(staff);
    setSelectedStaff(staff.id);
    setSelectedStaffType('staff');
    setStaffForm({
      first_name: staff.first_name,
      last_name: staff.last_name,
      job_title: staff.job_title || '',
      phone_number: staff.phone_number || '',
      address: staff.address || '',
      joining_date: staff.joining_date || '',
      date_of_birth: staff.date_of_birth || '',
      gender: staff.gender || 'other',
      email: staff.email || '',
      status: staff.status || 'active',
      department_id: staff.department_id || departments.find((department) => department.name === staff.department_name)?.id,
    });
    setStaffDialogOpen(true);
  };

  const submitStaffForm = () => {
    const payload = {
      first_name: String(staffForm.first_name || '').trim(),
      last_name: String(staffForm.last_name || '').trim(),
      job_title: String(staffForm.job_title || '').trim() || undefined,
      phone_number: String(staffForm.phone_number || '').trim() || undefined,
      address: String(staffForm.address || '').trim() || undefined,
      joining_date: String(staffForm.joining_date || '').trim() || undefined,
      date_of_birth: String(staffForm.date_of_birth || '').trim() || undefined,
      gender: staffForm.gender || undefined,
      email: String(staffForm.email || '').trim() || undefined,
      status: staffForm.status || undefined,
      department_id: staffForm.department_id ? Number(staffForm.department_id) : undefined,
    };

    if (!payload.first_name || !payload.last_name) {
      toast.error('First name and last name are required');
      return;
    }

    if (editingStaffRecord) {
      updateStaffMutation.mutate({ id: editingStaffRecord.id, payload });
      return;
    }

    if (!payload.email) {
      toast.error('Email is required to create a staff user');
      return;
    }

    createStaffMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="directory" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Staff Directory</h3>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search staff..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  exportCsv('staff_directory.csv', directoryRows.map((row) => ({
                    id: row.id,
                    type: row.entity_type,
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    department: row.department_name,
                    position: row.position,
                    status: row.status
                  })));
                  toast.success('Exported staff directory');
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Teaching Staff
              </Button>
              <Button variant="outline" onClick={openCreateStaffDialog}>
                <Briefcase className="mr-2 h-4 w-4" />
                Add Non-Teaching Staff
              </Button>
            </div>
          </div>
          
          {selectedStaff && selectedStaffType === 'teacher' && enhancedSelectedTeacher ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{enhancedSelectedTeacher.displayName || `${enhancedSelectedTeacher.firstName || ''} ${enhancedSelectedTeacher.lastName || ''}`.trim()}</CardTitle>
                    <CardDescription>{enhancedSelectedTeacher.specialization || 'Teacher'}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => { setSelectedStaff(null); setSelectedStaffType(null); }}>
                    Back to Directory
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="h-16 w-16 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{enhancedSelectedTeacher.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{enhancedSelectedTeacher.phone || enhancedSelectedTeacher.phoneNumber}</span>
                      </div>
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{enhancedSelectedTeacher.department?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                        <span>Joined: {enhancedSelectedTeacher.hire_date ? new Date(enhancedSelectedTeacher.hire_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Badge variant={enhancedSelectedTeacher.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                        {enhancedSelectedTeacher.status || 'Active'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="md:col-span-2 space-y-6">
                    <div>
                      <h4 className="font-medium mb-2">Professional Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg border p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Qualification</div>
                          <div className="mt-2 font-medium text-slate-900">
                            {enhancedSelectedTeacher.qualification || 'Not provided'}
                          </div>
                        </div>
                        <div className="rounded-lg border p-4">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Specialization</div>
                          <div className="mt-2 font-medium text-slate-900">
                            {enhancedSelectedTeacher.specialization || 'General staff'}
                          </div>
                        </div>
                        <div className="rounded-lg border p-4 md:col-span-2">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">Biography</div>
                          <div className="mt-2 text-sm text-slate-700">
                            {(enhancedSelectedTeacher as any).bio || 'No biography has been added yet.'}
                          </div>
                        </div>
                        {enhancedSelectedTeacher.qualifications && enhancedSelectedTeacher.qualifications.length > 0 && (
                          enhancedSelectedTeacher.qualifications.map((qualification: Qualification, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center">
                                <GraduationCap className="h-4 w-4 mr-2 text-blue-500" />
                                <span className="font-medium">{qualification.degree}</span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {qualification.institution}, {qualification.year}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Availability Snapshot</h4>
                      <div className="border rounded-lg overflow-hidden">
                        {enhancedSelectedTeacher.schedule && enhancedSelectedTeacher.schedule.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Day</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Class</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {enhancedSelectedTeacher.schedule.map((item: ScheduleItem, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>{item.day}</TableCell>
                                  <TableCell>{item.time}</TableCell>
                                  <TableCell>{item.subject}</TableCell>
                                  <TableCell>{item.class}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50">
                            <div className="rounded-lg border bg-white p-4">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Department</div>
                              <div className="mt-2 font-medium">{enhancedSelectedTeacher.department?.name || 'Not assigned'}</div>
                            </div>
                            <div className="rounded-lg border bg-white p-4">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Contact</div>
                              <div className="mt-2 font-medium">{enhancedSelectedTeacher.phone || enhancedSelectedTeacher.phoneNumber || 'Not provided'}</div>
                            </div>
                            <div className="rounded-lg border bg-white p-4">
                              <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
                              <div className="mt-2 font-medium capitalize">{enhancedSelectedTeacher.status || 'active'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedStaff && selectedStaffType === 'staff' && selectedStaffProfile ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{selectedStaffProfile.full_name || `${selectedStaffProfile.first_name} ${selectedStaffProfile.last_name}`}</CardTitle>
                    <CardDescription>{selectedStaffProfile.job_title || 'Staff'}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => { setSelectedStaff(null); setSelectedStaffType(null); }}>
                    Back to Directory
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="h-16 w-16 text-gray-400" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-500" /><span>{selectedStaffProfile.email || 'No email'}</span></div>
                      <div className="flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-500" /><span>{selectedStaffProfile.phone_number || 'No phone'}</span></div>
                      <div className="flex items-center"><Briefcase className="h-4 w-4 mr-2 text-gray-500" /><span>{selectedStaffProfile.job_title || 'Staff'}</span></div>
                      <div className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-gray-500" /><span>Joined: {selectedStaffProfile.joining_date ? new Date(selectedStaffProfile.joining_date).toLocaleDateString() : 'N/A'}</span></div>
                    </div>
                    <div className="pt-2">
                      <Badge variant={selectedStaffProfile.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                        {selectedStaffProfile.status || 'Active'}
                      </Badge>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Employee ID</div>
                        <div className="mt-2 font-medium text-slate-900">{selectedStaffProfile.employee_id || 'Pending auto-assignment'}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Gender</div>
                        <div className="mt-2 font-medium text-slate-900">{selectedStaffProfile.gender || 'Not provided'}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Department</div>
                        <div className="mt-2 font-medium text-slate-900">{selectedStaffProfile.department_name || 'Not assigned'}</div>
                      </div>
                      <div className="rounded-lg border p-4 md:col-span-2">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Address</div>
                        <div className="mt-2 text-sm text-slate-700">{selectedStaffProfile.address || 'No address on file.'}</div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => openEditStaffDialog(selectedStaffProfile)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {isLoadingDirectory ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : directoryError ? (
                  <div className="p-8 text-center text-red-500">
                    Error loading staff data: {(directoryError as Error).message}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directoryRows.length > 0 ? (
                        directoryRows.map((staff) => (
                          <TableRow key={staff.entity_key}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>{staff.name}</span>
                                <Badge variant="outline">{staff.entity_type === 'teacher' ? 'Teaching' : 'Non-Teaching'}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>{staff.position || (staff.entity_type === 'teacher' ? 'Teacher' : 'Staff')}</TableCell>
                            <TableCell>{staff.department_name || 'N/A'}</TableCell>
                            <TableCell>{staff.email}</TableCell>
                            <TableCell>{staff.phone}</TableCell>
                            <TableCell>
                              <Badge variant={staff.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                                {staff.status || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleStaffSelect(staff.id, staff.entity_type)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (staff.entity_type === 'teacher') {
                                      handleEditTeacher(staff.id);
                                      return;
                                    }
                                    openEditStaffDialog(selectedStaffType === 'staff' && selectedStaffProfile?.id === staff.id ? selectedStaffProfile : {
                                      id: staff.id,
                                      first_name: staff.name.split(' ')[0] || '',
                                      last_name: staff.name.split(' ').slice(1).join(' ') || '',
                                      full_name: staff.name,
                                      job_title: staff.position,
                                      email: staff.email || '',
                                      phone_number: staff.phone || '',
                                      joining_date: staff.join_date || '',
                                      department_id: staff.department_id || undefined,
                                      department_name: staff.department_name || undefined,
                                      status: (staff.status as any) || 'active',
                                    });
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (staff.entity_type === 'teacher') {
                                      handleDeleteTeacher(staff.id, staff.name);
                                      return;
                                    }
                                    setStaffToDelete({
                                      id: staff.id,
                                      first_name: staff.name.split(' ')[0] || '',
                                      last_name: staff.name.split(' ').slice(1).join(' ') || '',
                                      full_name: staff.name,
                                      job_title: staff.position,
                                      email: staff.email || '',
                                      phone_number: staff.phone || '',
                                      department_id: staff.department_id || undefined,
                                      department_name: staff.department_name || undefined,
                                      status: (staff.status as any) || 'active',
                                    });
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No staff members found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-blue-100 p-3 mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{summaryStats.totalStaff}</h3>
                  <p className="text-sm text-gray-500">Total Staff</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-green-100 p-3 mb-4">
                    <BookOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{summaryStats.teachingStaff}</h3>
                  <p className="text-sm text-gray-500">Teaching Staff</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-amber-100 p-3 mb-4">
                    <Briefcase className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{summaryStats.administrativeStaff}</h3>
                  <p className="text-sm text-gray-500">Administrative Staff</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center">
                  <div className="rounded-full bg-purple-100 p-3 mb-4">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold">{summaryStats.departments}</h3>
                  <p className="text-sm text-gray-500">Departments</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Operational Departments</h3>
            <Button
              onClick={() => {
                setEditingDepartment(null);
                setDepartmentForm({ name: '', code: '', description: '', head_id: '', is_active: true });
                setDepartmentDialogOpen(true);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          </div>
          
          {isLoadingDepartments ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : departmentsError ? (
            <div className="p-8 text-center text-red-500">
              Error loading departments: {(departmentsError as Error).message}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {departments && departments.length > 0 ? (
                departments.map((department: Department) => (
                  <Card key={department.id}>
                    <CardHeader className="pb-2">
                      <CardTitle>{department.name}</CardTitle>
                      <CardDescription>
                        {department.code && `Code: ${department.code}`}
                        {department.description && ` • ${department.description}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm text-gray-500">
                            {department.staff_count || 0} staff members
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDepartment(department);
                              setDepartmentForm({
                                name: department.name,
                                code: department.code || '',
                                description: department.description || '',
                                head_id: department.head?.id ? String(department.head.id) : '',
                                is_active: department.is_active
                              });
                              setDepartmentDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Badge variant={department.is_active ? 'default' : 'secondary'}>
                          {department.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  No departments found
                </div>
              )}
            </div>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
                <CardDescription>Live staff allocation across operational departments</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                  {departmentDistribution.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                      Assign staff to operational departments to see distribution.
                    </div>
                  ) : departmentDistribution.map((department) => {
                    const ratio = summaryStats.totalStaff > 0 ? Math.round(((department.staff_count || 0) / summaryStats.totalStaff) * 100) : 0;
                    return (
                      <div key={department.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">{department.name}</span>
                          <span className="text-slate-500">{department.staff_count || 0} staff</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${Math.max(ratio, department.staff_count ? 8 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Staff Attendance</h3>
            <div className="flex gap-2">
              <Select value={attendanceMonth} onValueChange={setAttendanceMonth}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const now = new Date()
                    const months: string[] = []
                    for (let i = 0; i < 12; i++) {
                      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
                      months.push(d.toISOString().slice(0, 7))
                    }
                    return months
                  })().map((m) => (
                    <SelectItem key={m} value={m}>
                      {new Date(`${m}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  exportCsv('staff_attendance.csv', attendanceStats);
                  toast.success('Exported attendance report');
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button
                onClick={() => {
                  const first = attendanceStats[0] as any;
                  const firstId = first?.entity_id || null;
                  setAttendanceSelectedId(firstId);
                  setAttendanceSelectedType((first?.entity_type as DirectoryEntityType) || 'teacher');
                  setAttendanceForm({
                    date: new Date().toISOString().slice(0, 10),
                    status: 'present',
                    note: ''
                  });
                  setAttendanceMarkDialogOpen(true);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Mark Attendance
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-0">
              {monthlyAttendanceQuery.isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Present Days</TableHead>
                      <TableHead>Absent Days</TableHead>
                      <TableHead>Late Arrivals</TableHead>
                      <TableHead>Attendance Rate</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceStats.length > 0 ? (
                      attendanceStats.map((staff: any) => (
                        <TableRow key={staff.entity_key || `${staff.entity_type}-${staff.entity_id}`}>
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell>{staff.position}</TableCell>
                          <TableCell>{staff.present}</TableCell>
                          <TableCell>{staff.absent}</TableCell>
                          <TableCell>{staff.late}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    staff.attendanceRate >= 95 ? 'bg-green-600' :
                                    staff.attendanceRate >= 85 ? 'bg-amber-500' :
                                    'bg-red-600'
                                  }`} 
                                  style={{ width: `${staff.attendanceRate}%` }}
                                ></div>
                              </div>
                              <span className="text-xs">{staff.attendanceRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAttendanceSelectedId(staff.entity_id);
                                setAttendanceSelectedType(staff.entity_type);
                                setAttendanceDetailDialogOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No attendance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Attendance Overview</CardTitle>
                <CardDescription>{attendanceMonthLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="rounded-full bg-green-100 p-2 mr-3">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Overall Attendance Rate</h4>
                        <p className="text-sm text-gray-500">All staff members</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {attendanceStats.length > 0 
                          ? Math.round(attendanceStats.reduce((sum: number, staff: AttendanceRecord) => sum + staff.attendanceRate, 0) / attendanceStats.length)
                          : 0
                        }%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>Current month breakdown by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-green-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-green-700">Present</div>
                    <div className="mt-2 text-2xl font-bold text-green-800">
                      {attendanceStats.reduce((sum, staff) => sum + staff.present, 0)}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-amber-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-amber-700">Late</div>
                    <div className="mt-2 text-2xl font-bold text-amber-800">
                      {attendanceStats.reduce((sum, staff) => sum + staff.late, 0)}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-red-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-red-700">Absent</div>
                    <div className="mt-2 text-2xl font-bold text-red-800">
                      {attendanceStats.reduce((sum, staff) => sum + staff.absent, 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
      </Tabs>

      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>Update department details and status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="bg-white" value={departmentForm.name} onChange={(e) => setDepartmentForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input className="bg-white" value={departmentForm.code} onChange={(e) => setDepartmentForm((p) => ({ ...p, code: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department Head</Label>
              <Select value={departmentForm.head_id || 'none'} onValueChange={(value) => setDepartmentForm((p) => ({ ...p, head_id: value === 'none' ? '' : value }))}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department head</SelectItem>
                  {(teachersData?.teachers || []).map((teacher: Teacher) => (
                    <SelectItem key={teacher.id} value={String(teacher.id)}>
                      {`${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || `Teacher ${teacher.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={departmentForm.description} onChange={(e) => setDepartmentForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={departmentForm.is_active ? 'active' : 'inactive'} onValueChange={(v) => setDepartmentForm((p) => ({ ...p, is_active: v === 'active' }))}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentDialogOpen(false)}>Close</Button>
            <Button
              className="glass-button"
              onClick={() => {
                const name = departmentForm.name.trim();
                const code = departmentForm.code.trim();
                if (!name || !code) return;
                const headId = departmentForm.head_id.trim() ? Number(departmentForm.head_id) : undefined;
                const payload: Partial<ApiDepartment> = {
                  name,
                  code,
                  description: departmentForm.description.trim() || undefined,
                  head_id: Number.isFinite(headId as any) ? headId : undefined,
                  is_active: departmentForm.is_active,
                  structure_type: 'operational'
                };

                if (editingDepartment) {
                  updateDepartmentMutation.mutate({ id: editingDepartment.id, ...payload } as any);
                } else {
                  createDepartmentMutation.mutate(payload);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attendanceMarkDialogOpen} onOpenChange={setAttendanceMarkDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Mark attendance</DialogTitle>
            <DialogDescription>Adjust attendance counts for a staff member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select
                value={attendanceSelectedId && attendanceSelectedType ? `${attendanceSelectedType}-${attendanceSelectedId}` : ''}
                onValueChange={(v) => {
                  const [entityType, idValue] = v.split('-');
                  const id = Number(idValue);
                  setAttendanceSelectedId(id);
                  setAttendanceSelectedType((entityType as DirectoryEntityType) || 'teacher');
                }}
              >
                <SelectTrigger className="bg-white"><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {directoryRows.map((row) => (
                    <SelectItem key={row.entity_key} value={row.entity_key}>
                      {row.name} ({row.entity_type === 'teacher' ? 'Teaching' : 'Non-Teaching'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  className="bg-white"
                  value={attendanceForm.date}
                  onChange={(e) => setAttendanceForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={attendanceForm.status}
                  onValueChange={(v) => setAttendanceForm((p) => ({ ...p, status: v as any }))}
                >
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">present</SelectItem>
                    <SelectItem value="late">late</SelectItem>
                    <SelectItem value="absent">absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={attendanceForm.note}
                onChange={(e) => setAttendanceForm((p) => ({ ...p, note: e.target.value }))}
                rows={3}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceMarkDialogOpen(false)}>Cancel</Button>
            <Button
              className="glass-button"
              onClick={() => {
                if (!attendanceSelectedId) return;
                const date = String(attendanceForm.date || '').trim();
                if (!date) return;
                const status = attendanceForm.status;
                markAttendanceMutation.mutate({
                  entityType: attendanceSelectedType,
                  entityId: attendanceSelectedId,
                  date,
                  status,
                  note: attendanceForm.note || undefined
                });
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={attendanceDetailDialogOpen} onOpenChange={setAttendanceDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendance details</DialogTitle>
          </DialogHeader>
          {(() => {
            const record = attendanceStats.find((x: any) => x.entity_id === attendanceSelectedId && x.entity_type === attendanceSelectedType);
            if (!record || !attendanceSelectedId) return <div className="text-sm text-gray-500">No record found.</div>;
            const items = (monthlyAttendanceQuery.data?.by_entity?.[`${attendanceSelectedType}-${attendanceSelectedId}`] || [])
              .slice()
              .sort((a: AttendanceRecordItem, b: AttendanceRecordItem) => (a.date < b.date ? 1 : -1));

            return (
              <div className="space-y-3">
                <div className="text-sm"><span className="font-medium">Staff:</span> {record.name}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border rounded-lg"><div className="text-xs text-gray-500">Present</div><div className="text-lg font-semibold">{record.present}</div></div>
                  <div className="p-3 border rounded-lg"><div className="text-xs text-gray-500">Absent</div><div className="text-lg font-semibold">{record.absent}</div></div>
                  <div className="p-3 border rounded-lg"><div className="text-xs text-gray-500">Late</div><div className="text-lg font-semibold">{record.late}</div></div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-xs text-gray-500">Attendance rate</div>
                  <div className="text-lg font-semibold">{record.attendanceRate}%</div>
                </div>

                <div className="pt-2">
                  <div className="text-sm font-medium">Records ({attendanceMonth})</div>
                  <div className="mt-2 space-y-2">
                    {items.map((it) => (
                      <div key={`${it.entity_key}_${it.date}`} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{it.date}</div>
                          <div className="text-xs text-muted-foreground">{it.status}{it.note ? ` • ${it.note}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="bg-white"
                            onClick={() => {
                              setAttendanceSelectedId(it.entity_id)
                              setAttendanceSelectedType(it.entity_type)
                              setAttendanceForm({ date: it.date, status: it.status, note: it.note || '' })
                              setAttendanceMarkDialogOpen(true)
                              setAttendanceDetailDialogOpen(false)
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-sm text-muted-foreground">No daily records for this month yet.</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDetailDialogOpen(false)}>Close</Button>
            <Button
              className="glass-button"
              onClick={() => {
                if (!attendanceSelectedId) return;
                setAttendanceForm({ date: new Date().toISOString().slice(0, 10), status: 'present', note: '' });
                setAttendanceMarkDialogOpen(true);
                setAttendanceDetailDialogOpen(false);
              }}
            >
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modals */}
      <TeacherFormModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />
      
      <TeacherFormModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        teacher={selectedTeacher || teachersData?.teachers?.find((t: any) => t.id === selectedStaff)}
      />

      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingStaffRecord ? 'Edit Non-Teaching Staff' : 'Add Non-Teaching Staff'}</DialogTitle>
            <DialogDescription>Manage administrative and support staff profiles from the Administration workspace.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input className="bg-white" value={String(staffForm.first_name || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, first_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input className="bg-white" value={String(staffForm.last_name || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, last_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input className="bg-white" type="email" value={String(staffForm.email || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))} disabled={!!editingStaffRecord} />
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input className="bg-white" value={String(staffForm.job_title || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, job_title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={staffForm.department_id ? String(staffForm.department_id) : 'none'}
                onValueChange={(value) => setStaffForm((prev) => ({ ...prev, department_id: value === 'none' ? undefined : Number(value) }))}
              >
                <SelectTrigger className="bg-white"><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input className="bg-white" value={String(staffForm.phone_number || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, phone_number: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Joining Date</Label>
              <Input className="bg-white" type="date" value={String(staffForm.joining_date || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, joining_date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input className="bg-white" type="date" value={String(staffForm.date_of_birth || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, date_of_birth: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={String(staffForm.gender || 'other')} onValueChange={(value) => setStaffForm((prev) => ({ ...prev, gender: value }))}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingStaffRecord && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={String(staffForm.status || 'active')} onValueChange={(value) => setStaffForm((prev) => ({ ...prev, status: value as any }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Textarea className="bg-white" value={String(staffForm.address || '')} onChange={(e) => setStaffForm((prev) => ({ ...prev, address: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitStaffForm} disabled={createStaffMutation.isPending || updateStaffMutation.isPending}>
              {(createStaffMutation.isPending || updateStaffMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {teacherToDelete ? `${teacherToDelete.firstName || ''} ${teacherToDelete.lastName || ''}`.trim() : staffToDelete?.full_name || `${staffToDelete?.first_name || ''} ${staffToDelete?.last_name || ''}`.trim()}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (teacherToDelete) {
                  deleteTeacherMutation.mutate(teacherToDelete.id);
                  return;
                }
                if (staffToDelete) {
                  deleteStaffMutation.mutate(staffToDelete.id);
                }
              }}
              disabled={deleteTeacherMutation.isPending || deleteStaffMutation.isPending}
            >
              {(deleteTeacherMutation.isPending || deleteStaffMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
