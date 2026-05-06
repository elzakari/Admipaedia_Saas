import React from "react";
import { Eye, Pencil, MoreHorizontal, Clock, Mail, Phone, GraduationCap, CheckCircle, AlertCircle, XCircle, BookOpen } from "lucide-react";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";

interface Student {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  email: string;
  phone: string;
  attendance: number;
  performance: number;
  status: string;
  lastActive: string;
  profileImage: string;
  recentGrades: {
    subject: string;
    grade: string;
    score: number;
  }[];
  // Add other properties as needed
}

interface StudentDetailedProps {
  students: Student[];
  selectedStudent: string | null;
  handleStudentSelect: (id: string) => void;
}

const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return 'text-green-600 dark:text-green-400';
  if (grade.startsWith('B')) return 'text-blue-600 dark:text-blue-400';
  if (grade.startsWith('C')) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const StudentDetailed: React.FC<StudentDetailedProps> = ({ students, selectedStudent, handleStudentSelect }) => {
  return (
    <div className="space-y-4">
      {students.map((student) => (
        <Card
          key={student.id}
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            selectedStudent === student.id ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleStudentSelect(student.id)}
        >
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex flex-col items-center space-y-2">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={student.profileImage} alt={student.name} />
                  <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="font-medium text-lg text-center">{student.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
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
                  {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                </Badge>
              </div>
              <div className="flex-grow space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Student ID</h4>
                    <p className="font-medium">{student.studentId}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Grade</h4>
                    <p className="font-medium">{student.grade}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</h4>
                    <p className="font-medium">{student.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Phone</h4>
                    <p className="font-medium">{student.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Recent Grades</h4>
                  <div className="flex flex-wrap gap-2">
                    {student.recentGrades.map((grade, index) => (
                      <div key={index} className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-1">
                        <span className="text-xs">{grade.subject}:</span>
                        <span className={`text-xs font-medium ${getGradeColor(grade.grade)}`}>{grade.grade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 flex justify-between">
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              View Profile
            </Button>
            <Button variant="ghost" size="sm">
              <Mail className="h-4 w-4 mr-1" />
              Message
            </Button>
            <Button variant="ghost" size="sm">
              <BookOpen className="h-4 w-4 mr-1" />
              Report
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default StudentDetailed;