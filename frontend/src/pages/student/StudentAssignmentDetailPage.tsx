import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { studentAssignments, studentClasses } from './studentMockData';
import { ChevronRight, UploadCloud } from 'lucide-react';

type SubmissionRecord = Record<string, { submittedAt: string; fileName?: string }>;
const storageKey = 'admipaedia.student.assignment_submissions.v1';

const StudentAssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams();
  const assignment = useMemo(() => studentAssignments.find((a) => a.id === assignmentId) ?? null, [assignmentId]);

  const cls = useMemo(() => {
    if (!assignment) return null;
    return studentClasses.find((c) => c.id === assignment.classId) ?? null;
  }, [assignment]);

  const initialSubmission = useMemo(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SubmissionRecord;
      if (!assignmentId) return null;
      return parsed[assignmentId] ?? null;
    } catch {
      return null;
    }
  }, [assignmentId]);

  const [submission, setSubmission] = useState<{ submittedAt: string; fileName?: string } | null>(initialSubmission);

  if (!assignment) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Assignment not found</CardTitle>
            <CardDescription>The assignment you requested isn’t available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/student/assignments" className="text-indigo-600 hover:text-indigo-700">Back to Assignments</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const saveSubmission = (fileName?: string) => {
    const record = { submittedAt: new Date().toISOString(), fileName };
    setSubmission(record);
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = (raw ? (JSON.parse(raw) as SubmissionRecord) : {}) as SubmissionRecord;
      parsed[assignment.id] = record;
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
      localStorage.setItem(storageKey, JSON.stringify({ [assignment.id]: record } as SubmissionRecord));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center text-sm text-indigo-700">
        <Link to="/student/assignments" className="hover:text-indigo-900">Assignments</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-indigo-900">{assignment.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-start justify-between gap-3">
              <span>{assignment.title}</span>
              <Badge variant={assignment.status === 'open' ? 'default' : assignment.status === 'submitted' ? 'secondary' : 'outline'}>
                {assignment.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {cls ? `${cls.subject} • ${cls.teacher}` : 'Class'} • Due {new Date(assignment.dueAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-slate-700 dark:text-slate-300">{assignment.description}</div>
            {assignment.feedback ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Teacher feedback</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 mt-1">{assignment.feedback}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submission</CardTitle>
            <CardDescription>Upload and submit your work</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {submission ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Submitted</div>
                <div className="text-xs text-slate-500 mt-1">{new Date(submission.submittedAt).toLocaleString()}</div>
                {submission.fileName ? (
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">File: {submission.fileName}</div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">No submission yet.</div>
            )}

            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <UploadCloud className="h-4 w-4 text-indigo-600" />
                Upload
              </div>
              <input
                type="file"
                className="mt-3 block w-full text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) saveSubmission(f.name);
                }}
              />
              <Button
                className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => saveSubmission(submission?.fileName)}
              >
                Submit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentAssignmentDetailPage;

