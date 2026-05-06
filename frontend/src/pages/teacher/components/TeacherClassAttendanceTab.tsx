import React, { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';

type AttendanceMark = 'present' | 'absent' | 'late';
type AttendanceRow = { studentId: string; mark: AttendanceMark; note?: string };

const attendanceKey = (classId: string, date: string) => `admipaedia.teacher.attendance.v1.${classId}.${date}`;

export function TeacherClassAttendanceTab({ cls }: { cls: TeacherClass }) {
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceRow>>({});

  const activeRoster = useMemo(() => cls.roster.filter((r) => r.status === 'active'), [cls.roster]);

  const loadAttendance = () => {
    try {
      const raw = localStorage.getItem(attendanceKey(cls.id, attendanceDate));
      if (!raw) {
        setAttendanceDraft({});
        return;
      }
      const parsed = JSON.parse(raw) as AttendanceRow[];
      const next: Record<string, AttendanceRow> = {};
      for (const row of parsed) next[row.studentId] = row;
      setAttendanceDraft(next);
    } catch {
      setAttendanceDraft({});
    }
  };

  const saveAttendance = () => {
    const rows: AttendanceRow[] = activeRoster.map((r) => attendanceDraft[r.id] ?? { studentId: r.id, mark: 'present' });
    localStorage.setItem(attendanceKey(cls.id, attendanceDate), JSON.stringify(rows));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance</div>
          <div className="text-xs text-slate-500">Mark present/absent/late, then save</div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
          />
          <Button variant="outline" className="rounded-xl" onClick={loadAttendance}>Load</Button>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={saveAttendance}>Save</Button>
        </div>
      </div>

      <div className="space-y-2">
        {activeRoster.map((s) => {
          const row = attendanceDraft[s.id] ?? { studentId: s.id, mark: 'present' as AttendanceMark };
          return (
            <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
              <select
                value={row.mark}
                onChange={(e) => {
                  const mark = e.target.value as AttendanceMark;
                  setAttendanceDraft((prev) => ({ ...prev, [s.id]: { ...row, mark } }));
                }}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              >
                <option value="present">present</option>
                <option value="absent">absent</option>
                <option value="late">late</option>
              </select>
              <input
                value={row.note ?? ''}
                onChange={(e) => setAttendanceDraft((prev) => ({ ...prev, [s.id]: { ...row, note: e.target.value } }))}
                placeholder="Optional note"
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

