import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { studentAttendance } from './studentMockData';
import { CalendarCheck2 } from 'lucide-react';

const StudentAttendancePage: React.FC = () => {
  const stats = useMemo(() => {
    const present = studentAttendance.filter((e) => e.status === 'present').length;
    const absent = studentAttendance.filter((e) => e.status === 'absent').length;
    const late = studentAttendance.filter((e) => e.status === 'late').length;
    const total = studentAttendance.length || 1;
    const percentage = Math.round((present / total) * 100);
    return { present, absent, late, percentage };
  }, []);

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
            {studentAttendance.map((e) => (
              <div key={e.id} className="flex items-start justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{e.date}</div>
                  <div className="text-xs text-slate-500">{e.note ?? ''}</div>
                </div>
                <div className={`text-sm font-semibold ${e.status === 'present' ? 'text-emerald-600' : e.status === 'absent' ? 'text-rose-600' : 'text-amber-600'}`}>
                  {e.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendancePage;

