import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useClass } from '../../hooks/useClasses';
import { useSubmitClassAttendance } from '../../hooks/useClassAttendance';
import { useStudents } from '../../hooks/useStudents';
import attendanceService, { Attendance } from '../../services/attendanceService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AlertCircle, CalendarIcon, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ClassAttendanceProps {
  classId: number;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  status?: AttendanceStatus;
  attendance_id?: number;
}

const ATTENDANCE_STATUSES: Array<{ value: AttendanceStatus; label: string }> = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
];

export function ClassAttendance({ classId }: ClassAttendanceProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [studentsWithStatus, setStudentsWithStatus] = useState<Student[]>([]);
  
  const { data: classData } = useClass(classId);
  const submitAttendance = useSubmitClassAttendance();
  
  const { data: studentsData, isLoading: isLoadingStudents } = useStudents({
    class_id: classId,
    page: 1,
    per_page: 500
  });

  const students = useMemo(() => {
    if (Array.isArray((studentsData as any)?.data)) {
      return (studentsData as any).data;
    }

    if (Array.isArray((studentsData as any)?.students)) {
      return (studentsData as any).students;
    }

    return [];
  }, [studentsData]);

  const {
    data: existingAttendances = [],
    isLoading: isLoadingAttendance,
    isFetching: isFetchingAttendance
  } = useQuery<Attendance[]>({
    queryKey: ['class-attendance-day', classId, selectedDate],
    queryFn: () => attendanceService.getClassAttendance(classId, selectedDate),
    enabled: !!classId && !!selectedDate,
    staleTime: 30 * 1000,
  });

  const existingAttendanceByStudent = useMemo(() => {
    const recordMap = new Map<number, Attendance>();
    existingAttendances.forEach((attendance) => {
      recordMap.set(attendance.student_id, attendance);
    });
    return recordMap;
  }, [existingAttendances]);

  React.useEffect(() => {
    if (students.length > 0) {
      const formattedStudents = students.map((student: any) => {
        const existingAttendance = existingAttendanceByStudent.get(student.id);
        return {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          status: existingAttendance?.status,
          attendance_id: existingAttendance?.id
        };
      });
      setStudentsWithStatus(formattedStudents);
      return;
    }

    setStudentsWithStatus([]);
  }, [existingAttendanceByStudent, students]);

  const handleStatusChange = (studentId: number, status: AttendanceStatus) => {
    setStudentsWithStatus((currentStudents) => currentStudents.map(student => 
      student.id === studentId ? { ...student, status } : student
    ));
  };

  const applyBulkStatus = (status: AttendanceStatus) => {
    setStudentsWithStatus((currentStudents) => currentStudents.map(student => ({
      ...student,
      status
    })));
  };

  const markAllPresent = () => applyBulkStatus('present');
  const markAllAbsent = () => applyBulkStatus('absent');
  const markAllLate = () => applyBulkStatus('late');
  const markAllExcused = () => applyBulkStatus('excused');

  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    let unmarked = 0;

    studentsWithStatus.forEach(student => {
      if (student.status === 'present') present++;
      else if (student.status === 'absent') absent++;
      else if (student.status === 'late') late++;
      else if (student.status === 'excused') excused++;
      else unmarked++;
    });

    const total = studentsWithStatus.length;
    const marked = total - unmarked;

    return {
      present,
      absent,
      late,
      excused,
      unmarked,
      total,
      marked,
      completionRate: total > 0 ? Math.round((marked / total) * 100) : 0
    };
  }, [studentsWithStatus]);

  const handleSubmitAttendance = async () => {
    if (!classId) return;

    if (stats.unmarked > 0) {
      toast.error(t('attendance_page.err_mark_all', 'Mark every student before submitting attendance'));
      return;
    }
    
    try {
      const attendanceData = {
        class_id: classId,
        date: selectedDate,
        attendances: studentsWithStatus.map(student => ({
          student_id: student.id,
          status: student.status as AttendanceStatus,
          remarks: ''
        }))
      };
      
      await submitAttendance.mutateAsync(attendanceData);
      toast.success(existingAttendances.length > 0 ? t('attendance_page.success_update', 'Attendance updated successfully') : t('attendance_page.success_submit', 'Attendance submitted successfully'));
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error(t('attendance_page.err_submit_failed', 'Failed to submit attendance'));
    }
  };

  const isBusy = isLoadingStudents || isLoadingAttendance;
  
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle>{t('attendance_page.daily_workflow_title', 'Daily Attendance Workflow')}</CardTitle>
          <CardDescription>
            {classData?.name ? t('attendance_page.daily_workflow_desc_with_class', 'Review {{className}} by date, then save the shared daily register.', { className: classData.name }) : t('attendance_page.daily_workflow_desc_no_class', 'Review attendance by date before saving the shared daily register.')}
          </CardDescription>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('attendance_page.attendance_date', 'Attendance Date')}</label>
            <div className="relative">
              <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('attendance_page.completion', 'Completion')}</label>
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>{t('attendance_page.completion_marked_count', '{{marked}}/{{total}} students marked', { marked: stats.marked, total: stats.total })}</span>
                <span className="font-medium">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isBusy ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t('attendance_page.loading_workflow', 'Loading attendance workflow...')}</span>
          </div>
        ) : studentsWithStatus.length === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            {t('attendance_page.no_students_found', 'No students found in this class.')}
          </div>
        ) : (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">{t('attendance_page.status_present', 'Present')}</div>
                <div className="text-2xl font-semibold text-green-600">{stats.present}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">{t('attendance_page.status_absent', 'Absent')}</div>
                <div className="text-2xl font-semibold text-red-600">{stats.absent}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">{t('attendance_page.status_late', 'Late')}</div>
                <div className="text-2xl font-semibold text-yellow-600">{stats.late}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">{t('attendance_page.status_excused', 'Excused')}</div>
                <div className="text-2xl font-semibold text-blue-600">{stats.excused}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">{t('attendance_page.status_pending', 'Pending')}</div>
                <div className="text-2xl font-semibold text-slate-700">{stats.unmarked}</div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={markAllPresent}>
                <CheckCircle className="mr-1 h-4 w-4" />
                {t('attendance_page.mark_all_present', 'Mark All Present')}
              </Button>
              <Button variant="outline" onClick={markAllAbsent}>
                <XCircle className="mr-1 h-4 w-4" />
                {t('attendance_page.mark_all_absent', 'Mark All Absent')}
              </Button>
              <Button variant="outline" onClick={markAllLate}>
                <Clock className="mr-1 h-4 w-4" />
                {t('attendance_page.mark_all_late', 'Mark All Late')}
              </Button>
              <Button variant="outline" onClick={markAllExcused}>
                <AlertCircle className="mr-1 h-4 w-4" />
                {t('attendance_page.mark_all_excused', 'Mark All Excused')}
              </Button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={existingAttendances.length > 0 ? 'default' : 'outline'}>
                {existingAttendances.length > 0 ? t('attendance_page.existing_register_loaded', 'Existing register loaded') : t('attendance_page.new_register', 'New register')}
              </Badge>
              {isFetchingAttendance ? <span>{t('attendance_page.refreshing_records', 'Refreshing saved records...')}</span> : null}
              <span>{t('attendance_page.saved_once_info', 'Attendance is saved once per student for the selected class and date.')}</span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('attendance_page.table_student', 'Student')}</TableHead>
                  <TableHead>{t('attendance_page.table_status', 'Current Status')}</TableHead>
                  <TableHead>{t('attendance_page.table_mark_action', 'Mark Attendance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithStatus.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.first_name} {student.last_name}</TableCell>
                    <TableCell>
                      {student.status ? (
                        <Badge
                          className={student.status === 'present' ? 'bg-green-500' : 
                                    student.status === 'absent' ? 'bg-red-500' : 
                                    student.status === 'late' ? 'bg-yellow-500' : 'bg-blue-500'}
                        >
                          {t('attendance_page.status_' + student.status, student.status.charAt(0).toUpperCase() + student.status.slice(1))}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('attendance_page.status_pending', 'Pending')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {ATTENDANCE_STATUSES.map((statusOption) => (
                          <Button
                            key={statusOption.value}
                            size="sm"
                            variant={student.status === statusOption.value ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.id, statusOption.value)}
                          >
                            {t('attendance_page.status_' + statusOption.value, statusOption.label)}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{t('attendance_page.ready_to_save', 'Ready to save')}</div>
                <div className="text-sm text-muted-foreground">
                  {t('attendance_page.sync_info', 'Attendance saves for {{date}} and stays synced across admin and teacher portals.', { date: selectedDate })}
                </div>
              </div>
              <Button 
                onClick={handleSubmitAttendance} 
                disabled={submitAttendance.isPending || stats.total === 0}
              >
                {submitAttendance.isPending ? t('common.saving', 'Saving...') : existingAttendances.length > 0 ? t('attendance_page.update_attendance_btn', 'Update Attendance') : t('attendance_page.submit_attendance_btn', 'Submit Attendance')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
