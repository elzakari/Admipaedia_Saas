"use client";

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  BookOpen,
  FileText,
  BarChart4,
  Users,
  Search,
  Download,
  Grid,
  List,
  GraduationCap
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../components/ui/tabs';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { TouchFriendlyButton } from '../../components/common/TouchFriendlyButton';
import ClassRecords from '../../components/academics/ClassRecords';
import ExamManagement from '../../components/academics/ExamManagement';
import ScoresDashboard from '../../components/academics/ScoresDashboard';
import { useClasses } from '../../hooks/useClasses';
import { useSubjects } from '../../hooks/useSubjects';
import { useExams } from '../../hooks/useExams';

export function AcademicsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('class-records');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isSmallMobile = useMediaQuery('(max-width: 480px)');

  const { data: classesData } = useClasses({ page: 1, per_page: 200 });
  const { data: subjectsData } = useSubjects({ page: 1, per_page: 200 });
  const { exams } = useExams({ page: 1, per_page: 200 });

  const classCount = classesData?.data?.length || 0;
  const subjectCount = subjectsData?.subjects?.length || 0;
  const examCount = exams?.length || 0;

  const workflowCards = useMemo(() => ([
    {
      id: 'class-records',
      title: t('academics_page.class_records', 'Class Records'),
      description: t('academics_page.cards.class_records.desc', 'Maintain classes, subjects, timetable structure, and academic setup.'),
      icon: Users,
      badge: t('academics_page.cards.class_records.badge', '{{count}} classes ready', { count: classCount })
    },
    {
      id: 'exam-management',
      title: t('academics_page.exam_management', 'Exam Management'),
      description: t('academics_page.cards.exam_management.desc', 'Schedule assessments, maintain exam records, and control grading operations.'),
      icon: FileText,
      badge: t('academics_page.cards.exam_management.badge', '{{count}} exams tracked', { count: examCount })
    },
    {
      id: 'scores-dashboard',
      title: t('academics_page.scores_dashboard', 'Scores Dashboard'),
      description: t('academics_page.cards.scores_dashboard.desc', 'Review performance patterns, grading outcomes, and academic health across the school.'),
      icon: BarChart4,
      badge: t('academics_page.cards.scores_dashboard.badge', '{{count}} subjects in scope', { count: subjectCount })
    }
  ]), [classCount, examCount, subjectCount, t]);

  const filteredWorkflowCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return workflowCards;
    }

    return workflowCards.filter((card) =>
      card.title.toLowerCase().includes(query) ||
      card.description.toLowerCase().includes(query) ||
      card.badge.toLowerCase().includes(query)
    );
  }, [searchQuery, workflowCards]);

  const overviewStats = [
    { label: t('admin_academic.classes', 'Classes'), value: classCount, icon: Users, tone: 'bg-blue-500' },
    { label: t('admin_academic.subjects', 'Subjects'), value: subjectCount, icon: BookOpen, tone: 'bg-emerald-500' },
    { label: t('navigation.exams', 'Exams'), value: examCount, icon: FileText, tone: 'bg-violet-500' },
    { label: t('academics_page.stats.active_workflow', 'Active Workflow'), value: workflowCards.find((card) => card.id === activeTab)?.title || t('academics_page.stats.academic_hub', 'Academic Hub'), icon: GraduationCap, tone: 'bg-amber-500' }
  ];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('academics_page.title', 'Academics')}</h1>
          <p className="text-gray-600">{t('academics_page.description', 'Coordinate classes, exams, and school-wide academic performance from one workflow.')}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('academics_page.search_placeholder', 'Search academic workflows...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <TouchFriendlyButton
            variant="outline"
            size={isMobile ? "sm" : "md"}
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            {!isSmallMobile && <span className="ml-2">{viewMode === 'list' ? t('common.grid', 'Grid') : t('common.list', 'List')}</span>}
          </TouchFriendlyButton>
          <TouchFriendlyButton
            variant="outline"
            size={isMobile ? "sm" : "md"}
            onClick={() => setSearchQuery('')}
          >
            <Download className="h-4 w-4" />
            {!isSmallMobile && <span className="ml-2">{t('common.reset', 'Reset')}</span>}
          </TouchFriendlyButton>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="rounded-2xl border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                    <div className={`rounded-xl p-3 text-white ${stat.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>{t('academics_page.workflow_title', 'Academic Workflow')}</CardTitle>
            <CardDescription>
              {t('academics_page.workflow_desc', 'Move from setup to assessment to performance review without leaving the page context.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={viewMode === 'list' ? 'space-y-3' : 'grid grid-cols-1 gap-4 lg:grid-cols-3'}>
              {filteredWorkflowCards.map((card) => {
                const Icon = card.icon;
                const isActive = activeTab === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setActiveTab(card.id)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={`rounded-xl p-3 ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant={isActive ? 'default' : 'secondary'}>{card.badge}</Badge>
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-900">{card.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{card.description}</p>
                  </button>
                );
              })}
            </div>
            {filteredWorkflowCards.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                {t('academics_page.no_results', 'No workflow matched your search. Clear the search to see all academic modules.')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>{t('academics_page.management_title', 'Academic Management')}</CardTitle>
            <CardDescription>
              {t('academics_page.management_desc', 'Use the modules below to maintain records, run assessments, and review outcomes.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${isMobile ? 'grid-cols-1 h-auto' : 'grid-cols-3'}`}>
                <TabsTrigger value="class-records" className={`${isMobile ? 'justify-start py-3' : 'min-w-[140px]'}`}>
                  <Users className="mr-2 h-4 w-4" />
                  {t('academics_page.class_records', 'Class Records')}
                </TabsTrigger>
                <TabsTrigger value="exam-management" className={`${isMobile ? 'justify-start py-3' : 'min-w-[140px]'}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  {t('academics_page.exam_management', 'Exam Management')}
                </TabsTrigger>
                <TabsTrigger value="scores-dashboard" className={`${isMobile ? 'justify-start py-3' : 'min-w-[140px]'}`}>
                  <BarChart4 className="mr-2 h-4 w-4" />
                  {t('academics_page.scores_dashboard', 'Scores Dashboard')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="class-records" className="mt-6">
                <ClassRecords />
              </TabsContent>

              <TabsContent value="exam-management" className="mt-6">
                <ExamManagement />
              </TabsContent>

              <TabsContent value="scores-dashboard" className="mt-6">
                <ScoresDashboard />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AcademicsPage;
