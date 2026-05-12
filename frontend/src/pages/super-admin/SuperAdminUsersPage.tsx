import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { superAdminService, SuperAdminUser, SuperAdminUserRole } from '@/services/superAdminService'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const baseRoleOptions: Array<{ value: SuperAdminUserRole; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'user', label: 'General user' },
]

const SuperAdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [items, setItems] = useState<SuperAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(Number(searchParams.get('page') || 1))
  const [pages, setPages] = useState(1)

  const [q, setQ] = useState(searchParams.get('q') || '')
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')

  const [createOpen, setCreateOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createUsername, setCreateUsername] = useState('')
  const [createRole, setCreateRole] = useState<SuperAdminUserRole>('user')
  const [createPassword, setCreatePassword] = useState('')
  const [createSendReset, setCreateSendReset] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)

  const isActorSuperAdmin = currentUser?.role === 'super_admin'
  const roleOptions = useMemo(() => {
    if (!isActorSuperAdmin) return baseRoleOptions
    return [{ value: 'super_manager' as const, label: 'Super Manager' }, ...baseRoleOptions]
  }, [isActorSuperAdmin])

  const queryKey = useMemo(() => ({ q, role, status, page }), [q, role, status, page])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (q) next.set('q', q); else next.delete('q')
    if (role) next.set('role', role); else next.delete('role')
    if (status) next.set('status', status); else next.delete('status')
    next.set('page', String(page))
    setSearchParams(next, { replace: true })
  }, [q, role, status, page])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await superAdminService.listUsers({
          page: queryKey.page,
          per_page: 20,
          q: queryKey.q || undefined,
          role: queryKey.role || undefined,
          status: queryKey.status || undefined,
        })
        if (!mounted) return
        setItems(res.users)
        setPages(res.pagination.pages || 1)
      } catch (e) {
        void e
        if (!mounted) return
        setError('Failed to load users')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [queryKey])

  const onCreate = async () => {
    setCreateError(null)
    if (!createEmail.trim()) {
      setCreateError('Email is required')
      return
    }

    setCreating(true)
    try {
      const res = await superAdminService.createUser({
        email: createEmail.trim(),
        username: createUsername.trim() || undefined,
        role: createRole,
        status: 'active',
        ...(createPassword.trim() ? { password: createPassword } : {}),
        send_reset: createSendReset,
      })
      setCreateOpen(false)
      setCreateEmail('')
      setCreateUsername('')
      setCreatePassword('')
      setCreateRole('user')
      setCreateSendReset(true)
      setPage(1)
      if (createSendReset) {
        setCreateError(null)
        if (res.email_sent === false) {
          setCreateError('User created, but reset email was not sent (email not configured).')
        }
      }
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      const apiErrors = anyErr?.response?.data?.errors
      if (Array.isArray(apiErrors) && apiErrors.length) {
        setCreateError(apiErrors.join(' '))
      } else {
        setCreateError(apiError || 'Failed to create user')
      }
    } finally {
      setCreating(false)
    }
  }

  const mutateUser = (next: SuperAdminUser) => {
    setItems((prev) => prev.map((u) => (u.id === next.id ? next : u)))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">Search and manage all user accounts.</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create user</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create user</DialogTitle>
            </DialogHeader>
            {createError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <label className="text-sm" htmlFor="c-email">Email</label>
                <Input id="c-email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm" htmlFor="c-username">Username (optional)</label>
                <Input id="c-username" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Role</label>
                <Select value={createRole} onValueChange={(v) => setCreateRole(v as SuperAdminUserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm" htmlFor="c-password">Initial password</label>
                <Input id="c-password" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
                <div className="text-xs text-muted-foreground">
                  Leave blank to auto-generate a secure password.
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Send reset email</div>
                  <div className="text-xs text-muted-foreground">Sends a password reset link to the user (recommended).</div>
                </div>
                <input
                  type="checkbox"
                  checked={createSendReset}
                  onChange={(e) => setCreateSendReset(e.target.checked)}
                  disabled={creating}
                  className="h-4 w-4"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                <Button onClick={onCreate} disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <Input placeholder="Search email or username" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        </div>
        <Select value={role || 'all'} onValueChange={(v) => { setRole(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger>
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="super_admin">Super admin</SelectItem>
            {roleOptions.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="h-64 rounded-lg border bg-background animate-pulse" />
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No users found</td></tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.username}</div>
                        <div className="text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">{u.role}</td>
                      <td className="px-4 py-3">{u.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.created_at ? u.created_at.slice(0, 10) : ''}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/super-admin/users/${u.id}`} className="text-blue-600 hover:underline">View</Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await superAdminService.sendReset(u.id)
                              } catch (e) {
                                void e
                              }
                            }}
                          >
                            Reset
                          </Button>
                          {u.status === 'active' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={currentUser?.id === u.id || u.role === 'super_admin'}
                                >
                                  Deactivate
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate this user?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will block sign-in for this account until it is reactivated.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      try {
                                        const res = await superAdminService.deactivateUser(u.id)
                                        mutateUser(res.user)
                                      } catch (e) {
                                        void e
                                      }
                                    }}
                                  >
                                    Deactivate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await superAdminService.reactivateUser(u.id)
                                  mutateUser(res.user)
                                } catch (e) {
                                  void e
                                }
                              }}
                            >
                              Reactivate
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={
                                  deletingUserId === u.id ||
                                  currentUser?.id === u.id ||
                                  u.role === 'super_admin'
                                }
                              >
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this user permanently?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove the account only if it is an orphan user (no school memberships and no school profile).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    try {
                                      setDeletingUserId(u.id)
                                      const statusRes = await superAdminService.getOrphanUserStatus(u.id)
                                      if (!statusRes.status.can_delete) {
                                        toast.error('Cannot delete user', {
                                          description: statusRes.status.reasons?.join(', ') || 'User is not an orphan'
                                        })
                                        return
                                      }
                                      await superAdminService.deleteOrphanUser(u.id)
                                      setItems((prev) => prev.filter((x) => x.id !== u.id))
                                      toast.success('User deleted')
                                    } catch (e) {
                                      void e
                                      toast.error('Delete failed')
                                    } finally {
                                      setDeletingUserId(null)
                                    }
                                  }}
                                >
                                  Delete permanently
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
            <div className="text-xs text-muted-foreground">Page {page} of {pages}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Next</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminUsersPage
