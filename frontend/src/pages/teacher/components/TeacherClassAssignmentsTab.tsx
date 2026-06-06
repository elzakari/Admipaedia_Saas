import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Paperclip, X, Calendar, Loader2 } from 'lucide-react';
import type { TeacherClass } from '../teacherMockData';
import api from '../../../lib/api';

type Assignment = { id: string; title: string; dueAt: string; instructions: string; attachments?: string[] };
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

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | ''>('');
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState(() => new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [newInstructions, setNewInstructions] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!cls.id) return;
      try {
        setLoading(true);
        // Fetch class assignments
        const assignmentsRes = await api.get(`/classes/${cls.id}/assignments`);
        const assignmentsList = assignmentsRes.data?.assignments || assignmentsRes.data?.data || [];
        
        // Fetch class subjects
        const subjectsRes = await api.get(`/classes/${cls.id}/subjects`);
        const subjectsList = subjectsRes.data?.subjects || subjectsRes.data?.data || [];

        if (active) {
          const loadedAssignments = assignmentsList.map((a: any) => ({
            id: a.id.toString(),
            title: a.title,
            dueAt: (a.due_date || '').slice(0, 10),
            instructions: a.description || a.instructions || ''
          }));
          setAssignments(loadedAssignments.length > 0 ? loadedAssignments : loadAssignments());
          setSubjects(subjectsList);
          if (subjectsList.length > 0) {
            setSelectedSubjectId(subjectsList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load assignments or subjects', err);
        if (active) {
          setAssignments(loadAssignments());
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => { active = false; };
  }, [cls.id]);

  const handleFileAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const addAssignment = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    setApiError(null);
    try {
      const payload: any = {
        title: newTitle.trim(),
        instructions: newInstructions.trim(),
        description: newInstructions.trim(),
        due_date: newDue,
        dueAt: newDue,
        class_id: parseInt(cls.id),
        total_points: 100,
        total_marks: 100,
        assignment_type: 'homework',
        status: 'active'
      };
      if (selectedSubjectId) {
        payload.subject_id = selectedSubjectId;
      }

      const response = await api.post(`/classes/${cls.id}/assignments`, payload);
      
      if (response.status === 201) {
        const created = response.data?.assignment;
        if (created) {
          const a: Assignment = {
            id: created.id.toString(),
            title: created.title,
            dueAt: (created.due_date || '').slice(0, 10),
            instructions: created.description || created.instructions || '',
            attachments: attachments.map(f => f.name)
          };
          const next = [a, ...assignments];
          setAssignments(next);
          localStorage.setItem(assignmentsKey(cls.id), JSON.stringify(next));
        }
        setNewTitle('');
        setNewInstructions('');
        setAttachments([]);
      } else {
        setApiError('Failed to create assignment on backend.');
      }
    } catch (err: any) {
      console.error('Failed to create assignment', err);
      setApiError(err.response?.data?.message || err.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const sorted = useMemo(() => {
    return [...assignments].sort((a, b) => b.dueAt.localeCompare(a.dueAt));
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Assignment</h2>
        <p className="text-sm text-slate-500">Publish coursework tasks and due dates for students.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all duration-200 overflow-hidden">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Assignment Title"
          disabled={creating}
          className="w-full border-none bg-transparent focus:outline-none focus:ring-0 px-4 py-3 text-sm font-semibold border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
        />

        <textarea
          value={newInstructions}
          onChange={(e) => setNewInstructions(e.target.value)}
          placeholder="Instructions and requirements..."
          disabled={creating}
          className="w-full border-none bg-transparent focus:outline-none focus:ring-0 px-4 py-3 text-sm min-h-[110px] resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            {attachments.map((file, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-750">
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button onClick={() => removeAttachment(idx)} disabled={creating} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {apiError && (
          <div className="mx-4 my-2 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs">
            {apiError}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="p-2 text-slate-500 hover:text-violet-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
              <Paperclip className="w-5 h-5" />
              <input type="file" multiple className="hidden" disabled={creating} onChange={handleFileAttachmentChange} />
            </label>
            
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-750">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-500 dark:text-slate-400">Due:</span>
              <input 
                type="date" 
                value={newDue} 
                onChange={(e) => setNewDue(e.target.value)} 
                disabled={creating}
                className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-xs font-semibold text-slate-750 dark:text-slate-200 w-[100px]" 
              />
            </div>

            {subjects.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-750">
                <span className="font-medium text-slate-500 dark:text-slate-400">Subject:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value ? parseInt(e.target.value) : '')}
                  disabled={creating}
                  className="bg-transparent border-none p-0 focus:outline-none focus:ring-0 text-xs font-semibold text-slate-750 dark:text-slate-200"
                >
                  <option value="" className="dark:bg-slate-900">Select Subject</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id} className="dark:bg-slate-900">{sub.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          <Button 
            className="rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-medium px-5 flex items-center gap-2" 
            onClick={addAssignment}
            disabled={!newTitle.trim() || creating}
          >
            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
            Create
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
          <CardDescription>{sorted.length} item(s) active</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          ) : sorted.length ? sorted.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900/50">
              <div className="flex justify-between items-start">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.title}</div>
                <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-medium">Due {a.dueAt}</div>
              </div>
              {a.instructions ? <div className="text-sm text-slate-700 dark:text-slate-300 mt-2 whitespace-pre-wrap">{a.instructions}</div> : null}
              
              {a.attachments && a.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {a.attachments.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2.5 py-0.5 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 rounded border border-slate-250 dark:border-slate-700">
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )) : (
            <div className="text-sm text-slate-600 dark:text-slate-400 py-4">No assignments yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

