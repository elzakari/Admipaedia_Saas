import React, { useState } from 'react';
import { useClass } from '../../hooks/useClasses';
import { useSubmitClassAttendance } from '../../hooks/useClassAttendance';
import { useStudents } from '../../hooks/useStudents';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle, XCircle, Clock, Calendar as CalendarIcon2 } from 'lucide-react';

interface ClassAttendanceProps {
  classId: number;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  status?: 'present' | 'absent' | 'late' | 'excused';
}

export function ClassAttendance({ classId }: ClassAttendanceProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [studentsWithStatus, setStudentsWithStatus] = useState<Student[]>([]);
  
  const { data: classData } = useClass(classId);
  const submitAttendance = useSubmitClassAttendance();
  
  // Fetch students for this class using the useStudents hook
  const { data: studentsData, isLoading } = useStudents({ class_id: classId });
  
  // Update studentsWithStatus when studentsData changes
  React.useEffect(() => {
    if (studentsData?.students) {
      const formattedStudents = studentsData.students.map(student => ({
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        status: undefined
      }));
      setStudentsWithStatus(formattedStudents);
    }
  }, [studentsData]);
  
  // Handle attendance status change
  const handleStatusChange = (studentId: number, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudentsWithStatus(studentsWithStatus.map(student => 
      student.id === studentId ? { ...student, status } : student
    ));
  };
  
  // Handle bulk actions
  const markAllPresent = () => {
    setStudentsWithStatus(studentsWithStatus.map(student => ({
      ...student,
      status: 'present'
    })));
  };

  const markAllAbsent = () => {
    setStudentsWithStatus(studentsWithStatus.map(student => ({
      ...student,
      status: 'absent'
    })));
  };

  const markAllLate = () => {
    setStudentsWithStatus(studentsWithStatus.map(student => ({
      ...student,
      status: 'late'
    })));
  };

  const markAllExcused = () => {
    setStudentsWithStatus(studentsWithStatus.map(student => ({
      ...student,
      status: 'excused'
    })));
  };
  
  // Handle attendance submission
  const handleSubmitAttendance = async () => {
    if (!classId) return;
    
    try {
      // Prepare data for submission
      const attendanceData = {
        class_id: classId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        attendances: studentsWithStatus.map(student => ({
          student_id: student.id,
          status: student.status || 'absent', // Default to absent if not marked
          remarks: ''
        }))
      };
      
      // Use the mutation hook to submit attendance
      await submitAttendance.mutateAsync(attendanceData);
      toast.success('Attendance submitted successfully');
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error('Failed to submit attendance');
    }
  };

  // Calculate attendance statistics
  const calculateStats = () => {
    let present = 0, absent = 0, late = 0, excused = 0;
    studentsWithStatus.forEach(student => {
      if (student.status === 'present') present++;
      else if (student.status === 'absent') absent++;
      else if (student.status === 'late') late++;
      else if (student.status === 'excused') excused++;
    });
    const total = studentsWithStatus.length;
    return { present, absent, late, excused, total };
  };

  const stats = calculateStats();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Attendance</CardTitle>
        <CardDescription>
          {classData?.name ? `Taking attendance for ${classData.name}` : 'Mark attendance for your class'}
        </CardDescription>
        <div className="flex items-center space-x-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialDate={selectedDate}
                onEventClick={(event) => {
                  // Create a new date based on the event day
                  if (event && typeof event.day === 'number') {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(event.day);
                    setSelectedDate(newDate);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading students...</div>
        ) : studentsWithStatus.length === 0 ? (
          <div className="text-center py-4">No students found in this class.</div>
        ) : (
          <>
            <div className="mb-4 flex space-x-2">
              <Button variant="outline" onClick={markAllPresent}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark All Present
              </Button>
              <Button variant="outline" onClick={markAllAbsent}>
                <XCircle className="h-4 w-4 mr-1" />
                Mark All Absent
              </Button>
              <Button variant="outline" onClick={markAllLate}>
                <Clock className="h-4 w-4 mr-1" />
                Mark All Late
              </Button>
              <Button variant="outline" onClick={markAllExcused}>
                <CalendarIcon2 className="h-4 w-4 mr-1" />
                Mark All Excused
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
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
                          {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not marked</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={student.status === 'present' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'present')}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={student.status === 'absent' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'absent')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Absent
                        </Button>
                        <Button
                          size="sm"
                          variant={student.status === 'late' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'late')}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant={student.status === 'excused' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'excused')}
                        >
                          <CalendarIcon2 className="h-4 w-4 mr-1" />
                          Excused
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex justify-between items-center">
              <div className="flex space-x-4">
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Present: {stats.present}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm">Absent: {stats.absent}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm">Late: {stats.late}</span>
                </div>
                <div className="flex items-center">
                  <div className="h-3 w-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm">Excused: {stats.excused}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleSubmitAttendance} 
                  disabled={submitAttendance.isPending}
                >
                  {submitAttendance.isPending ? 'Submitting...' : 'Submit Attendance'}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
