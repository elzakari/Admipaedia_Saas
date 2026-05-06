import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Progress } from "../ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Search, Plus, MoreHorizontal } from 'lucide-react';
import studentService from "../../services/studentService";

interface ClassStudentsTabProps {
  classId: number;
}

interface Student {
  id: number;
  name: string;
  attendance: number;
  performance: number;
  status: string;
}

export function ClassStudentsTab({ classId }: ClassStudentsTabProps) {
  // Fetch students for selected class
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['class-students', classId],
    queryFn: () => studentService.getStudentsByClass(classId),
    enabled: !!classId,
  });
  
  // Handle both array and object with students property
  const students = Array.isArray(studentsData) ? studentsData : studentsData?.students || [];
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." className="pl-8" />
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-4">Loading students...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student: Student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{student.name ? student.name.toString().split(' ').map((n: string) => n[0]).join('') : 'S'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">Student ID: {student.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{student.attendance}%</p>
                    <Progress 
                      value={student.attendance} 
                      className={`h-2 ${
                        student.attendance >= 90 ? "bg-green-500" :
                        student.attendance >= 80 ? "bg-blue-500" :
                        student.attendance >= 70 ? "bg-yellow-500" :
                        "bg-red-500"
                      }`} 
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{student.performance}%</p>
                    <Progress 
                      value={student.performance} 
                      className={`h-2 ${
                        student.performance >= 90 ? "bg-green-500/20" :
                        student.performance >= 80 ? "bg-blue-500/20" :
                        student.performance >= 70 ? "bg-yellow-500/20" :
                        "bg-red-500/20"
                      }`} 
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={student.status === 'active' ? 'default' : 'destructive'}
                    className={student.status === 'at-risk' ? 'bg-amber-500' : ''}
                  >
                    {student.status === 'active' ? 'Active' : 'At Risk'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Contact Parent</DropdownMenuItem>
                      <DropdownMenuItem>View Grades</DropdownMenuItem>
                      <DropdownMenuItem>View Attendance</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}