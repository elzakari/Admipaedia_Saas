import React, { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';

type GradeRow = { studentId: string; assessment: string; score?: number; grade?: string; remark?: string };
const gradebookKey = (classId: string) => `admipaedia.teacher.gradebook.v1.${classId}`;

export function TeacherClassGradebookTab({ cls }: { cls: TeacherClass }) {
  const [assessment, setAssessment] = useState('Mid-term Test');
  const [gradeDraft, setGradeDraft] = useState<Record<string, GradeRow>>({});

  const activeRoster = useMemo(() => cls.roster.filter((r) => r.status === 'active'), [cls.roster]);

  const loadGradebook = () => {
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

  const saveGradebook = () => {
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
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Gradebook</div>
          <div className="text-xs text-slate-500">Enter scores for this class only</div>
        </div>
        <div className="flex gap-2 items-center">
          <input
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
            placeholder="Assessment name"
          />
          <Button variant="outline" className="rounded-xl" onClick={loadGradebook}>Load</Button>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={saveGradebook}>Save</Button>
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
                placeholder="Score"
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
              <input
                value={row.grade ?? ''}
                onChange={(e) => setGradeDraft((prev) => ({ ...prev, [s.id]: { ...row, grade: e.target.value } }))}
                placeholder="Grade"
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
              <input
                value={row.remark ?? ''}
                onChange={(e) => setGradeDraft((prev) => ({ ...prev, [s.id]: { ...row, remark: e.target.value } }))}
                placeholder="Remark"
                className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

