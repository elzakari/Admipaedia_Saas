import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import type { TeacherClass } from '../teacherMockData';

type Assignment = { id: string; title: string; dueAt: string; instructions: string };
const assignmentsKey = (classId: string) => `admipaedia.teacher.assignments.v1.${classId}`;

export function TeacherClassAssignmentsTab({ cls }: { cls: TeacherClass }) {
  const loadAssignments = (): Assignment[] => {
    try {
      const raw = localStorage.getItem(assignmentsKey(cls.id));
      if (!raw) return [];
      return JSON.parse(raw) as Assignment[];
    } catch {
      return [];
    }
  };

  const [assignments, setAssignments] = useState<Assignment[]>(() => loadAssignments());
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState(() => new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [newInstructions, setNewInstructions] = useState('');

  const addAssignment = () => {
    if (!newTitle.trim()) return;
    const a: Assignment = {
      id: `as-${Date.now()}`,
      title: newTitle.trim(),
      dueAt: newDue,
      instructions: newInstructions.trim()
    };
    const next = [a, ...assignments];
    setAssignments(next);
    localStorage.setItem(assignmentsKey(cls.id), JSON.stringify(next));
    setNewTitle('');
    setNewInstructions('');
  };

  const sorted = useMemo(() => {
    return [...assignments].sort((a, b) => b.dueAt.localeCompare(a.dueAt));
  }, [assignments]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create assignment</CardTitle>
          <CardDescription>Publish to this class only</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title"
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
          />
          <input
            type="date"
            value={newDue}
            onChange={(e) => setNewDue(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 px-3 bg-white dark:bg-slate-900"
          />
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700" onClick={addAssignment}>Add</Button>
          <textarea
            value={newInstructions}
            onChange={(e) => setNewInstructions(e.target.value)}
            placeholder="Instructions"
            className="md:col-span-3 min-h-[90px] rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>{sorted.length} item(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length ? sorted.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.title}</div>
              <div className="text-xs text-slate-500">Due {a.dueAt}</div>
              {a.instructions ? <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">{a.instructions}</div> : null}
            </div>
          )) : (
            <div className="text-sm text-slate-600 dark:text-slate-400">No assignments yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

