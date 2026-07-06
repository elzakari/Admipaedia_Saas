import React, { useState } from "react";
import { 
  X, 
  Mail, 
  Phone, 
  Calendar, 
  BookOpen, 
  Award, 
  CheckCircle, 
  FileText, 
  MessageSquare 
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { resolveStudentAvatar } from "../../utils/avatar";

interface StudentProfileProps {
  student: any;
  onClose: () => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState("performance");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={resolveStudentAvatar(student)} alt={student.name} />
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{student.name}</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Grade {student.grade} • {student.studentId}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</h4>
            <p className="font-medium">{student.email}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Phone</h4>
            <p className="font-medium">{student.phone}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Enrollment Date</h4>
            <p className="font-medium">{student.enrollmentDate}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400">Status</h4>
            <Badge
              variant={
                student.status === "active"
                  ? "success"
                  : student.status === "warning"
                  ? "warning"
                  : "destructive"
              }
              className="mt-1"
            >
              {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
            </Badge>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Parent Information</h4>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-md p-3">
            <p className="font-medium">{student.parentInfo.name}</p>
            <div className="mt-1 text-sm">
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-2 text-slate-400" />
                {student.parentInfo.email}
              </div>
              <div className="flex items-center mt-1">
                <Phone className="h-3 w-3 mr-2 text-slate-400" />
                {student.parentInfo.phone}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="performance" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
          </TabsList>
          <TabsContent value="performance" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Performance Trend</h4>
              <div className="h-[200px] bg-slate-50 dark:bg-slate-800/50 rounded-md p-4 flex items-end justify-between">
                {student.performanceHistory.map((item: { value: any; month: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, index: React.Key | null | undefined) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="w-8 bg-primary rounded-t-sm" 
                      style={{ height: `${item.value}px` }}
                    ></div>
                    <span className="text-xs mt-2">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Assignments</h4>
              <div className="flex items-center">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mr-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ 
                      width: `${(student.completedAssignments / (student.completedAssignments + student.pendingAssignments)) * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm whitespace-nowrap">
                  {student.completedAssignments} / {student.completedAssignments + student.pendingAssignments}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {student.pendingAssignments} pending assignments
              </p>
            </div>
          </TabsContent>
          <TabsContent value="attendance" className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Attendance Trend</h4>
              <div className="h-[200px] bg-slate-50 dark:bg-slate-800/50 rounded-md p-4 flex items-end justify-between">
                {student.attendanceHistory.map((item: { value: number; month: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, index: React.Key | null | undefined) => (
                  <div key={index} className="flex flex-col items-center">
                    <div 
                      className="w-8 bg-emerald-500 rounded-t-sm" 
                      style={{ height: `${item.value * 1.5}px` }}
                    ></div>
                    <span className="text-xs mt-2">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Overall Attendance</h4>
              <div className="flex items-center">
                <Progress value={student.attendance} className="flex-grow mr-4" />
                <span className="font-medium">{student.attendance}%</span>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="grades" className="space-y-4">
            <div className="space-y-3">
              {student.recentGrades.map((grade: { subject: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; score: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; grade: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined; }, index: React.Key | null | undefined) => (
                <div key={index} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-2 text-slate-400" />
                    <span>{grade.subject}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">{grade.score}/100</span>
                    <span className={`font-medium px-2 py-0.5 rounded-md ${
                      typeof grade.grade === 'string' && grade.grade.startsWith('A') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      typeof grade.grade === 'string' && grade.grade.startsWith('B') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                      typeof grade.grade === 'string' && grade.grade.startsWith('C') ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {grade.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Upcoming Exams</h4>
          <div className="space-y-2">
            {student.upcomingExams.map((exam: { subject: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; topic: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; date: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, index: React.Key | null | undefined) => (
              <div key={index} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                <div>
                  <p className="font-medium">{exam.subject}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{exam.topic}</p>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                  <span className="text-sm">{exam.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Achievements</h4>
          <div className="space-y-2">
            {student.achievements.map((achievement: { icon: any; name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; date: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, index: React.Key | null | undefined) => {
              const Icon = achievement.icon;
              return (
                <div key={index} className="flex items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{achievement.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{achievement.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button variant="outline" className="flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Full Report
        </Button>
        <Button className="flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact
        </Button>
      </CardFooter>
    </Card>
  );
};

export default StudentProfile;
