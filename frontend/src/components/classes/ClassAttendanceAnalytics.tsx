import React from 'react';
import { useClassAttendanceSummary } from '../../hooks/useClassAttendance';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

interface ClassAttendanceAnalyticsProps {
  classId: number;
}

export function ClassAttendanceAnalytics({ classId }: ClassAttendanceAnalyticsProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = React.useState<'week' | 'month' | 'term'>('month');
  const [year, setYear] = React.useState<number>(new Date().getFullYear());
  const [month, setMonth] = React.useState<number>(new Date().getMonth() + 1);
  
  const { data: attendanceSummary, isLoading } = useClassAttendanceSummary(classId, {
    year,
    month: period === 'month' ? month : undefined
  });
  
  // Transform data for charts
  const getChartData = () => {
    if (!attendanceSummary) return [];
    
    // For monthly view, show daily attendance
    if (period === 'month') {
      return Object.entries(attendanceSummary.daily || {}).map(([date, stats]) => ({
        date,
        present: stats.present || 0,
        absent: stats.absent || 0,
        late: stats.late || 0,
      }));
    }
    
    // For term view, show monthly attendance
    return Object.entries(attendanceSummary.monthly || {}).map(([month, stats]) => ({
      month,
      present: stats.present || 0,
      absent: stats.absent || 0,
      late: stats.late || 0,
    }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('attendance_page.analytics_title', 'Attendance Analytics')}</CardTitle>
        <Tabs value={period} onValueChange={(value) => setPeriod(value as 'week' | 'month' | 'term')}>
          <TabsList>
            <TabsTrigger value="week">{t('attendance_page.period_weekly', 'Weekly')}</TabsTrigger>
            <TabsTrigger value="month">{t('attendance_page.period_monthly', 'Monthly')}</TabsTrigger>
            <TabsTrigger value="term">{t('attendance_page.period_term', 'Term')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">{t('attendance_page.loading_analytics', 'Loading analytics...')}</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={period === 'month' ? 'date' : 'month'} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" fill="#4ade80" name={t('attendance_page.status_present', 'Present')} />
                <Bar dataKey="absent" fill="#f87171" name={t('attendance_page.status_absent', 'Absent')} />
                <Bar dataKey="late" fill="#facc15" name={t('attendance_page.status_late', 'Late')} />
              </BarChart>
            </ResponsiveContainer>
            
            <div className="mt-6 grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">
                    {attendanceSummary?.summary?.present || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">{t('attendance_page.avg_attendance', 'Average Attendance')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-500">
                    {attendanceSummary?.summary?.absent || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">{t('attendance_page.avg_absence', 'Average Absence')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-500">
                    {attendanceSummary?.summary?.late || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">{t('attendance_page.avg_late', 'Average Late')}</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}