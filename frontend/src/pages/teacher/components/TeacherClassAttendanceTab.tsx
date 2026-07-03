import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import attendanceService from '../../../services/attendanceService';
import subjectService from '../../../services/subjectService';

type AttendanceMark = 'present' | 'absent' | 'late' | 'excused';
type AttendanceRow = { studentId: string; mark: AttendanceMark; note?: string };

export function TeacherClassAttendanceTab({ cls }: { cls: TeacherClass }) {
  const { t } = useTranslation();
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceRow>>({});
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [subjectName, setSubjectName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeRoster = useMemo(() => cls.roster.filter((r) => r.status === 'active'), [cls.roster]);
  const numericClassId = Number(cls.id);

  const loadAttendance = useCallback(async () => {
    if (!Number.isFinite(numericClassId) || numericClassId <= 0) {
      setAttendanceDraft({});
      return;
    }

    try {
      setLoading(true);

      let resolvedSubjectId = subjectId;
      if (!resolvedSubjectId) {
        const subjectResponse = await subjectService.getSubjectsByClass(numericClassId);
        const subjects = Array.isArray(subjectResponse?.subjects) ? subjectResponse.subjects : [];
        const fallbackSubject = subjects[0] || null;
        resolvedSubjectId = fallbackSubject?.id ?? null;
        setSubjectId(resolvedSubjectId);
        setSubjectName(fallbackSubject?.name ?? null);
      }

      if (!resolvedSubjectId) {
        setAttendanceDraft({});
        toast.error('No subject is configured for this class attendance workflow yet.');
        return;
      }

      const records = await attendanceService.getClassAttendance(numericClassId, attendanceDate, resolvedSubjectId);
      const next: Record<string, AttendanceRow> = {};
      for (const record of records) {
        next[String(record.student_id)] = {
          studentId: String(record.student_id),
          mark: record.status,
          note: record.remarks || '',
        };
      }
      setAttendanceDraft(next);
    } catch (error) {
      setAttendanceDraft({});
      console.error('Failed to load teacher attendance', error);
      toast.error('Failed to load saved attendance for this date.');
    } finally {
      setLoading(false);
    }
  }, [attendanceDate, numericClassId, subjectId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const saveAttendance = async () => {
    if (!Number.isFinite(numericClassId) || numericClassId <= 0) {
      toast.error('Invalid class context for attendance.');
      return;
    }

    try {
      setSaving(true);

      let resolvedSubjectId = subjectId;
      if (!resolvedSubjectId) {
        const subjectResponse = await subjectService.getSubjectsByClass(numericClassId);
        const subjects = Array.isArray(subjectResponse?.subjects) ? subjectResponse.subjects : [];
        const fallbackSubject = subjects[0] || null;
        resolvedSubjectId = fallbackSubject?.id ?? null;
        setSubjectId(resolvedSubjectId);
        setSubjectName(fallbackSubject?.name ?? null);
      }

      if (!resolvedSubjectId) {
        toast.error('No subject is configured for this class attendance workflow yet.');
        return;
      }

      await attendanceService.bulkCreateAttendance({
        class_id: numericClassId,
        subject_id: resolvedSubjectId,
        date: attendanceDate,
        attendances: activeRoster.map((student) => {
          const row = attendanceDraft[student.id] ?? { studentId: student.id, mark: 'present' as AttendanceMark };
          return {
            student_id: Number(student.id),
            status: row.mark,
            remarks: row.note?.trim() || '',
          };
        }),
      });

      toast.success('Attendance saved successfully.');
      await loadAttendance();
    } catch (error: any) {
      console.error('Failed to save teacher attendance', error);
      toast.error(error?.response?.data?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('teacher_portal.attendance.title')}</div>
          <div className="text-xs text-slate-500">{t('teacher_portal.attendance.subtitle')}</div>
          {subjectName ? (
            <div className="mt-1 text-xs text-slate-500">Saving against subject context: {subjectName}</div>
          ) : null}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
          />
          <Button variant="outline" className="rounded-xl" onClick={loadAttendance} disabled={loading || saving}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('teacher_portal.attendance.load')}
          </Button>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={saveAttendance} disabled={loading || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('teacher_portal.attendance.save')}
          </Button>
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
                <option value="present">{t('teacher_portal.attendance.status.present')}</option>
                <option value="absent">{t('teacher_portal.attendance.status.absent')}</option>
                <option value="late">{t('teacher_portal.attendance.status.late')}</option>
                <option value="excused">{t('teacher_portal.attendance.status.excused', 'Excused')}</option>
              </select>
              <input
                value={row.note ?? ''}
                onChange={(e) => setAttendanceDraft((prev) => ({ ...prev, [s.id]: { ...row, note: e.target.value } }))}
                placeholder={t('teacher_portal.attendance.note_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

