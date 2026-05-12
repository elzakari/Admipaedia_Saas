import React, { useEffect, useMemo, useState } from 'react'
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
        setError('Failed to load user')
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
      setMessage('Saved')
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || 'Failed to save')
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
      setMessage('User deactivated')
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || 'Failed to deactivate user')
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
      setMessage('User reactivated')
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || 'Failed to reactivate user')
    }
  }

  const onSendReset = async () => {
    if (!user) return
    setError(null)
    setMessage(null)
    try {
      const res = await superAdminService.sendReset(user.id)
      setMessage(res.email_sent ? 'Reset email sent' : 'Reset email not sent (email disabled?)')
    } catch (e) {
      const anyErr = e as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || 'Failed to send reset email')
    }
  }

  if (!Number.isFinite(userId)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm">Invalid user id</CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">User details</h1>
          <p className="text-sm text-muted-foreground">Edit account status and role safely.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Button onClick={onSave} disabled={!dirty || saving || loading}>{saving ? 'Saving…' : 'Save changes'}</Button>
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
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm" htmlFor="u-email">Email</label>
                <Input id="u-email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm" htmlFor="u-username">Username</label>
                <Input id="u-username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm">Role</label>
                  <Select value={role} onValueChange={(v) => setRole(v as SuperAdminUserRole)} disabled={isTargetSuperAdmin || (isTargetSuperManager && !isActorSuperAdmin)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isActorSuperAdmin ? <SelectItem value="super_admin">Super admin</SelectItem> : null}
                      {isActorSuperAdmin ? <SelectItem value="super_manager">Super Manager</SelectItem> : null}
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="user">General user</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Status</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as 'active' | 'inactive')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium">{user.created_at || '-'}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Last login</div>
                  <div className="font-medium">{user.last_login || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={onSendReset} className="w-full">Send password reset email</Button>
              {user.status === 'active' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={isSelf || isTargetSuperAdmin || (isTargetSuperManager && !isActorSuperAdmin)}>
                      Deactivate user
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
                      <AlertDialogAction onClick={onDeactivate}>Deactivate</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button onClick={onReactivate} className="w-full">Reactivate user</Button>
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
