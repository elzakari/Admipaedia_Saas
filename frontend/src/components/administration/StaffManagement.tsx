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
  useTeacher, 
  useCreateTeacher, 
  useUpdateTeacher, 
  useDeleteTeacher 
} from '../../hooks/useTeachers';
// Update imports to use only teacher.types.ts
import { 
  Teacher, 
  TeacherClass,
  Qualification,
  ScheduleItem
} from '../../types/teacher.types';
import { 
  TeacherCreate, 
  TeacherUpdate, 
  TeacherAttendance 
} from '../../services/teacherService';
import departmentService, { Department as ApiDepartment } from '../../services/departmentService';

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(10);
  // Add the missing activeTab state
  const [activeTab, setActiveTab] = useState<string>('directory');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);

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
    { enabled: !!selectedStaff }, // options object
    selectedStaff || 0 // teacherId
  );
  
  // Mutations for CRUD operations
  const { mutate: createTeacher, isPending: isCreating } = useCreateTeacher();
  const { mutate: updateTeacher, isPending: isUpdating } = useUpdateTeacher();
  const { mutate: deleteTeacher, isPending: isDeleting } = useDeleteTeacher();
  
  const { data: departmentsData, isLoading: isLoadingDepartments, error: departmentsError } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAllDepartments(),
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
  
  // Use consistent Teacher type from teacherService - remove explicit typing to let TypeScript infer
  // Use the consolidated Teacher type
  const filteredTeachers = useMemo(() => {
    const teachers = teachersData?.teachers || [];
    if (!searchTerm) return teachers;
    
    return teachers.filter((teacher: Teacher) => {
      const firstName = teacher.firstName || '';
      const lastName = teacher.lastName || '';
      const email = teacher.email || '';
      const specialization = teacher.specialization || '';
      
      return firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             email.toLowerCase().includes(searchTerm.toLowerCase()) ||
             specialization.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [teachersData?.teachers, searchTerm]);
  
  // Enhanced summary stats with all required properties
  const summaryStats: SummaryStats = useMemo(() => {
    const totalStaff = filteredTeachers.length;
    const activeStaff = filteredTeachers.filter((teacher) => teacher.status === 'active').length;
    const teachingStaff = filteredTeachers.filter((teacher) => {
      const spec = teacher.specialization || '';
      return spec && !['Administration', 'IT', 'Library'].includes(spec);
    }).length;
    const administrativeStaff = filteredTeachers.filter((teacher) => {
      const spec = teacher.specialization || '';
      return spec && ['Administration', 'IT', 'Library'].includes(spec);
    }).length;
    
    return {
      totalStaff,
      activeStaff,
      departments: departments.length,
      avgAttendance: 0,
      teachingStaff,
      administrativeStaff,
      message: 'Staff data loaded successfully'
    };
  }, [departments.length, filteredTeachers]);

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

  const [attendanceMonth, setAttendanceMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))
  type AttendanceStatus = 'present' | 'absent' | 'late'
  type AttendanceRecordItem = { id: number; teacher_id: number; date: string; status: AttendanceStatus; note?: string | null }

  const [attendanceForm, setAttendanceForm] = useState<{ date: string; status: AttendanceStatus; note: string }>({
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
    note: ''
  })

  const monthlyAttendanceQuery = useQuery({
    queryKey: ['staff-attendance', attendanceMonth, (teachersData?.teachers || []).map((t: Teacher) => t.id).join(',')],
    enabled: !!teachersData?.teachers,
    queryFn: async () => {
      const teachers = teachersData?.teachers || [];
      if (teachers.length === 0) return { byTeacher: {} as Record<number, AttendanceRecordItem[]> };
      const [yearStr, monthStr] = attendanceMonth.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const start_date = `${attendanceMonth}-01`;
      const end = new Date(Date.UTC(year, month, 0));
      const end_date = end.toISOString().slice(0, 10);

      const results = await Promise.all(
        teachers.map(async (t: Teacher) => {
          const { data } = await api.get(`/teachers/${t.id}/attendance`, {
            params: { page: 1, per_page: 1000, start_date, end_date }
          });
          const rows = (data?.attendance || []) as any[];
          const normalized: AttendanceRecordItem[] = rows.map((r) => ({
            id: r.id,
            teacher_id: r.teacher_id,
            date: String(r.date).slice(0, 10),
            status: r.status,
            note: r.note ?? null
          }));
          return [t.id, normalized] as const;
        })
      );

      return { byTeacher: Object.fromEntries(results) as Record<number, AttendanceRecordItem[]> };
    },
    staleTime: 30_000
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (payload: { teacherId: number; date: string; status: AttendanceStatus; note?: string }) => {
      const { data } = await api.post(`/teachers/${payload.teacherId}/attendance`, {
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
    const byTeacher = monthlyAttendanceQuery.data?.byTeacher || {};
    const teachers = teachersData?.teachers || []
    return teachers.map((t: Teacher) => {
      const list = byTeacher[t.id] || []
      const presentDays = list.filter((x) => x.status === 'present').length
      const absentDays = list.filter((x) => x.status === 'absent').length
      const lateArrivals = list.filter((x) => x.status === 'late').length
      const total = presentDays + absentDays + lateArrivals
      const attendanceRate = total > 0 ? Math.round(((presentDays + lateArrivals) / total) * 100) : 0

      return {
        id: t.id,
        name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || `Teacher ${t.id}`,
        position: t.specialization || 'Teacher',
        present: presentDays,
        absent: absentDays,
        late: lateArrivals,
        attendanceRate
      }
    })
  }, [monthlyAttendanceQuery.data?.byTeacher, teachersData?.teachers]);
  
  // Enhanced teacher display with proper typing
  const enhancedSelectedTeacher: EnhancedTeacher | null = useMemo(() => {
    if (!selectedTeacher) return null;
    
    return {
      ...selectedTeacher,
      displayName: `${selectedTeacher.firstName || ''} ${selectedTeacher.lastName || ''}`.trim(),
      qualifications: [], // Mock data - would come from API
      schedule: [] // Mock data - would come from API
    };
  }, [selectedTeacher]);
  
  // Event handlers with proper typing
  const handleStaffSelect = (staffId: number): void => {
    setSelectedStaff(staffId);
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

  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedStaff(teacher.id);
    setIsEditModalOpen(true);
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setIsDeleteModalOpen(true);
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
                  exportCsv('staff_directory.csv', filteredTeachers.map((t: Teacher) => ({
                    id: t.id,
                    firstName: t.firstName,
                    lastName: t.lastName,
                    email: t.email,
                    phone: t.phone || t.phoneNumber,
                    department: t.department?.name,
                    specialization: t.specialization,
                    status: t.status
                  })));
                  toast.success('Exported staff directory');
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button className="glass-button" onClick={() => setIsAddModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </div>
          </div>
          
          {selectedStaff && enhancedSelectedTeacher ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{enhancedSelectedTeacher.displayName || `${enhancedSelectedTeacher.firstName || ''} ${enhancedSelectedTeacher.lastName || ''}`.trim()}</CardTitle>
                    <CardDescription>{enhancedSelectedTeacher.specialization || 'Teacher'}</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedStaff(null)}>
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
                      <h4 className="font-medium mb-2">Qualifications</h4>
                      <div className="space-y-2">
                        {enhancedSelectedTeacher.qualifications && enhancedSelectedTeacher.qualifications.length > 0 ? (
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
                        ) : (
                          <div className="p-3 border rounded-lg text-center text-gray-500">
                            No qualifications data available
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Teaching Schedule</h4>
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
                          <div className="p-4 text-center text-gray-500">
                            No schedule data available
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
          ) : (
            <Card>
              <CardContent className="p-0">
                {isLoadingTeachers ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : teachersError ? (
                  <div className="p-8 text-center text-red-500">
                    Error loading staff data: {(teachersError as Error).message}
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
                      {filteredTeachers.length > 0 ? (
                        filteredTeachers.map((staff: Teacher) => (
                          <TableRow key={staff.id}>
                            <TableCell className="font-medium">
                              {`${staff.firstName || ''} ${staff.lastName || ''}`.trim()}
                            </TableCell>
                            <TableCell>{staff.specialization || 'Teacher'}</TableCell>
                            <TableCell>{staff.department?.name || 'N/A'}</TableCell>
                            <TableCell>{staff.email}</TableCell>
                            <TableCell>{staff.phone || staff.phoneNumber}</TableCell>
                            <TableCell>
                              <Badge variant={staff.status?.toLowerCase() === 'active' ? 'default' : 'secondary'}>
                                {staff.status || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => handleStaffSelect(staff.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEditTeacher(staff)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteTeacher(staff)}>
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
            <h3 className="text-lg font-medium">Academic Departments</h3>
            <Button
              className="glass-button"
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
                            <Eye className="h-4 w-4" />
                          </Button>
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
              <CardDescription>Staff allocation across departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
                <PieChart className="h-8 w-8 text-gray-400" />
                <span className="ml-2 text-gray-500">Pie chart visualization would go here</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Staff Attendance</h3>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
                value={attendanceMonth}
                onChange={(e) => setAttendanceMonth(e.target.value)}
              >
                {(() => {
                  const now = new Date()
                  const months: string[] = []
                  for (let i = 0; i < 12; i++) {
                    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
                    months.push(d.toISOString().slice(0, 7))
                  }
                  return months
                })().map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
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
                className="glass-button"
                onClick={() => {
                  const teachers = teachersData?.teachers || [];
                  const firstId = teachers[0]?.id || attendanceStats[0]?.id || null;
                  setAttendanceSelectedId(firstId);
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
                      attendanceStats.map((staff: AttendanceRecord) => (
                        <TableRow key={staff.id}>
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
                                setAttendanceSelectedId(staff.id);
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
                <CardDescription>January 2024</CardDescription>
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
                <CardDescription>Last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Attendance trend chart would go here</span>
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
              <Label>Head user ID</Label>
              <Input
                type="number"
                className="bg-white"
                value={departmentForm.head_id}
                onChange={(e) => setDepartmentForm((p) => ({ ...p, head_id: e.target.value }))}
                placeholder="Optional"
              />
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
                  is_active: departmentForm.is_active
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
                value={attendanceSelectedId ? String(attendanceSelectedId) : ''}
                onValueChange={(v) => {
                  const id = Number(v);
                  setAttendanceSelectedId(id);
                }}
              >
                <SelectTrigger className="bg-white"><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {(teachersData?.teachers || []).map((t: Teacher) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {`${t.firstName || ''} ${t.lastName || ''}`.trim() || `Teacher ${t.id}`}
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
                  teacherId: attendanceSelectedId,
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
            const record = attendanceStats.find((x) => x.id === attendanceSelectedId);
            if (!record || !attendanceSelectedId) return <div className="text-sm text-gray-500">No record found.</div>;
            const items = (monthlyAttendanceQuery.data?.byTeacher?.[attendanceSelectedId] || [])
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
                      <div key={`${it.teacher_id}_${it.date}`} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{it.date}</div>
                          <div className="text-xs text-muted-foreground">{it.status}{it.note ? ` • ${it.note}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            className="bg-white"
                            onClick={() => {
                              setAttendanceSelectedId(it.teacher_id)
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
        teacher={teachersData?.teachers?.find((t: any) => t.id === selectedStaff)}
      />

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {teacherToDelete ? `${teacherToDelete.firstName || ''} ${teacherToDelete.lastName || ''}`.trim() : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => teacherToDelete && deleteTeacherMutation.mutate(teacherToDelete.id)} disabled={deleteTeacherMutation.isPending}>
              {deleteTeacherMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
