import React from 'react';
import type { TeacherClass } from '../teacherMockData';

export function TeacherClassRosterTab({ cls }: { cls: TeacherClass }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2">Student</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {cls.roster.map((s) => (
            <tr key={s.id} className="border-t border-slate-200 dark:border-slate-700">
              <td className="py-2 font-medium text-slate-900 dark:text-slate-100">{s.name}</td>
              <td className="py-2 text-slate-700 dark:text-slate-300 capitalize">{s.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

