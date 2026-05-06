import React from "react";
import { Eye, Pencil, Trash2, MessageSquare, MoreHorizontal, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

import { TransformedStudent } from '../../types/student';

// Fix the interface to use TransformedStudent consistently
interface StudentGridProps {
  students: TransformedStudent[];
  selectedStudent: string | null;
  handleStudentSelect: (id: string) => void;
  handleEditStudent?: (student: TransformedStudent) => void; // Keep as TransformedStudent
  handleDeleteStudent?: (student: TransformedStudent) => void; // Keep as TransformedStudent
}

const StudentGrid: React.FC<StudentGridProps> = ({ 
  students, 
  selectedStudent, 
  handleStudentSelect,
  handleEditStudent,
  handleDeleteStudent 
}) => {
  const getStudentInitials = (student: TransformedStudent) => {
    const firstInitial = student.first_name?.charAt(0) || '';
    const lastInitial = student.last_name?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => (
        <Card
          key={student.id}
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            selectedStudent === student.id ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleStudentSelect(student.id)}
        >
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student.profileImage} alt={student.display_name} />
                <AvatarFallback>{getStudentInitials(student)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-lg">{student.display_name || student.full_name || student.name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student'}</h3>
                {student.middle_name && (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {student.full_name}
                  </p>
                )}
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {student.grade} • {student.studentId}
                </p>
                <Badge
                  variant={
                    student.status === "active"
                      ? "success"
                      : student.status === "warning"
                      ? "warning"
                      : "destructive"
                  }
                  className="mt-2"
                >
                  {student.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {student.status === "warning" && <AlertCircle className="h-3 w-3 mr-1" />}
                  {student.status === "danger" && <XCircle className="h-3 w-3 mr-1" />}
                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Attendance</span>
                  <span className="font-medium">{student.attendance}%</span>
                </div>
                <Progress value={student.attendance} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Performance</span>
                  <span className="font-medium">{student.performance}%</span>
                </div>
                <Progress value={student.performance} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between">
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Subjects</p>
                <p className="font-medium">{student.subjects.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Assignments</p>
                <p className="font-medium">{student.pendingAssignments + student.completedAssignments}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">Achievements</p>
                <p className="font-medium">{student.achievements.length}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 flex justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/students/${student.id}`;
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            
            {handleEditStudent && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStudent(student);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/students/${student.id}`;
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Profile
                </DropdownMenuItem>
                {handleEditStudent && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStudent(student);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Student
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    const name = `${(student as any).first_name || ''} ${(student as any).last_name || ''}`.trim();
                    const subject = name ? `Message to ${name}` : 'Message';
                    window.location.href = `/messages?compose=1&recipient_type=student&recipient_id=${student.id}&subject=${encodeURIComponent(subject)}`;
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </DropdownMenuItem>
                {handleDeleteStudent && (
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteStudent(student);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Student
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default StudentGrid;

