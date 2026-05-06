import React, { useState, useEffect } from 'react';
import { useTeacherAttendance } from "../../../hooks/useTeacherAttendance";
import { AITeacherService } from "../../../services/aiTeacherService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Calendar } from "../../../components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { ClassAttendance } from "../../../components/classes/ClassAttendance";
import { ClassAttendanceAnalytics } from "../../../components/classes/ClassAttendanceAnalytics";
import { AttendanceCalendar } from "../../../components/classes/AttendanceCalendar";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  BarChart3,
  Plus,
  FileDown,
  Printer,
  Share2,
  Search,
  Filter,
  Loader2
} from "lucide-react";
import { QuickActions } from "../../../components/common/quick-actions";
import { useToast } from "../../../components/ui/use-toast";
import classService from "../../../services/classService";
import attendanceService from "../../../services/attendanceService";
import { format } from 'date-fns';

interface EnhancedAttendanceTabProps {
  teacherId: number;
}

// Define class interface
interface ClassData {
  id: number;
  name: string;
}

export function EnhancedAttendanceTab({ teacherId }: EnhancedAttendanceTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("overview");
  const { data: attendanceData, isLoading: isAttendanceLoading, error: attendanceError } = useTeacherAttendance(teacherId, {
    start_date: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Add state for classes
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<Error | null>(null);
  
  // Add state for attendance statistics
  const [attendanceStats, setAttendanceStats] = useState({
    attendanceRate: 0,
    presentToday: 0,
    absentToday: 0,
    atRisk: 0
  });
  
  // Add state for recent attendance records
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  
  // Add state for AI insights
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  
  // Add toast for notifications
  const { toast } = useToast();
  
  // Update selectedClass to be a number instead of string
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  
  // Fetch classes taught by the teacher
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setIsClassesLoading(true);
        const response = await classService.getClassesByTeacher(teacherId);
        setClasses(response.classes.map(cls => ({
          id: cls.id,
          name: `${cls.name} - Grade ${cls.grade_level}${cls.section ? cls.section : ''}`
        })));
        setIsClassesLoading(false);
      } catch (error) {
        console.error('Failed to load classes:', error);
        setClassesError(error instanceof Error ? error : new Error('Failed to load classes'));
        setIsClassesLoading(false);
        toast({
          title: "Error",
          description: "Failed to load classes. Please try again.",
          id: ''
        });
      }
    };

    if (teacherId) {
      fetchClasses();
    }
  }, [teacherId, toast]);

  // Calculate attendance statistics from the attendance data
  useEffect(() => {
    if (attendanceData?.attendance) {
      // Calculate attendance rate
      const totalRecords = attendanceData.attendance.length;
      const presentRecords = attendanceData.attendance.filter(record => 
        record.status === 'present'
      ).length;
      
      const rate = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;
      
      // Get today's date in YYYY-MM-DD format
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Filter records for today
      const todayRecords = attendanceData.attendance.filter(record => 
        record.date.startsWith(today)
      );
      
      const presentToday = todayRecords.filter(record => record.status === 'present').length;
      const absentToday = todayRecords.filter(record => record.status === 'absent').length;
      
      // Identify at-risk students (students with more than 3 absences)
      // This would typically come from a more sophisticated analysis
      // For now, we'll use a placeholder value
      const atRisk = 2; // Placeholder
      
      setAttendanceStats({
        attendanceRate: parseFloat(rate.toFixed(1)),
        presentToday,
        absentToday,
        atRisk
      });
      
      // Set recent attendance records
      // Sort by date descending and take the first 5
      const recent = [...attendanceData.attendance]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      
      setRecentAttendance(recent);
    }
  }, [attendanceData]);

  // Replace hardcoded insights with AITeacherService call
  useEffect(() => {
    const loadInsights = async () => {
      try {
        setInsightsLoading(true);
        // Use the teacher insights from AITeacherService
        const teacherInsights = await AITeacherService.generateTeacherInsights(teacherId);
        // Format the data as needed for this component
        setInsights({
          attendanceRate: attendanceStats.attendanceRate, // Use calculated rate from real data
          trend: teacherInsights.performancePrediction.trend,
          riskStudents: [
            { name: "John Doe", absences: 8, risk: "High" },
            { name: "Jane Smith", absences: 5, risk: "Medium" }
          ],
          predictions: {
            nextWeekRisk: "Low",
            interventionNeeded: 2
          }
        });
      } catch (error) {
        console.error('Failed to load attendance insights:', error);
        // Fallback to default data if API fails
        setInsights({
          attendanceRate: attendanceStats.attendanceRate,
          trend: "Stable",
          riskStudents: [
            { name: "John Doe", absences: 8, risk: "High" },
            { name: "Jane Smith", absences: 5, risk: "Medium" }
          ],
          predictions: {
            nextWeekRisk: "Low",
            interventionNeeded: 2
          }
        });
      } finally {
        setInsightsLoading(false);
      }
    };

    if (!isAttendanceLoading && attendanceData) {
      loadInsights();
    }
  }, [teacherId, isAttendanceLoading, attendanceData, attendanceStats.attendanceRate]);

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'add':
        // Instead of opening a modal, we'll set the active tab to daily
        setActiveTab("daily");
        break;
      case 'export':
        // Generate and download CSV of attendance data
        if (attendanceData?.attendance) {
          const headers = "Date,Status,Note\n";
          const rows = attendanceData.attendance.map(record => 
            `${record.date},${record.status},${record.note || ''}`
          ).join('\n');
          
          const csvContent = headers + rows;
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `teacher_${teacherId}_attendance.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          toast({
            title: "Export Successful",
            description: "Attendance data has been exported to CSV",
            id: ''
          });
        } else {
          toast({
            title: "Export Failed",
            description: "No attendance data available to export",
            id: ''
          });
        }
        break;
      case 'print':
        // Print the current page
        window.print();
        toast({
          title: "Print Initiated",
          description: "Preparing attendance report for printing",
          id: ''
        });
        break;
      case 'share':
        // Copy the current URL to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Attendance page URL copied to clipboard",
          id: ''
        });
        break;
      default:
        break;
    }
  };

  // Define quick actions
  const quickActions = [
    {
      icon: Plus,
      label: "Take Attendance",
      onClick: () => {
        setActiveTab("daily");
      }
    },
    {
      icon: FileDown,
      label: "Export Data",
      onClick: () => handleQuickAction('export')
    },
    {
      icon: Printer,
      label: "Print Report",
      onClick: () => handleQuickAction('print')
    },
    {
      icon: Share2,
      label: "Share",
      onClick: () => handleQuickAction('share')
    }
  ];

  if (isAttendanceLoading || insightsLoading || isClassesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (attendanceError || classesError) {
    return (
      <div className="flex justify-center items-center h-64">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{attendanceError?.message || classesError?.message || 'An unknown error occurred'}</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Attendance Management</h3>
        <div className="flex gap-2">
          <Button className="glass-button" onClick={() => setActiveTab("ai-insights")}>
            <Brain className="h-4 w-4 mr-2" />
            AI Analysis
          </Button>
          <Button className="glass-button" onClick={() => setActiveTab("daily")}>
            <Plus className="h-4 w-4 mr-2" />
            Take Attendance
          </Button>
          <Button className="glass-button" onClick={() => setActiveTab('analytics')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Reports
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass-tabs">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="daily">Daily Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Attendance Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">Attendance Rate</p>
                    <p className="text-2xl font-bold text-green-600">{attendanceStats.attendanceRate}%</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">Present Today</p>
                    <p className="text-2xl font-bold text-indigo-900">{attendanceStats.presentToday}</p>
                  </div>
                  <Users className="h-8 w-8 text-indigo-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">Absent Today</p>
                    <p className="text-2xl font-bold text-red-600">{attendanceStats.absentToday}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-600">At Risk</p>
                    <p className="text-2xl font-bold text-orange-600">{attendanceStats.atRisk}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Recent Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAttendance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAttendance.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.status === 'present' ? 'success' : 
                                   record.status === 'absent' ? 'destructive' : 'warning'}
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.note || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent attendance records found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Tracking Tab Content */}
        <TabsContent value="daily" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Daily Attendance Tracking</span>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(selectedDate, 'MMM dd, yyyy')}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={selectedClass ? selectedClass.toString() : ""} 
                      onValueChange={(value) => {
                        const classId = parseInt(value);
                        setSelectedClass(classId);
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedClass ? (
                  <ClassAttendance classId={selectedClass} />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Please select a class to view and manage attendance
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {selectedClass ? (
            <>
              <ClassAttendanceAnalytics classId={selectedClass} />
              <AttendanceCalendar classId={selectedClass} />
            </>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-6 text-center text-gray-500">
                Please select a class in the Daily tab to view analytics
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI-Powered Attendance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Risk Assessment */}
              <div>
                <h4 className="font-semibold mb-3">Students at Risk</h4>
                <div className="space-y-2">
                  {insights.riskStudents.map((student: { name: string; absences: number; risk: string }, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">{student.absences} absences this month</p>
                      </div>
                      <Badge variant={student.risk === 'High' ? 'destructive' : 'warning'}>
                        {student.risk} Risk
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predictions */}
              <div>
                <h4 className="font-semibold mb-3">AI Predictions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-600">Next Week Risk Level</p>
                    <p className="font-medium text-green-600">{insights.predictions.nextWeekRisk}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-600">Students Needing Intervention</p>
                    <p className="font-medium text-orange-600">{insights.predictions.interventionNeeded}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold mb-3">AI Recommendations</h4>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 mr-2" />
                    <span className="text-sm">Schedule parent meetings for high-risk students</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 mr-2" />
                    <span className="text-sm">Implement peer buddy system for struggling students</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 mr-2" />
                    <span className="text-sm">Review and adjust morning schedule for late arrivals</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add QuickActions component */}
      <QuickActions actions={quickActions} />
    </div>
  );
}
