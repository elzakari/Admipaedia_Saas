import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';
import api from '../../../lib/api';

type GradeRow = { studentId: string; assessment: string; score?: number; grade?: string; remark?: string };
const gradebookKey = (classId: string) => `admipaedia.teacher.gradebook.v1.${classId}`;

export function TeacherClassGradebookTab({ cls }: { cls: TeacherClass }) {
  const { t } = useTranslation();
  const [assessment, setAssessment] = useState('Mid-term Test');
  const [gradeDraft, setGradeDraft] = useState<Record<string, GradeRow>>({});

  const activeRoster = useMemo(() => cls.roster.filter((r) => r.status === 'active'), [cls.roster]);

  const loadGradebook = async () => {
    // 1. Attempt loading from API first
    try {
      const examsRes = await api.get('/exams', { params: { class_id: cls.id } });
      const exams = examsRes.data?.exams || [];
      const match = exams.find((e: any) =>
        (e.title || '').trim().toLowerCase() === assessment.trim().toLowerCase()
      );

      if (match) {
        const gradesRes = await api.get(`/exams/${match.id}/grades`);
        const grades = gradesRes.data?.grades || [];
        const next: Record<string, GradeRow> = {};
        grades.forEach((g: any) => {
          next[g.student_id.toString()] = {
            studentId: g.student_id.toString(),
            assessment: assessment,
            score: g.marks_obtained,
            grade: g.grade_letter,
            remark: g.remarks
          };
        });
        setGradeDraft(next);
        return;
      }
    } catch (err) {
      console.warn('API lookup failed, falling back to localStorage:', err);
    }

    // 2. Fallback to localStorage
    try {
      const raw = localStorage.getItem(gradebookKey(cls.id));
      if (!raw) {
        setGradeDraft({});
        return;
      }
      const parsed = JSON.parse(raw) as GradeRow[];
      const next: Record<string, GradeRow> = {};
      for (const row of parsed.filter((r) => r.assessment === assessment)) next[row.studentId] = row;
      setGradeDraft(next);
    } catch {
      setGradeDraft({});
    }
  };

  const saveGradebook = async () => {
    // 1. Attempt API save/sync
    try {
      const examsRes = await api.get('/exams', { params: { class_id: cls.id } });
      const exams = examsRes.data?.exams || [];
      let exam = exams.find((e: any) =>
        (e.title || '').trim().toLowerCase() === assessment.trim().toLowerCase()
      );

      if (!exam) {
        const subjectsRes = await api.get(`/classes/${cls.id}/subjects`);
        const subjectId = subjectsRes.data?.subjects?.[0]?.id || 1;

        const createRes = await api.post('/exams', {
          title: assessment,
          exam_date: new Date().toISOString(),
          duration: 60,
          total_marks: 100,
          passing_marks: 50,
          class_id: Number(cls.id),
          subject_id: subjectId
        });
        exam = createRes.data?.exam;
      }

      if (exam) {
        const payload = {
          exam_id: exam.id,
          grades: activeRoster.map((s) => {
            const row = gradeDraft[s.id] ?? {};
            return {
              student_id: Number(s.id),
              marks_obtained: row.score !== undefined ? Number(row.score) : 0,
              remarks: row.remark || ''
            };
          })
        };
        await api.post('/grades/bulk', payload);
      }
    } catch (err) {
      console.warn('API save failed, falling back to localStorage:', err);
    }

    // 2. Local fallback sync
    const existing: GradeRow[] = (() => {
      try {
        const raw = localStorage.getItem(gradebookKey(cls.id));
        if (!raw) return [];
        return JSON.parse(raw) as GradeRow[];
      } catch {
        return [];
      }
    })();

    const withoutAssessment = existing.filter((r) => r.assessment !== assessment);
    const next = activeRoster.map((r) => {
      const current = gradeDraft[r.id] ?? { studentId: r.id, assessment };
      return { ...current, studentId: r.id, assessment };
    });

    localStorage.setItem(gradebookKey(cls.id), JSON.stringify([...withoutAssessment, ...next]));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t('teacher_portal.gradebook.title')}</div>
          <div className="text-xs text-slate-500">{t('teacher_portal.gradebook.subtitle')}</div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
            placeholder={t('teacher_portal.gradebook.assessment_placeholder')}
          />
          <Button variant="outline" className="rounded-xl" onClick={loadGradebook}>{t('teacher_portal.gradebook.load')}</Button>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={saveGradebook}>{t('teacher_portal.gradebook.save')}</Button>
        </div>
      </div>

      <div className="space-y-2">
        {activeRoster.map((s) => {
          const row = gradeDraft[s.id] ?? { studentId: s.id, assessment };
          return (
            <div key={s.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{s.name}</div>
              <input
                type="number"
                min={0}
                max={100}
                value={row.score ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const score = val === '' ? undefined : Number(val);
                  setGradeDraft((prev) => ({ ...prev, [s.id]: { ...row, score } }));
                }}
                placeholder={t('teacher_portal.gradebook.score_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
              <input
                value={row.grade ?? ''}
                onChange={(e) => setGradeDraft((prev) => ({ ...prev, [s.id]: { ...row, grade: e.target.value } }))}
                placeholder={t('teacher_portal.gradebook.grade_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
              <input
                value={row.remark ?? ''}
                onChange={(e) => setGradeDraft((prev) => ({ ...prev, [s.id]: { ...row, remark: e.target.value } }))}
                placeholder={t('teacher_portal.gradebook.remark_placeholder')}
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

