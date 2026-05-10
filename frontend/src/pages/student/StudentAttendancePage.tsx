import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CalendarCheck2 } from 'lucide-react';
import api from '../../lib/api';
import studentService from '../../services/studentService';

const StudentAttendancePage: React.FC = () => {
  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: () => studentService.getOwnProfile(),
    staleTime: 60_000
  });

  const studentId = Number((profile as any)?.id);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['student-attendance-report', studentId],
    queryFn: async () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      const res = await api.get(`/attendance/student/${studentId}/report`, {
        params: { date_from: fmt(from), date_to: fmt(to) }
      });
      return res.data?.report;
    },
    enabled: Number.isFinite(studentId) && studentId > 0,
    staleTime: 30_000
  });

  const stats = useMemo(() => {
    const s = report?.summary;
    return {
      present: Number(s?.present_days) || 0,
      absent: Number(s?.absent_days) || 0,
      late: Number(s?.late_days) || 0,
      percentage: Number(s?.attendance_rate) || 0
    };
  }, [report]);

  const records = useMemo(() => report?.records || [], [report]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Attendance</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Your attendance summary and history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance %</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.percentage}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Present</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.present}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Absent</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.absent}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Late</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.late}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarCheck2 className="h-5 w-5 text-indigo-600" /> History</CardTitle>
          <CardDescription>Most recent entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">Loading…</div>
            ) : error ? (
              <div className="text-sm text-slate-600 dark:text-slate-400">Failed to load attendance.</div>
            ) : (
              records.slice(0, 30).map((e: any) => (
                <div key={e.id} className="flex items-start justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.date ? new Date(e.date).toLocaleDateString() : ''}</div>
                    <div className="text-xs text-slate-500">{e.remarks ?? ''}</div>
                  </div>
                  <div className={`text-sm font-semibold ${e.status === 'present' ? 'text-emerald-600' : e.status === 'absent' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {e.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendancePage;

