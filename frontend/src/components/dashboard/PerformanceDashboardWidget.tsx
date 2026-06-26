import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AdminDashboardMetrics } from '../../services/saasService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  TrendingUp, TrendingDown, Target, Award, Users, BookOpen,
  Download, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PerformanceData {
  overallMetrics: {
    averageGrade: number;
    passRate: number;
    attendanceRate: number;
    completionRate: number;
    improvement: number;
  };
  subjectPerformance: Array<{
    subject: string;
    average: number;
    students: number;
    improvement: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    performance: number;
    attendance: number;
    assignments: number;
  }>;
  classComparison: Array<{
    class: string;
    performance: number;
    students: number;
    teacher: string;
  }>;
  skillsRadar: Array<{
    skill: string;
    current: number;
    target: number;
  }>;
}

interface PerformanceDashboardWidgetProps {
  data?: PerformanceData;
  className?: string;
  liveMetrics?: AdminDashboardMetrics;
  isLoading?: boolean;
  liveAnalytics?: any;
  liveTelemetry?: any;
}

const PerformanceDashboardWidget: React.FC<PerformanceDashboardWidgetProps> = ({
  data,
  className = '',
  liveMetrics,
  isLoading = false,
  liveAnalytics,
  liveTelemetry
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('6m');
  const performanceData: PerformanceData = useMemo(() => {
    const telemetry = liveTelemetry?.data || liveTelemetry;
    const metricsSource = telemetry?.academic_metrics || liveMetrics || {};
    const sourceData = data;

    const monthlyTrends = (
      telemetry?.monthly_trends ||
      liveMetrics?.monthly_trends ||
      sourceData?.monthlyTrends ||
      []
    ).map((entry: any) => ({
      month: String(entry?.month ?? ''),
      performance: Number(entry?.performance ?? 0),
      attendance: Number(entry?.attendance ?? 0),
      assignments: Number(entry?.assignments ?? 0)
    }));

    const subjectPerformance = (
      telemetry?.subject_performance ||
      liveAnalytics?.subject_performance ||
      sourceData?.subjectPerformance ||
      []
    ).map((subject: any) => ({
      subject: String(subject?.subject ?? t('Unknown Subject')),
      average: Number(subject?.average ?? subject?.average_score ?? 0),
      students: Number(subject?.students ?? subject?.student_count ?? 0),
      improvement: Number(subject?.improvement ?? 0),
      difficulty: (subject?.difficulty ?? (Number(subject?.average ?? subject?.average_score ?? 0) < 50 ? 'Hard' : Number(subject?.average ?? subject?.average_score ?? 0) < 75 ? 'Medium' : 'Easy')) as 'Easy' | 'Medium' | 'Hard'
    }));

    const gradeDistribution = (
      telemetry?.grade_distribution ||
      liveMetrics?.grade_distribution ||
      sourceData?.gradeDistribution ||
      []
    ).map((grade: any) => ({
      grade: String(grade?.grade ?? 'N/A'),
      count: Number(grade?.count ?? 0),
      percentage: Number(grade?.percentage ?? 0)
    }));

    const skillsObject = telemetry?.skills_assessment || liveAnalytics?.skills_assessment;
    const skillsRadar = skillsObject
      ? Object.entries(skillsObject).map(([skill, value]: [string, any]) => ({
          skill: t(skill),
          current: Number(value?.current ?? 0),
          target: Number(value?.target ?? 0)
        }))
      : (sourceData?.skillsRadar || []);

    const improvement = monthlyTrends.length >= 2
      ? Number((monthlyTrends[monthlyTrends.length - 1]?.performance || 0) - (monthlyTrends[0]?.performance || 0))
      : Number(sourceData?.overallMetrics?.improvement ?? 0);

    return {
      overallMetrics: {
        averageGrade: Number(metricsSource?.average_grade ?? sourceData?.overallMetrics?.averageGrade ?? 0),
        passRate: Number(metricsSource?.pass_rate ?? sourceData?.overallMetrics?.passRate ?? 0),
        attendanceRate: Number(metricsSource?.attendance_rate ?? sourceData?.overallMetrics?.attendanceRate ?? 0),
        completionRate: Number(metricsSource?.assignment_completion_rate ?? sourceData?.overallMetrics?.completionRate ?? 0),
        improvement
      },
      subjectPerformance,
      gradeDistribution,
      monthlyTrends,
      classComparison: sourceData?.classComparison || [],
      skillsRadar
    };
  }, [data, liveAnalytics?.subject_performance, liveAnalytics?.skills_assessment, liveMetrics, liveTelemetry, t]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const hasTrendData = performanceData.monthlyTrends.length > 0;
  const hasGradeDistribution = performanceData.gradeDistribution.length > 0;
  const hasSubjectPerformance = performanceData.subjectPerformance.length > 0;
  const hasSkillsData = performanceData.skillsRadar.length > 0;

  const renderEmptyState = (message: string) => (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {message}
    </div>
  );

  // Loading skeleton state
  if (isLoading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
        </CardContent>
      </Card>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('Average Grade')}</p>
                  <p className="text-2xl font-bold text-blue-600">{performanceData.overallMetrics.averageGrade}%</p>
                  <div className="flex items-center mt-1">
                    {performanceData.overallMetrics.improvement >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span className={`text-xs ${performanceData.overallMetrics.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {performanceData.overallMetrics.improvement >= 0 ? '+' : ''}{performanceData.overallMetrics.improvement}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Award className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('Pass Rate')}</p>
                  <p className="text-2xl font-bold text-green-600">{performanceData.overallMetrics.passRate}%</p>
                  <div className="flex items-center mt-1">
                    <Target className="h-3 w-3 text-blue-500 mr-1" />
                    <span className="text-xs text-gray-600">{t('Target')}: 85%</span>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('Attendance')}</p>
                  <p className="text-2xl font-bold text-purple-600">{performanceData.overallMetrics.attendanceRate}%</p>
                  <div className="flex items-center mt-1">
                    <Users className="h-3 w-3 text-purple-500 mr-1" />
                    <span className="text-xs text-gray-600">{t('Daily avg')}</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('Completion')}</p>
                  <p className="text-2xl font-bold text-orange-600">{performanceData.overallMetrics.completionRate}%</p>
                  <div className="flex items-center mt-1">
                    <BookOpen className="h-3 w-3 text-orange-500 mr-1" />
                    <span className="text-xs text-gray-600">{t('Assignments')}</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <BookOpen className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('Performance Trends')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {hasTrendData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="performance" stroke="#3b82f6" strokeWidth={3} name={t('Performance')} />
                    <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} name={t('Attendance')} />
                    <Line type="monotone" dataKey="assignments" stroke="#f59e0b" strokeWidth={2} name={t('Assignments')} />
                  </LineChart>
                </ResponsiveContainer>
              ) : renderEmptyState(t('No live trend data available yet'))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Grade Distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {hasGradeDistribution ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceData.gradeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ grade, percentage }) => `${grade} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {performanceData.gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : renderEmptyState(t('No grade distribution available yet'))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSubjectsTab = () => (
    <div className="space-y-6">
      {/* Subject Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Subject Performance Analysis')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {hasSubjectPerformance ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData.subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#3b82f6" name={t('Average Score')} />
                </BarChart>
              </ResponsiveContainer>
            ) : renderEmptyState(t('No subject performance data available yet'))}
          </div>
        </CardContent>
      </Card>

      {/* Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {performanceData.subjectPerformance.map((subject, index) => (
          <motion.div
            key={subject.subject}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{subject.subject}</h3>
                  <Badge variant={subject.difficulty === 'Hard' ? 'destructive' : subject.difficulty === 'Medium' ? 'secondary' : 'default'}>
                    {t(subject.difficulty)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-2xl font-bold text-blue-600">{subject.average}%</span>
                    <div className="flex items-center">
                      {subject.improvement >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        subject.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {subject.improvement >= 0 ? '+' : ''}{subject.improvement}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{subject.students} {t('students enrolled')}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {!hasSubjectPerformance && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              {t('Subject cards will appear when live performance data is available.')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  const renderSkillsTab = () => (
    <div className="space-y-6">
      {/* Skills Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Skills Assessment Radar')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {hasSkillsData ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={performanceData.skillsRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name={t('Current')} dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name={t('Target')} dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : renderEmptyState(t('No skills assessment data available yet'))}
          </div>
        </CardContent>
      </Card>

      {/* Skills Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {performanceData.skillsRadar.map((skill, index) => (
          <Card key={skill.skill} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{skill.skill}</h3>
                <Badge variant="outline">{skill.current}%</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('Current')}</span>
                  <span>{t('Target')}: {skill.target}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full relative"
                    style={{ width: `${skill.current}%` }}
                  >
                    <div
                      className="absolute top-0 right-0 w-1 h-2 bg-green-500 rounded-full"
                      style={{ right: `${100 - skill.target}%` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {t('Gap')}: {skill.target - skill.current} {t('points to target')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {!hasSkillsData && (
          <Card className="md:col-span-2">
            <CardContent className="p-8 text-center text-sm text-slate-500">
              {t('Skill targets will populate here once live academic telemetry is available.')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{t('Performance Dashboard')}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1M</SelectItem>
                <SelectItem value="3m">3M</SelectItem>
                <SelectItem value="6m">6M</SelectItem>
                <SelectItem value="1y">1Y</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('Export')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
            <TabsTrigger value="subjects">{t('Subjects')}</TabsTrigger>
            <TabsTrigger value="skills">{t('Skills')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            {renderOverviewTab()}
          </TabsContent>
          
          <TabsContent value="subjects" className="mt-6">
            {renderSubjectsTab()}
          </TabsContent>
          
          <TabsContent value="skills" className="mt-6">
            {renderSkillsTab()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PerformanceDashboardWidget;
