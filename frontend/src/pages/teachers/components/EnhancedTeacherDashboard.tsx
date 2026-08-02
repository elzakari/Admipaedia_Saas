import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
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
          <p className="text-sm text-gray-600">{t('common.loading', 'Chargement des données...')}</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('common.error', 'Erreur de chargement')}</h3>
          <p className="text-sm text-gray-600 mb-4">{t('teachers_page.dashboard.load_error', 'Une erreur s\'est produite lors du chargement des données.')}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            {t('common.refresh', 'Réessayer')}
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
        <h2 className="text-2xl font-bold mb-2">{t('teachers_page.dashboard.welcome_back', 'Bon retour, {{name}} !', { name: teacher.firstName })}</h2>
        <p className="opacity-90">{t('teachers_page.dashboard.welcome_desc', 'Voici ce qui se passe dans vos classes aujourd\'hui.')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Students Count */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('students_page.total_students', 'Total Élèves')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.studentsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('teachers_page.dashboard.across_classes', 'Sur {{count}} classes', { count: classesCount })}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500 text-white shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('students_page.avg_attendance', 'Présence Moyenne')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.attendanceRate.toFixed(1)}%</p>
                <Progress value={stats.attendanceRate} className="mt-2 h-1.5" />
              </div>
              <div className="p-3 rounded-xl bg-emerald-500 text-white shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Grades */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('teachers_page.stats.pending_grades', 'Notes en Attente')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.pendingGrades}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingGrades > 0 ? t('teachers_page.dashboard.attention_required', 'Attention requise') : t('teachers_page.dashboard.all_up_to_date', 'Tout est à jour !')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500 text-white shadow-sm">
                <Award className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('teachers_page.dashboard.unread_messages', 'Messages Non Lus')}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{stats.messageCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.messageCount > 0 ? t('teachers_page.dashboard.new_messages', 'Nouveaux messages') : t('teachers_page.dashboard.no_new_messages', 'Aucun nouveau message')}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500 text-white shadow-sm">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
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
              {t('teachers_page.dashboard.lesson_progress', 'Progression des cours')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{t('teachers_page.dashboard.completed_count', 'Terminés : {{count}}', { count: stats.completedLessons })}</span>
                <span>{t('common.total', 'Total : {{count}}', { count: stats.totalLessons })}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {t('teachers_page.dashboard.curriculum_completed', '{{percent}}% du programme terminé', { percent: progressPercentage.toFixed(1) })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              {t('schedule.upcoming_events', 'Événements à venir')}
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
                        {new Date(event.date).toLocaleDateString(i18n.language || 'fr')}
                      </p>
                    </div>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('schedule.no_upcoming_events', 'Aucun événement à venir')}</p>
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