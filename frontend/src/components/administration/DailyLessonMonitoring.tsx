import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, Clock3, Search, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import classService from '../../services/classService';

const TODAY = new Date().toISOString().slice(0, 10);

function humanizeStatus(status?: string) {
  if (!status) return 'Inconnu';
  if (status === 'completed') return 'Terminé';
  if (status === 'in-progress') return 'En cours';
  if (status === 'planned') return 'Planifié';
  return status
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getStatusVariant(status?: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'in-progress') return 'secondary';
  if (status === 'planned') return 'outline';
  return 'secondary';
}

function formatClassLabel(classItem: any) {
  return classItem?.display_name || [classItem?.name, classItem?.section].filter(Boolean).join(' ') || classItem?.name || `Classe ${classItem?.id}`;
}

const DailyLessonMonitoring: React.FC = () => {
  const { t } = useTranslation();
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(TODAY);
  const [dateTo, setDateTo] = useState(TODAY);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: classesResponse, isLoading: classesLoading } = useQuery({
    queryKey: ['admin-monitoring-classes'],
    queryFn: () => classService.getClasses({ page: 1, per_page: 200 }),
    staleTime: 60_000,
  });

  const {
    data: monitoringResponse,
    isLoading: monitoringLoading,
    isFetching: monitoringRefreshing,
  } = useQuery({
    queryKey: ['daily-lesson-monitoring', selectedClassId, selectedStatus, dateFrom, dateTo],
    queryFn: () =>
      classService.getLessonMonitoring({
        page: 1,
        per_page: 200,
        class_id: selectedClassId !== 'all' ? Number(selectedClassId) : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    staleTime: 30_000,
  });

  const classes = classesResponse?.data || [];
  const summary = monitoringResponse?.summary || {
    total_logs: 0,
    completed_logs: 0,
    in_progress_logs: 0,
    planned_logs: 0,
    today_logs: 0,
    classes_covered: 0,
    teachers_reporting: 0,
    classes_without_logs_today: 0,
  };
  const lessons = monitoringResponse?.lessons || [];

  const filteredLessons = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return lessons;

    return lessons.filter((lesson) => {
      const haystack = [
        lesson.title,
        lesson.description,
        lesson.subject_name,
        lesson.teacher_name,
        lesson.class_name,
        lesson.classwork,
        lesson.homework,
        lesson.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [lessons, searchTerm]);

  const handleReset = () => {
    setSelectedClassId('all');
    setSelectedStatus('all');
    setDateFrom(TODAY);
    setDateTo(TODAY);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold text-slate-900">{t('admin_lessons.title', 'Suivi des leçons quotidiennes')}</h3>
        <p className="text-sm text-slate-500">
          {t('admin_lessons.subtitle', 'Suivez le déroulement des cours quotidiens, la couverture des classes et les rapports d\'enseignants.')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">{t('admin_lessons.journal_logs', 'Cahiers de texte')}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.total_logs}</div>
              <div className="text-xs text-slate-500">{t('admin_lessons.within_filters', 'Selon les filtres actuels')}</div>
            </div>
            <BookOpen className="h-5 w-5 text-indigo-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">{t('admin_lessons.completed_today', 'Terminés aujourd\'hui')}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.today_logs}</div>
              <div className="text-xs text-slate-500">{summary.completed_logs} {t('admin_lessons.marked_completed', 'marqués comme terminés')}</div>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">{t('admin_lessons.classes_covered', 'Classes couvertes')}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.classes_covered}</div>
              <div className="text-xs text-slate-500">{summary.teachers_reporting} {t('admin_lessons.teachers_reporting', 'enseignants rapporteurs')}</div>
            </div>
            <Users className="h-5 w-5 text-sky-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <div className="text-sm text-slate-500">{t('admin_lessons.missing_today', 'Manquants aujourd\'hui')}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{summary.classes_without_logs_today}</div>
              <div className="text-xs text-slate-500">{summary.planned_logs} {t('admin_lessons.still_planned', 'encore planifiés')}</div>
            </div>
            <Clock3 className="h-5 w-5 text-amber-600" />
          </CardContent>
        </Card>
      </div>

      {summary.classes_without_logs_today > 0 ? (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div>
              <div className="font-medium text-amber-900">{t('admin_lessons.coverage_attention', 'La couverture des cours requiert de l\'attention')}</div>
              <div className="text-sm text-amber-800">
                {summary.classes_without_logs_today} {t('admin_lessons.missing_alert_desc', 'espaces de classe n\'ont pas encore de cahier de texte pour aujourd\'hui dans le périmètre de suivi actuel.')}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin_lessons.monitoring_filters', 'Filtres de suivi')}</CardTitle>
          <CardDescription>{t('admin_lessons.monitoring_filters_desc', 'Affinez le flux d\'enseignement quotidien par classe, statut, plage de dates et mot-clé d\'enseignant ou de sujet.')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classesLoading}>
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={String(classItem.id)}>
                    {formatClassLabel(classItem)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('admin_lessons.all_statuses', 'Tous les statuts')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin_lessons.all_statuses', 'Tous les statuts')}</SelectItem>
                <SelectItem value="completed">{t('status.completed', 'Terminé')}</SelectItem>
                <SelectItem value="in-progress">{t('status.in_progress', 'En cours')}</SelectItem>
                <SelectItem value="planned">{t('status.planned', 'Planifié')}</SelectItem>
              </SelectContent>
            </Select>

            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('admin_lessons.search_placeholder', 'Rechercher un enseignant, une matière, un sujet…')}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {monitoringRefreshing ? t('admin_lessons.refreshing', 'Actualisation de l\'intelligence des cours…') : `${filteredLessons.length} ${t('admin_lessons.logs_visible', 'cahiers de texte visibles')}`}
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              {t('common.reset_filters', 'Réinitialiser les filtres')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Teaching Feed</CardTitle>
          <CardDescription>Review the topics taught, teacher ownership, and learner follow-up notes for each logged lesson.</CardDescription>
        </CardHeader>
        <CardContent>
          {monitoringLoading ? (
            <div className="py-8 text-sm text-slate-500">Loading daily lesson monitoring...</div>
          ) : filteredLessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No daily lesson logs matched the current monitoring filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Lesson</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell className="whitespace-nowrap text-sm text-slate-600">{lesson.date}</TableCell>
                      <TableCell className="font-medium text-slate-900">{lesson.class_name || `Class ${lesson.class_id}`}</TableCell>
                      <TableCell>{lesson.subject_name || 'General'}</TableCell>
                      <TableCell>{lesson.teacher_name || 'Teacher'}</TableCell>
                      <TableCell className="min-w-[320px]">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{lesson.title}</div>
                          {lesson.description ? (
                            <div className="line-clamp-2 text-sm text-slate-500">{lesson.description}</div>
                          ) : null}
                          {lesson.objectives ? (
                            <div className="text-xs text-slate-500">Objectives: {lesson.objectives}</div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(lesson.status)}>{humanizeStatus(lesson.status)}</Badge>
                      </TableCell>
                      <TableCell className="min-w-[260px]">
                        <div className="space-y-1 text-sm text-slate-600">
                          {lesson.classwork ? <div>Classwork: {lesson.classwork}</div> : null}
                          {lesson.homework ? <div>Homework: {lesson.homework}</div> : null}
                          {lesson.notes ? <div>Notes: {lesson.notes}</div> : null}
                          {!lesson.classwork && !lesson.homework && !lesson.notes ? <div className="text-slate-400">No follow-up notes</div> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyLessonMonitoring;
