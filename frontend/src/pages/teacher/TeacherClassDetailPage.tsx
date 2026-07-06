import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { ChevronRight, Users, CalendarCheck2, BadgeCheck, ClipboardList, Megaphone, Loader2 } from 'lucide-react';
import { TeacherClassRosterTab } from './components/TeacherClassRosterTab';
import { TeacherClassAttendanceTab } from './components/TeacherClassAttendanceTab';
import { TeacherClassGradebookTab } from './components/TeacherClassGradebookTab';
import { TeacherClassAssignmentsTab } from './components/TeacherClassAssignmentsTab';
import { TeacherClassAnnouncementsTab } from './components/TeacherClassAnnouncementsTab';
import api from '../../lib/api';
import { getClassDisplayName } from '../../utils/formatters';
import { resolveStudentAvatar } from '../../utils/avatar';

const TeacherClassDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { classId } = useParams();

  const [classInfo, setClassInfo] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadClassDetail() {
      if (!classId) return;
      try {
        setLoading(true);
        // Fetch class detail
        const classRes = await api.get(`/classes/${classId}`);
        const classData = classRes.data?.data || classRes.data?.class || classRes.data;
        
        // Fetch students in this class
        const studentsRes = await api.get('/students', { params: { class_id: classId, per_page: 100 } });
        const studentsData = studentsRes.data?.students || studentsRes.data?.data?.students || studentsRes.data?.data || [];
        
        if (active) {
          setClassInfo(classData);
          setRoster(studentsData.map((s: any) => ({
            id: s.id.toString(),
            name: s.full_name || `${s.first_name} ${s.last_name}`,
            status: s.status || 'active',
            avatar: resolveStudentAvatar(s)
          })));
        }
      } catch (err: any) {
        if (active) {
          const status = err.response?.status;
          if (status === 403) {
            setError("Vous n’êtes pas autorisé à accéder aux élèves de cette classe.");
          } else if (status === 404) {
            setError("Classe non trouvée.");
          } else if (status === 401) {
            alert("Votre session a expiré. Veuillez vous reconnecter.");
            setError("Session expirée. Veuillez vous reconnecter.");
          } else {
            setError(err.message || 'Failed to load class workspace.');
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadClassDetail();
    return () => { active = false; };
  }, [classId]);

  const cls = useMemo(() => {
    if (!classInfo) return null;
    return {
      id: classId!,
      className: getClassDisplayName(classInfo),
      subject: classInfo.grade_level_name || 'Class Workspace',
      room: classInfo.room || classInfo.room_number,
      term: classInfo.academic_year,
      roster: roster
    };
  }, [classInfo, roster, classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !cls) {
    let title = t('teacher_portal.class_detail.class_not_found');
    let description = error || t('teacher_portal.class_detail.class_not_available');

    if (error === "Vous n’êtes pas autorisé à accéder aux élèves de cette classe.") {
      title = "Accès refusé";
    } else if (error === "Classe non trouvée.") {
      title = "Classe non trouvée";
    } else if (error === "Session expirée. Veuillez vous reconnecter.") {
      title = "Session expirée";
    }

    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/teacher/classes" className="text-indigo-600 hover:text-indigo-700">{t('teacher_portal.class_detail.back_to_classes')}</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center text-sm text-indigo-700">
        <Link to="/teacher/classes" className="hover:text-indigo-900">{t('teacher_portal.class_detail.my_classes')}</Link>
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
              <span className="text-slate-600 dark:text-slate-400">{t('teacher_portal.class_detail.term')}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{cls.term ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">{t('teacher_portal.class_detail.students')}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{cls.roster.length}</span>
            </div>
            <div className="text-xs text-slate-500">{t('teacher_portal.class_detail.actions_scoped')}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <Tabs defaultValue="roster" className="w-full">
              <div className="px-6 pt-6">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="roster" className="min-w-[140px]">
                    <Users className="h-4 w-4 mr-2" />
                    Roster
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="min-w-[140px]">
                    <CalendarCheck2 className="h-4 w-4 mr-2" />
                    {t('teacher_portal.class_detail.tabs.attendance')}
                  </TabsTrigger>
                  <TabsTrigger value="gradebook" className="min-w-[140px]">
                    <BadgeCheck className="h-4 w-4 mr-2" />
                    {t('teacher_portal.class_detail.tabs.gradebook')}
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="min-w-[140px]">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    {t('teacher_portal.class_detail.tabs.assignments')}
                  </TabsTrigger>
                  <TabsTrigger value="announcements" className="min-w-[160px]">
                    <Megaphone className="h-4 w-4 mr-2" />
                    {t('teacher_portal.class_detail.tabs.announcements')}
                  </TabsTrigger>
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
