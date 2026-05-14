import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

const SuperAdminUserDetailsPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const params = useParams()
  const userId = Number(params.id)

  const [user, setUser] = useState<SuperAdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<SuperAdminUserRole>('user')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  const dirty = useMemo(() => {
    if (!user) return false
    return email !== user.email || username !== user.username || role !== user.role || status !== user.status
  }, [user, email, username, role, status])

  useEffect(() => {
    if (!Number.isFinite(userId)) return
    let mounted = true
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await superAdminService.getUser(userId)
        if (!mounted) return
        setUser(res.user)
        setEmail(res.user.email)
        setUsername(res.user.username)
        setRole(res.user.role)
        setStatus(res.user.status)
      } catch (e) {
        void e
        if (!mounted) return
        setError(t('super_admin.user_details.errors.load_failed', 'Failed to load user'))
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [userId])

  const onSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await superAdminService.updateUser(user.id, {
        ...(email !== user.email ? { email } : {}),
        ...(username !== user.username ? { username } : {}),
        ...(role !== user.role ? { role } : {}),
        ...(status !== user.status ? { status } : {}),
      })
      setUser(res.user)
      setMessage(t('common.saved', 'Saved'))
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || t('super_admin.user_details.errors.save_failed', 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  const onDeactivate = async () => {
    if (!user) return
    setError(null)
    setMessage(null)
    try {
      const res = await superAdminService.deactivateUser(user.id)
      setUser(res.user)
      setStatus(res.user.status)
      setMessage(t('super_admin.user_details.messages.deactivated', 'User deactivated'))
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || t('super_admin.user_details.errors.deactivate_failed', 'Failed to deactivate user'))
    }
  }

  const onReactivate = async () => {
    if (!user) return
    setError(null)
    setMessage(null)
    try {
      const res = await superAdminService.reactivateUser(user.id)
      setUser(res.user)
      setStatus(res.user.status)
      setMessage(t('super_admin.user_details.messages.reactivated', 'User reactivated'))
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || t('super_admin.user_details.errors.reactivate_failed', 'Failed to reactivate user'))
    }
  }

  const onSendReset = async () => {
    if (!user) return
    setError(null)
    setMessage(null)
    try {
      const res = await superAdminService.sendReset(user.id)
      setMessage(res.email_sent ? t('super_admin.user_details.messages.reset_sent', 'Reset email sent') : t('super_admin.user_details.messages.reset_not_sent', 'Reset email not sent (email disabled?)'))
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || t('super_admin.user_details.errors.reset_failed', 'Failed to send reset email'))
    }
  }

  if (!Number.isFinite(userId)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm">{t('super_admin.user_details.errors.invalid_user_id', 'Invalid user id')}</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{t('super_admin.user_details.title', 'User details')}</h1>
          <p className="text-sm text-muted-foreground">{t('super_admin.user_details.subtitle', 'Edit account status and role safely.')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>{t('common.back', 'Back')}</Button>
          <Button onClick={onSave} disabled={!dirty || saving || loading}>{saving ? t('super_admin.user_details.saving', 'Saving...') : t('super_admin.user_details.save_changes', 'Save changes')}</Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>
      ) : null}

      {loading ? (
        <div className="h-64 rounded-lg border bg-background animate-pulse" />
      ) : user ? (
        (() => {
          const isSelf = currentUser?.id === user.id
          const isTargetSuperAdmin = user.role === 'super_admin'
          const isTargetSuperManager = user.role === 'super_manager'
          const isActorSuperAdmin = currentUser?.role === 'super_admin'
          return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('super_admin.user_details.sections.profile', 'Profile')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm" htmlFor="u-email">{t('auth.email', 'Email Address')}</label>
                <Input id="u-email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm" htmlFor="u-username">{t('super_admin.user_details.fields.username', 'Username')}</label>
                <Input id="u-username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm">{t('super_admin.user_details.fields.role', 'Role')}</label>
                  <Select value={role} onValueChange={(v) => setRole(v as SuperAdminUserRole)} disabled={isTargetSuperAdmin || (isTargetSuperManager && !isActorSuperAdmin)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isActorSuperAdmin ? <SelectItem value="super_admin">{t('super_admin.roles.super_admin', 'Super admin')}</SelectItem> : null}
                      {isActorSuperAdmin ? <SelectItem value="super_manager">{t('super_admin.roles.super_manager', 'Super Manager')}</SelectItem> : null}
                      <SelectItem value="admin">{t('super_admin.roles.admin', 'Admin')}</SelectItem>
                      <SelectItem value="teacher">{t('super_admin.roles.teacher', 'Teacher')}</SelectItem>
                      <SelectItem value="student">{t('super_admin.roles.student', 'Student')}</SelectItem>
                      <SelectItem value="parent">{t('super_admin.roles.parent', 'Parent')}</SelectItem>
                      <SelectItem value="user">{t('super_admin.roles.user', 'General user')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">{t('super_admin.user_details.fields.status', 'Status')}</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'inactive')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('common.active', 'Active')}</SelectItem>
                      <SelectItem value="inactive">{t('common.inactive', 'Inactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">{t('super_admin.user_details.fields.created', 'Created')}</div>
                  <div className="font-medium">{user.created_at || '-'}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">{t('super_admin.user_details.fields.last_login', 'Last login')}</div>
                  <div className="font-medium">{user.last_login || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('super_admin.user_details.sections.actions', 'Actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={onSendReset} className="w-full">{t('super_admin.user_details.actions.send_reset', 'Send password reset email')}</Button>
              {user.status === 'active' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isSelf || isTargetSuperAdmin || (isTargetSuperManager && !isActorSuperAdmin)}>
                      {t('super_admin.user_details.actions.deactivate', 'Deactivate user')}
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
                      <AlertDialogAction onClick={onDeactivate}>{t('super_admin.users.actions.deactivate', 'Deactivate')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button onClick={onReactivate} className="w-full">{t('super_admin.user_details.actions.reactivate', 'Reactivate user')}</Button>
              )}
            </CardContent>
          </Card>
        </div>
          )
        })()
      ) : null}
    </div>
  )
}

export default SuperAdminUserDetailsPage
