import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const baseRoleOptions: Array<{ value: SuperAdminUserRole; key: string; fallback: string }> = [
  { value: 'admin', key: 'super_admin.roles.admin', fallback: 'Admin' },
  { value: 'teacher', key: 'super_admin.roles.teacher', fallback: 'Teacher' },
  { value: 'student', key: 'super_admin.roles.student', fallback: 'Student' },
  { value: 'parent', key: 'super_admin.roles.parent', fallback: 'Parent' },
  { value: 'user', key: 'super_admin.roles.user', fallback: 'General user' },
]

const SuperAdminUsersPage: React.FC = () => {
  const { t } = useTranslation()
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
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purgeUser, setPurgeUser] = useState<SuperAdminUser | null>(null)
  const [purgeConfirmText, setPurgeConfirmText] = useState('')
  const [purging, setPurging] = useState(false)

  const isActorSuperAdmin = currentUser?.role === 'super_admin'
  const roleOptions = useMemo(() => {
    if (!isActorSuperAdmin) return baseRoleOptions
    return [{ value: 'super_manager' as const, key: 'super_admin.roles.super_manager', fallback: 'Super Manager' }, ...baseRoleOptions]
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
        setError(t('super_admin.users.errors.load_failed', 'Failed to load users'))
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
      setCreateError(t('super_admin.users.errors.email_required', 'Email is required'))
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
          setCreateError(t('super_admin.users.errors.reset_email_not_sent', 'User created, but reset email was not sent (email not configured).'))
        }
      }
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      const apiErrors = anyErr?.response?.data?.errors
      if (Array.isArray(apiErrors) && apiErrors.length) {
        setCreateError(apiErrors.join(' '))
      } else {
        setCreateError(apiError || t('super_admin.users.errors.create_failed', 'Failed to create user'))
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
      <Dialog
        open={purgeOpen}
        onOpenChange={(v) => {
          setPurgeOpen(v)
          if (!v) {
            setPurgeUser(null)
            setPurgeConfirmText('')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('super_admin.users.purge.title', 'Delete user')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {t('super_admin.users.purge.description', 'This is a permanent action. Type the confirmation text exactly to proceed.')}
            </div>
            <div className="text-sm">
              {t('super_admin.users.purge.confirm_label', 'Confirmation text')}:{' '}
              <span className="font-mono">{purgeUser ? `DELETE ${purgeUser.email}` : ''}</span>
            </div>
            <Input
              value={purgeConfirmText}
              onChange={(e) => setPurgeConfirmText(e.target.value)}
              placeholder={t('super_admin.users.purge.confirm_placeholder', 'Type the confirmation text')}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPurgeOpen(false)} disabled={purging}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={
                  !purgeUser ||
                  purging ||
                  purgeConfirmText.trim() !== (purgeUser ? `DELETE ${purgeUser.email}` : '')
                }
                onClick={async () => {
                  if (!purgeUser) return
                  try {
                    setPurging(true)
                    await superAdminService.purgeUser(purgeUser.id, purgeConfirmText.trim())
                    setItems((prev) => prev.filter((x) => x.id !== purgeUser.id))
                    toast.success(t('super_admin.users.purge.deleted', 'User deleted'))
                    setPurgeOpen(false)
                  } catch (e) {
                    const anyErr = e as any
                    const data = anyErr?.response?.data
                    const status = data?.status
                    const statusReasons = Array.isArray(status?.reasons) ? status.reasons.join(', ') : null
                    const statusError =
                      statusReasons ||
                      status?.error ||
                      status?.message ||
                      (typeof status === 'string' ? status : null)
                    const expected = data?.expected
                    toast.error(t('super_admin.users.purge.failed', 'Delete failed'), {
                      description:
                        data?.error ||
                        data?.message ||
                        statusError ||
                        (expected ? `${t('super_admin.users.purge.confirm_label', 'Confirmation text')}: ${expected}` : null) ||
                        anyErr?.message ||
                        t('common.error', 'Error')
                    })
                  } finally {
                    setPurging(false)
                  }
                }}
              >
                {purging
                  ? t('super_admin.users.purge.deleting', 'Deleting...')
                  : t('super_admin.users.purge.confirm', 'Delete permanently')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t('super_admin.users.title', 'Users')}</h1>
          <p className="text-sm text-muted-foreground">{t('super_admin.users.subtitle', 'Search and manage all user accounts.')}</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>{t('super_admin.users.actions.create_user', 'Create user')}</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('super_admin.users.create.title', 'Create user')}</DialogTitle>
            </DialogHeader>
            {createError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <label className="text-sm" htmlFor="c-email">{t('auth.email', 'Email Address')}</label>
                <Input id="c-email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm" htmlFor="c-username">{t('super_admin.users.create.username_optional', 'Username (optional)')}</label>
                <Input id="c-username" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm">{t('super_admin.users.create.role', 'Role')}</label>
                <Select value={createRole} onValueChange={(v) => setCreateRole(v as SuperAdminUserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('super_admin.users.create.select_role', 'Select role')} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{t(r.key, r.fallback)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm" htmlFor="c-password">{t('super_admin.users.create.initial_password', 'Initial password')}</label>
                <Input id="c-password" type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} />
                <div className="text-xs text-muted-foreground">
                  {t('super_admin.users.create.password_hint', 'Leave blank to auto-generate a secure password.')}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">{t('super_admin.users.create.send_reset_email', 'Send reset email')}</div>
                  <div className="text-xs text-muted-foreground">{t('super_admin.users.create.send_reset_email_hint', 'Sends a password reset link to the user (recommended).')}</div>
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
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>{t('common.cancel', 'Cancel')}</Button>
                <Button onClick={onCreate} disabled={creating}>{creating ? t('common.creating', 'Creating...') : t('common.create', 'Create')}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1">
          <Input placeholder={t('super_admin.users.search_placeholder', 'Search email or username')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        </div>
        <Select value={role || 'all'} onValueChange={(v) => { setRole(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger>
            <SelectValue placeholder={t('super_admin.users.filters.role', 'Role')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('super_admin.users.filters.all_roles', 'All roles')}</SelectItem>
            <SelectItem value="super_admin">{t('super_admin.roles.super_admin', 'Super admin')}</SelectItem>
            {roleOptions.map((r) => (
              <SelectItem key={r.value} value={r.value}>{t(r.key, r.fallback)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger>
            <SelectValue placeholder={t('super_admin.users.filters.status', 'Status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('super_admin.users.filters.all_statuses', 'All statuses')}</SelectItem>
            <SelectItem value="active">{t('common.active', 'Active')}</SelectItem>
            <SelectItem value="inactive">{t('common.inactive', 'Inactive')}</SelectItem>
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
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.users.table.user', 'User')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.users.table.role', 'Role')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.users.table.status', 'Status')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('super_admin.users.table.created', 'Created')}</th>
                  <th className="text-right px-4 py-3 font-medium">{t('common.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{t('super_admin.users.empty', 'No users found')}</td></tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.username}</div>
                        <div className="text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'super_admin'
                          ? t('super_admin.roles.super_admin', 'Super admin')
                          : u.role === 'super_manager'
                            ? t('super_admin.roles.super_manager', 'Super Manager')
                            : u.role === 'admin'
                              ? t('super_admin.roles.admin', 'Admin')
                              : u.role === 'teacher'
                                ? t('super_admin.roles.teacher', 'Teacher')
                                : u.role === 'student'
                                  ? t('super_admin.roles.student', 'Student')
                                  : u.role === 'parent'
                                    ? t('super_admin.roles.parent', 'Parent')
                                    : u.role === 'user'
                                      ? t('super_admin.roles.user', 'General user')
                                      : u.role}
                      </td>
                      <td className="px-4 py-3">
                        {u.status === 'active'
                          ? t('common.active', 'Active')
                          : u.status === 'inactive'
                            ? t('common.inactive', 'Inactive')
                            : u.status}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.created_at ? u.created_at.slice(0, 10) : ''}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/super-admin/users/${u.id}`} className="text-blue-600 hover:underline">{t('common.view', 'View')}</Link>
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
                            {t('super_admin.users.actions.reset', 'Reset')}
                          </Button>
                          {u.status === 'active' ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={currentUser?.id === u.id || u.role === 'super_admin'}
                                >
                                  {t('super_admin.users.actions.deactivate', 'Deactivate')}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('super_admin.users.deactivate.title', 'Deactivate this user?')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('super_admin.users.deactivate.description', 'This will block sign-in for this account until it is reactivated.')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
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
                                    {t('super_admin.users.actions.deactivate', 'Deactivate')}
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
                              {t('super_admin.users.actions.reactivate', 'Reactivate')}
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={
                                  deletingUserId === u.id ||
                                  !isActorSuperAdmin ||
                                  currentUser?.id === u.id ||
                                  u.role === 'super_admin'
                                }
                              >
                                {t('common.delete', 'Delete')}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('super_admin.users.delete.title', 'Delete this user permanently?')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('super_admin.users.delete.description', 'This will permanently remove the account only if it is an orphan user (no school memberships and no school profile).')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={async () => {
                                    const extractError = (err: unknown) => {
                                      const anyErr = err as any
                                      const data = anyErr?.response?.data
                                      return (
                                        data?.error ||
                                        data?.message ||
                                        anyErr?.message ||
                                        t('common.error', 'Error')
                                      )
                                    }

                                    try {
                                      setDeletingUserId(u.id)
                                      let statusRes: { success: boolean; status: any }
                                      try {
                                        statusRes = await superAdminService.getOrphanUserStatus(u.id)
                                      } catch (e) {
                                        toast.error(t('super_admin.users.delete.status_failed', 'Could not check deletion conditions'), {
                                          description: extractError(e)
                                        })
                                        if (isActorSuperAdmin && u.role !== 'super_admin') {
                                          setPurgeUser(u)
                                          setPurgeConfirmText('')
                                          setPurgeOpen(true)
                                        }
                                        return
                                      }
                                      if (!statusRes.status.can_delete) {
                                        toast.error(t('super_admin.users.delete.cannot_title', 'Cannot delete user'), {
                                          description: statusRes.status.reasons?.join(', ') || t('super_admin.users.delete.not_orphan', 'User is not an orphan')
                                        })
                                        if (u.role !== 'super_admin') {
                                          setPurgeUser(u)
                                          setPurgeConfirmText('')
                                          setPurgeOpen(true)
                                        }
                                        return
                                      }
                                      try {
                                        await superAdminService.deleteOrphanUser(u.id)
                                      } catch (e) {
                                        toast.error(t('super_admin.users.delete.failed', 'Delete failed'), {
                                          description: extractError(e)
                                        })
                                        return
                                      }
                                      setItems((prev) => prev.filter((x) => x.id !== u.id))
                                      toast.success(t('super_admin.users.delete.deleted', 'User deleted'))
                                    } catch (e) {
                                      void e
                                      toast.error(t('super_admin.users.delete.failed', 'Delete failed'), {
                                        description: extractError(e)
                                      })
                                    } finally {
                                      setDeletingUserId(null)
                                    }
                                  }}
                                >
                                  {t('super_admin.users.delete.confirm', 'Delete permanently')}
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
            <div className="text-xs text-muted-foreground">{t('super_admin.users.pagination.page_of', 'Page {{page}} of {{pages}}', { page, pages })}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('common.prev', 'Prev')}</Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>{t('common.next', 'Next')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SuperAdminUsersPage
