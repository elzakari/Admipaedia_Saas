import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { teacherClasses } from './teacherMockData';
import { ChevronRight, Users, CalendarCheck2, BadgeCheck, ClipboardList, Megaphone } from 'lucide-react';
import { TeacherClassRosterTab } from './components/TeacherClassRosterTab';
import { TeacherClassAttendanceTab } from './components/TeacherClassAttendanceTab';
import { TeacherClassGradebookTab } from './components/TeacherClassGradebookTab';
import { TeacherClassAssignmentsTab } from './components/TeacherClassAssignmentsTab';
import { TeacherClassAnnouncementsTab } from './components/TeacherClassAnnouncementsTab';

const TeacherClassDetailPage: React.FC = () => {
  const { classId } = useParams();
  const cls = useMemo(() => teacherClasses.find((c) => c.id === classId) ?? null, [classId]);

  if (!cls) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Class not found</CardTitle>
            <CardDescription>The class you requested isn’t available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/teacher/classes" className="text-indigo-600 hover:text-indigo-700">Back to My Classes</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center text-sm text-indigo-700">
        <Link to="/teacher/classes" className="hover:text-indigo-900">My Classes</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-indigo-900">{cls.subject} — {cls.className}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{cls.className}</CardTitle>
            <CardDescription>{cls.subject}{cls.room ? ` • ${cls.room}` : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Term</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{cls.term ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">Students</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{cls.roster.length}</span>
            </div>
            <div className="text-xs text-slate-500">Actions are scoped to this class only.</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <Tabs defaultValue="roster" className="w-full">
              <div className="px-6 pt-6">
                <TabsList className="grid grid-cols-5">
                  <TabsTrigger value="roster"><Users className="h-4 w-4 mr-2" />Roster</TabsTrigger>
                  <TabsTrigger value="attendance"><CalendarCheck2 className="h-4 w-4 mr-2" />Attendance</TabsTrigger>
                  <TabsTrigger value="gradebook"><BadgeCheck className="h-4 w-4 mr-2" />Gradebook</TabsTrigger>
                  <TabsTrigger value="assignments"><ClipboardList className="h-4 w-4 mr-2" />Assignments</TabsTrigger>
                  <TabsTrigger value="announcements"><Megaphone className="h-4 w-4 mr-2" />Announcements</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="roster" className="p-6">
                <TeacherClassRosterTab cls={cls} />
              </TabsContent>

              <TabsContent value="attendance" className="p-6">
                <TeacherClassAttendanceTab cls={cls} />
              </TabsContent>

              <TabsContent value="gradebook" className="p-6">
                <TeacherClassGradebookTab cls={cls} />
              </TabsContent>

              <TabsContent value="assignments" className="p-6">
                <TeacherClassAssignmentsTab cls={cls} />
              </TabsContent>

              <TabsContent value="announcements" className="p-6">
                <TeacherClassAnnouncementsTab cls={cls} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherClassDetailPage;
