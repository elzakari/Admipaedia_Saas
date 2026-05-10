import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import parentService from '../../services/parentService'

type Props = {
  childId: number
}

export default function AttendanceTab({ childId }: Props) {
  const enabled = Number.isFinite(childId) && childId > 0

  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-child-attendance', childId],
    queryFn: () => parentService.getChildAttendanceData(childId),
    enabled,
    staleTime: 30_000
  })

  const attendance = useMemo(() => (data as any)?.attendance || [], [data])
  const percentage = useMemo(() => (data as any)?.percentage ?? 0, [data])

  const recent = useMemo(() => {
    return [...attendance]
      .sort((a: any, b: any) => String(b?.date || '').localeCompare(String(a?.date || '')))
      .slice(0, 15)
  }, [attendance])

  const absences = useMemo(() => {
    return recent.filter((a: any) => a?.status !== 'present')
  }, [recent])

  if (!enabled) {
    return (
      <Card>
        <CardContent className="p-6">Select a student to view attendance.</CardContent>
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
        <CardContent className="p-6">Failed to load attendance.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-indigo-900">{percentage}%</div>
            <div className="text-sm text-indigo-700">Recent attendance rate</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-900">{absences.length}</div>
            <div className="text-sm text-indigo-700">Recent non-present</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {!recent.length ? (
            <div className="text-sm text-slate-600">No attendance records found.</div>
          ) : (
            <div className="space-y-2">
              {recent.map((a: any) => {
                const date = a?.date ? new Date(a.date).toLocaleDateString() : ''
                const status = a?.status || 'unknown'
                return (
                  <div key={a.id || `${a.date}-${status}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div className="text-sm font-medium text-slate-900">{date}</div>
                    <div className="text-sm text-slate-700">{status}</div>
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

