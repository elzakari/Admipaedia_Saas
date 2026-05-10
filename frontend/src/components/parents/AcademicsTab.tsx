import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import parentService from '../../services/parentService'

type Props = {
  childId: number
}

export default function AcademicsTab({ childId }: Props) {
  const enabled = Number.isFinite(childId) && childId > 0

  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-child-grades', childId],
    queryFn: () => parentService.getChildAcademicData(childId),
    enabled,
    staleTime: 30_000
  })

  const grades = useMemo(() => (data as any)?.grades || [], [data])
  const overallPercentage = useMemo(() => (data as any)?.overallPercentage ?? 0, [data])
  const overallGrade = useMemo(() => (data as any)?.overallGrade ?? 'N/A', [data])

  if (!enabled) {
    return (
      <Card>
        <CardContent className="p-6">Select a student to view academics.</CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">Loading…</CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">Failed to load academic records.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Academic Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-indigo-900">{overallPercentage}%</div>
            <div className="text-sm text-indigo-700">Average</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-900">{overallGrade}</div>
            <div className="text-sm text-indigo-700">Grade</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Grades</CardTitle>
        </CardHeader>
        <CardContent>
          {!grades.length ? (
            <div className="text-sm text-slate-600">No grade records found.</div>
          ) : (
            <div className="space-y-3">
              {grades.slice(0, 10).map((g: any) => {
                const subject = g?.exam?.subject?.name || 'Subject'
                const title = g?.exam?.title || 'Exam'
                const pct = Number(g?.percentage)
                const pctText = Number.isFinite(pct) ? `${pct}%` : '—'
                const date = g?.exam?.exam_date ? new Date(g.exam.exam_date).toLocaleString() : ''
                return (
                  <div key={g.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900">{subject}</div>
                      <div className="font-semibold text-indigo-900">{pctText}</div>
                    </div>
                    <div className="text-xs text-slate-600">{title}{date ? ` • ${date}` : ''}</div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

