import React from 'react';
import { Card, CardHeader, CardContent } from "../ui/card";
import { CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define chart data structures
interface ChartData {
  [key: string]: any;
}

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
}

interface PerformanceData {
  name: string;
  value: number;
  color: string;
}

interface AssignmentData {
  name: string;
  completed: number;
  pending: number;
  late: number;
}

interface StudentData {
  id: number;
  name: string;
  risk: string;
  reason: string;
  trend: 'improving' | 'stable' | 'declining';
}

interface EnhancedTeacherDashboardProps {
  teacherId: number;
  attendanceData?: AttendanceData[];
  performanceData?: PerformanceData[];
  assignmentData?: AssignmentData[];
  atRiskStudents?: StudentData[];
}

const AttendanceTrendsChart = ({ data }: { data: AttendanceData[] }) => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Attendance Trends</CardTitle>
        <CardDescription>Daily attendance patterns over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="present" stackId="a" fill="#4CAF50" />
            <Bar dataKey="late" stackId="a" fill="#FFC107" />
            <Bar dataKey="absent" stackId="a" fill="#F44336" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const PerformanceDistributionChart = ({ data }: { data: PerformanceData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Distribution</CardTitle>
        <CardDescription>Grade distribution across classes</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const AssignmentCompletionChart = ({ data }: { data: AssignmentData[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Completion</CardTitle>
        <CardDescription>Assignment status by class</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" fill="#4CAF50" />
            <Bar dataKey="pending" fill="#2196F3" />
            <Bar dataKey="late" fill="#F44336" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const AtRiskStudentsList = ({ students }: { students: StudentData[] }) => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Students Requiring Attention</CardTitle>
        <CardDescription>Students who may need additional support</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.map(student => (
            <div key={student.id} className="flex items-start space-x-4 p-3 rounded-lg border">
              <div className={`p-2 rounded-full ${student.risk === 'high' ? 'bg-red-100' : 'bg-amber-100'}`}>
                <AlertCircle className={`h-5 w-5 ${student.risk === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{student.name}</h4>
                <p className="text-sm text-muted-foreground">{student.reason}</p>
                <div className="flex items-center mt-1">
                  {student.trend === 'declining' ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-xs text-red-500">Declining</span>
                    </>
                  ) : student.trend === 'improving' ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-500">Improving</span>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className="text-xs">Stable</Badge>
                    </>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm">Contact</Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export function EnhancedTeacherDashboard({ 
  teacherId,
  attendanceData = [
    { date: 'Mon', present: 22, absent: 3, late: 2 },
    { date: 'Tue', present: 24, absent: 1, late: 2 },
    { date: 'Wed', present: 21, absent: 4, late: 2 },
    { date: 'Thu', present: 23, absent: 2, late: 2 },
    { date: 'Fri', present: 20, absent: 5, late: 2 },
  ],
  performanceData = [
    { name: 'A (90-100)', value: 8, color: '#4CAF50' },
    { name: 'B (80-89)', value: 12, color: '#8BC34A' },
    { name: 'C (70-79)', value: 7, color: '#FFC107' },
    { name: 'D (60-69)', value: 3, color: '#FF9800' },
    { name: 'F (0-59)', value: 2, color: '#F44336' },
  ],
  assignmentData = [
    { name: 'Math', completed: 15, pending: 5, late: 2 },
    { name: 'Science', completed: 12, pending: 8, late: 3 },
    { name: 'English', completed: 18, pending: 2, late: 1 },
    { name: 'History', completed: 10, pending: 10, late: 4 },
  ],
  atRiskStudents = [
    { id: 1, name: 'John Doe', risk: 'high', reason: 'Attendance below 70%', trend: 'declining' },
    { id: 2, name: 'Jane Smith', risk: 'medium', reason: 'Recent performance drop', trend: 'stable' },
    { id: 3, name: 'Mike Johnson', risk: 'high', reason: 'Multiple missing assignments', trend: 'declining' },
    { id: 4, name: 'Sarah Williams', risk: 'medium', reason: 'Grades declining in math', trend: 'improving' },
  ]
}: EnhancedTeacherDashboardProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Enhanced Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AttendanceTrendsChart data={attendanceData} />
        <PerformanceDistributionChart data={performanceData} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AssignmentCompletionChart data={assignmentData} />
        <AtRiskStudentsList students={atRiskStudents} />
      </div>
    </div>
  );
}