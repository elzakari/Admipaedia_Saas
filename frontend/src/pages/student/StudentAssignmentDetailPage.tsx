import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { ChevronRight, Loader2, UploadCloud } from 'lucide-react';
import studentService from '../../services/studentService';

const StudentAssignmentDetailPage: React.FC = () => {
  const { assignmentId } = useParams();
  const queryClient = useQueryClient();
  const parsedAssignmentId = Number(assignmentId);
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [latestSubmissionAt, setLatestSubmissionAt] = useState<string | null>(null);

  const { data: assignment, isLoading, isError } = useQuery({
    queryKey: ['student-assignment-detail', parsedAssignmentId],
    queryFn: () => studentService.getAssignmentById(parsedAssignmentId),
    enabled: Number.isFinite(parsedAssignmentId),
    staleTime: 15_000,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      studentService.submitAssignment(parsedAssignmentId, {
        content: submissionText.trim() || undefined,
        file_path: selectedFileName || undefined,
      }),
    onSuccess: () => {
      setLatestSubmissionAt(new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ['student-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['student-assignment-detail', parsedAssignmentId] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              Loading assignment
            </CardTitle>
            <CardDescription>Fetching the latest assignment details.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isError || !assignment) {
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

  const isSubmitted = assignment.status === 'submitted' || assignment.status === 'graded' || submitMutation.isSuccess;
  const submissionTimestamp = latestSubmissionAt;
  const canSubmit =
    !isSubmitted &&
    (assignment.status === 'open' || assignment.status === 'pending' || assignment.status === 'overdue') &&
    !submitMutation.isPending;
  const selectedAttachmentName = selectedFileName;

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
              <Badge variant={assignment.status === 'open' || assignment.status === 'pending' ? 'default' : assignment.status === 'submitted' ? 'secondary' : 'outline'}>
                {assignment.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {assignment.subject_name || 'Subject'} • Due {new Date(assignment.dueAt || assignment.due_date).toLocaleString()}
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
            {isSubmitted ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Submitted</div>
                {submissionTimestamp ? (
                  <div className="text-xs text-slate-500 mt-1">{new Date(submissionTimestamp).toLocaleString()}</div>
                ) : null}
                {selectedAttachmentName ? (
                  <div className="text-sm text-slate-700 dark:text-slate-300 mt-2">File: {selectedAttachmentName}</div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-slate-600 dark:text-slate-400">No submission yet.</div>
            )}

            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4">
              <label className="text-sm font-semibold text-slate-900 dark:text-slate-100" htmlFor="assignment-submission-text">
                Submission note
              </label>
              <Textarea
                id="assignment-submission-text"
                className="mt-2"
                placeholder="Add a short note for your teacher"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
              />
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <UploadCloud className="h-4 w-4 text-indigo-600" />
                Attachment reference
              </div>
              <input
                type="file"
                className="mt-3 block w-full text-sm"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setSelectedFileName(f?.name || null);
                }}
              />
              <div className="text-xs text-slate-500">
                The current student submission API accepts submission text plus an optional file reference.
              </div>
              {submitMutation.isError ? (
                <div className="text-sm text-red-600">
                  {(submitMutation.error as Error).message || 'Failed to submit assignment'}
                </div>
              ) : null}
              <Button
                className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={!canSubmit}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? 'Submitting...' : isSubmitted ? 'Submitted' : 'Submit'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentAssignmentDetailPage;

