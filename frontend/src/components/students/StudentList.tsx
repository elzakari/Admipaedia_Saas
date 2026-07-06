import React from "react";
import { Eye, Pencil, Trash2, MoreHorizontal, Clock, Mail, Phone, GraduationCap, CheckCircle, AlertCircle, XCircle, Printer, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

import { TransformedStudent } from '../../types/student';
import { resolveAvatarUrl } from '../../utils/avatar';

// Remove local Student interface and use the centralized one
interface StudentListProps {
  students: TransformedStudent[];
  selectedStudent: string | null;
  handleStudentSelect: (id: string) => void;
  handleEditStudent?: (student: TransformedStudent) => void;
  handleDeleteStudent?: (student: TransformedStudent) => void;
  selectedStudents?: string[];
  handleSelectStudent?: (id: string, checked: boolean) => void;
  handleSelectAll?: (checked: boolean) => void;
}

// Update the component to use all handlers
const StudentList: React.FC<StudentListProps> = ({ 
  students, 
  selectedStudent, 
  handleStudentSelect,
  handleEditStudent,
  handleDeleteStudent,
  selectedStudents = [],
  handleSelectStudent,
  handleSelectAll
}) => {
  console.log('StudentList received students:', students);
  
  const hasSelectionFeature = !!handleSelectStudent && !!handleSelectAll;
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {hasSelectionFeature && (
              <th className="p-4 w-10">
                <Checkbox 
                  checked={students.length > 0 && selectedStudents.length === students.length}
                  onCheckedChange={(checked) => handleSelectAll?.(!!checked)}
                />
              </th>
            )}
            <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Student</th>
            <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">ID / Grade</th>
            <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Contact</th>
            <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Attendance</th>
            <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Performance</th>
            <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="text-left p-4 font-medium text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.length === 0 ? (
            <tr>
              <td colSpan={hasSelectionFeature ? 8 : 7} className="p-8 text-center text-slate-500">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Users className="h-12 w-12 text-slate-300" />
                  <p className="text-lg font-medium">No students found</p>
                  <p className="text-sm">There are no students matching your current criteria.</p>
                </div>
              </td>
            </tr>
          ) : (
            students.map((student) => (
            <tr
              key={student.id}
              className={`border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${
                selectedStudent === student.id ? "bg-slate-50 dark:bg-slate-800/50" : ""
              }`}
              onClick={() => handleStudentSelect(student.id)}
            >
              {hasSelectionFeature && (
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) => handleSelectStudent?.(student.id, !!checked)}
                  />
                </td>
              )}
              <td className="p-4">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-4">
                    <AvatarImage src={resolveAvatarUrl(student.profileImage)} alt={student.display_name || student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student'} />
                    <AvatarFallback>
                      {student.first_name && student.last_name 
                        ? `${student.first_name.charAt(0)}${student.last_name.charAt(0)}` 
                        : (student.name ? student.name.charAt(0) : '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {student.display_name || student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student'}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{student.email}</div>
                  </div>
                </div>
              </td>
              <td className="p-4">
                <div className="font-medium flex items-center">
                  <GraduationCap className="h-4 w-4 mr-1 text-primary" />
                  {student.studentId}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Grade {student.grade}</div>
              </td>
              <td className="p-4">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-1 text-slate-400" />
                  <span className={student.email === "No email provided" ? "text-slate-400 italic" : ""}>
                    {student.email}
                  </span>
                </div>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                  <Phone className="h-4 w-4 mr-1 text-slate-400" />
                  <span className={student.phone === "No phone provided" ? "text-slate-400 italic" : ""}>
                    {student.phone}
                  </span>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  <Progress value={student.attendance} className="w-[60px]" />
                  <span className="text-sm font-medium">{student.attendance}%</span>
                </div>
              </td>
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  <Progress value={student.performance} className="w-[60px]" />
                  <span className="text-sm font-medium">{student.performance}%</span>
                </div>
              </td>
              <td className="p-4">
                <Badge
                  variant={
                    student.status === "active"
                      ? "success"
                      : student.status === "warning"
                      ? "warning"
                      : "destructive"
                  }
                >
                  {student.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {student.status === "warning" && <AlertCircle className="h-3 w-3 mr-1" />}
                  {student.status === "danger" && <XCircle className="h-3 w-3 mr-1" />}
                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </Badge>
              </td>
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStudentSelect(student.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {handleEditStudent && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStudent(student);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {handleDeleteStudent && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStudent(student);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => {
                          setTimeout(() => {
                            window.location.href = `/students/${student.id}`;
                          }, 0);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Full Profile
                      </DropdownMenuItem>
                      {handleEditStudent && (
                        <DropdownMenuItem
                          onSelect={() => {
                            setTimeout(() => handleEditStudent(student), 0);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Student
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onSelect={() => {
                          setTimeout(() => window.print(), 0);
                        }}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Details
                      </DropdownMenuItem>
                      {handleDeleteStudent && (
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onSelect={() => {
                            setTimeout(() => handleDeleteStudent(student), 0);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Student
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </td>
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
};

// Enhanced loading skeleton
const StudentListSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="w-20 h-8 bg-gray-200 rounded"></div>
      </div>
    ))}
  </div>
);

export default StudentList;
