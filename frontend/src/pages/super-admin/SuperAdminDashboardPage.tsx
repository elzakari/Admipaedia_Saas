import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { superAdminService, SuperAdminOverview } from '@/services/superAdminService'

const StatCard: React.FC<{ title: string; value: number; href: string }> = ({ title, value, href }) => {
  return (
    <Link to={href} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  )
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admins',
  admin: 'Admins',
  teacher: 'Teachers',
  student: 'Students',
  parent: 'Parents',
  user: 'General Users'
}

const SuperAdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<SuperAdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await superAdminService.getOverview()
        if (!mounted) return
        setData(res.overview)
      } catch (e) {
        void e
        if (!mounted) return
        setError('Failed to load overview')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Manage all user accounts and review actions.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-background animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Users" value={data.total_users} href="/super-admin/users" />
            <StatCard title="Active" value={data.by_status.active} href="/super-admin/users?status=active" />
            <StatCard title="Inactive" value={data.by_status.inactive} href="/super-admin/users?status=inactive" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(data.by_role)
              .filter(([k]) => k in roleLabel)
              .map(([role, count]) => (
                <StatCard
                  key={role}
                  title={roleLabel[role] || role}
                  value={count}
                  href={`/super-admin/users?role=${encodeURIComponent(role)}`}
                />
              ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Users by role</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(data.by_role).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{role}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recent_audit.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No Super Admin events yet.</div>
                ) : (
                  <div className="space-y-3">
                    {data.recent_audit.map((ev) => (
                      <div key={ev.id} className="rounded-md border p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="text-sm font-medium break-words min-w-0">{ev.event_type}</div>
                          <div className="text-xs text-muted-foreground shrink-0">{ev.created_at || ''}</div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground break-words line-clamp-3">
                          {JSON.stringify(ev.details)}
                        </div>
                      </div>
                    ))}
                    <div>
                      <Link to="/super-admin/audit-logs" className="text-sm text-blue-600 hover:underline">
                        View all audit logs
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default SuperAdminDashboardPage
