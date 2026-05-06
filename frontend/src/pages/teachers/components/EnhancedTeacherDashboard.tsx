import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import dashboardService from '../../../services/dashboardService';
import teacherService from '../../../services/teacherService';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Award,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { Teacher } from '../../../types/teacher.types';

interface EnhancedTeacherDashboardProps {
  teacher: Teacher;
  classesCount: number;
  isMobile?: boolean;
}

interface TeacherDashboardStats {
  studentsCount: number;
  attendanceRate: number;
  pendingGrades: number;
  upcomingClasses: number;
  completedLessons: number;
  totalLessons: number;
  averageGrade: number;
  messageCount: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
  }>;
}

export function EnhancedTeacherDashboard({ teacher, classesCount, isMobile = false }: EnhancedTeacherDashboardProps) {
  const navigate = useNavigate();

  // Fetch teacher dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['teacher-dashboard-stats', teacher.id],
    queryFn: async (): Promise<TeacherDashboardStats> => {
      try {
        // Get general dashboard statistics
        const generalStats = await dashboardService.getStatistics('teacher');
        
        // Get teacher-specific data
        const teacherData = await teacherService.getTeacherById(teacher.id);
        const teacherClassesResponse = await teacherService.getTeacherClasses(teacher.id);
        const teacherClasses = teacherClassesResponse.classes || []; // Extract the classes array
        const upcomingEvents = await dashboardService.getCalendarEvents();
        
        // Calculate derived statistics
        const totalStudents = teacherClasses.reduce((sum, cls) => sum + (cls.studentCount || 0), 0);
        const pendingGrades = await teacherService.getPendingGrades(teacher.id);
        const recentMessages = await teacherService.getRecentMessages(teacher.id, 10);
        
        return {
          studentsCount: totalStudents,
          attendanceRate: generalStats.find(s => s.title === 'Attendance Rate')?.value as number || 0,
          pendingGrades: pendingGrades.length,
          upcomingClasses: teacherClasses.filter(cls => {
            const today = new Date();
            const classDate = new Date(cls.nextSession || '');
            return classDate > today && classDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          }).length,
          completedLessons: generalStats.find(s => s.title === 'Completed Lessons')?.value as number || 0,
          totalLessons: generalStats.find(s => s.title === 'Total Lessons')?.value as number || 0,
          averageGrade: generalStats.find(s => s.title === 'Average Grade')?.value as number || 0,
          messageCount: recentMessages.filter(msg => !msg.read).length,
          recentActivities: generalStats.slice(0, 5).map(stat => ({
            id: stat.id,
            type: 'statistic',
            description: `${stat.title}: ${stat.value}`,
            timestamp: new Date().toISOString()
          })),
          upcomingEvents: upcomingEvents.slice(0, 3).map(event => ({
            id: event.id,
            title: event.title,
            date: event.date,
            type: event.type
          }))
        };
      } catch (error) {
        console.error('Error fetching teacher dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Loading state
  if (statsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (statsError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-sm text-gray-600 mb-4">There was an error loading your dashboard data.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardStats!;
  const progressPercentage = stats.totalLessons > 0 ? (stats.completedLessons / stats.totalLessons) * 100 : 0;

  return (
    <div className={`space-y-6 ${isMobile ? 'px-4' : ''}`}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {teacher.firstName}!</h2>
        <p className="opacity-90">Here's what's happening in your classes today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Students Count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studentsCount}</div>
            <p className="text-xs text-muted-foreground">
              Across {classesCount} classes
            </p>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate.toFixed(1)}%</div>
            <Progress value={stats.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>

        {/* Pending Grades */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grades</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingGrades}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingGrades > 0 ? 'Need attention' : 'All caught up!'}
            </p>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messageCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.messageCount > 0 ? 'New messages' : 'No new messages'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lesson Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Lesson Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Completed: {stats.completedLessons}</span>
                <span>Total: {stats.totalLessons}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {progressPercentage.toFixed(1)}% of curriculum completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingEvents.length > 0 ? (
                stats.upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/teachers/classes')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-6 w-6 mb-2 text-indigo-600" />
              <span className="text-sm font-medium">View Classes</span>
            </button>
            
            <button
              onClick={() => navigate('/teachers/grades')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Award className="h-6 w-6 mb-2 text-green-600" />
              <span className="text-sm font-medium">Grade Assignments</span>
            </button>
            
            <button
              onClick={() => navigate('/teachers/schedule')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Calendar className="h-6 w-6 mb-2 text-blue-600" />
              <span className="text-sm font-medium">View Schedule</span>
            </button>
            
            <button
              onClick={() => navigate('/messages')}
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <MessageSquare className="h-6 w-6 mb-2 text-purple-600" />
              <span className="text-sm font-medium">Messages</span>
              {stats.messageCount > 0 && (
                <Badge variant="destructive" className="mt-1">
                  {stats.messageCount}
                </Badge>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.averageGrade.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Class Average</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.attendanceRate.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.upcomingClasses}</div>
              <p className="text-sm text-muted-foreground">Upcoming Classes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}