import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import saasService, { SchoolRegistrationPreview } from '@/services/saasService'

export default function SchoolRegistrationPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()

  const token = useMemo(() => (params.get('token') || '').trim(), [params])
  const [preview, setPreview] = useState<SchoolRegistrationPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [adminName, setAdminName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const canSubmit = useMemo(() => {
    return Boolean(token && preview && !previewError && !loadingPreview && !submitting)
  }, [token, preview, previewError, loadingPreview, submitting])

  useEffect(() => {
    async function load() {
      if (!token) return
      setLoadingPreview(true)
      setPreviewError(null)
      try {
        const res = await saasService.previewRegistrationLink(token)
        setPreview(res.registration)
      } catch (err: unknown) {
        const e = err as AxiosError<{ message?: string }>
        setPreview(null)
        setPreviewError(e.response?.data?.message || e.message || 'Please contact support')
        toast({
          variant: 'destructive',
          title: 'Invalid registration link',
          description: e.response?.data?.message || e.message || 'Please contact support'
        })
      } finally {
        setLoadingPreview(false)
      }
    }
    load()
  }, [token, toast])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!token) {
      toast({ variant: 'destructive', title: 'Missing token', description: 'Please use the full registration link.' })
      return
    }
    if (!password || !confirmPassword) {
      toast({ variant: 'destructive', title: 'Missing password', description: 'Please enter and confirm your password.' })
      return
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please re-type your password.' })
      return
    }
    if (!preview || previewError) {
      toast({ variant: 'destructive', title: 'Invalid registration link', description: 'Please request a new link from the Super Admin.' })
      return
    }

    setSubmitting(true)
    try {
      const res = await saasService.completeRegistrationLink({
        token,
        admin_name: adminName.trim() || undefined,
        password,
        confirm_password: confirmPassword
      })

      if (!res.success) {
        const msg =
          res.message ||
          res.error ||
          (Array.isArray(res.errors) ? (res.errors as Array<unknown>).filter((x) => typeof x === 'string').join('\n') : null) ||
          'Registration failed'
        setFormError(msg)
        toast({ variant: 'destructive', title: 'Registration failed', description: msg })
        return
      }

      if (res.access_token) localStorage.setItem('token', res.access_token)
      if (res.refresh_token) localStorage.setItem('refreshToken', res.refresh_token)
      if (res.csrf_token) localStorage.setItem('csrfToken', res.csrf_token)
      if (res.tenant?.id) localStorage.setItem('saas_current_tenant_id', res.tenant.id)

      window.location.assign('/app')
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      setFormError(e.response?.data?.message || e.message || 'Please try again')
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen gradient-theme bg-gradient-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-xl rounded-2xl shadow-xl bg-background-secondary/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Registration
          </CardTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Single-use link • Expires in 24 hours</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <div className="rounded-xl border border-border bg-background-secondary p-4">
              <div className="text-sm font-semibold text-foreground">Missing token</div>
              <div className="text-sm text-foreground-secondary">Open the full registration link provided by the Super Admin.</div>
              <div className="pt-3">
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Go to login
                </Button>
              </div>
            </div>
          )}

          {token && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="rounded-xl border border-border bg-background-secondary p-4 space-y-1">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-muted-foreground">School</div>
                  <div className="text-xs">
                    {loadingPreview ? (
                      <span className="text-muted-foreground">Validating…</span>
                    ) : preview && !previewError ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="destructive">Invalid</Badge>
                    )}
                  </div>
                </div>
                <div className="text-base font-semibold text-foreground">{loadingPreview ? 'Loading…' : (preview?.school_name || '—')}</div>
                <div className="text-xs text-muted-foreground">{preview ? `${preview.school_slug} • ${preview.country_code}` : ''}</div>
                <div className="text-xs text-muted-foreground">{preview ? `Admin email: ${preview.admin_email}` : ''}</div>
                <div className="text-xs text-muted-foreground">{preview?.expires_at ? `Expires: ${new Date(preview.expires_at).toLocaleString()}` : ''}</div>
                {previewError && (
                  <div className="text-xs text-destructive pt-1">{previewError}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminName">School Admin name</Label>
                <Input
                  id="adminName"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8 text-foreground-secondary"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="text-xs text-foreground-secondary">
                    Use 8+ characters with uppercase, lowercase, number, and a special character.
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-8 w-8 text-foreground-secondary"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl border border-border bg-background-secondary p-3 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/login')}
                >
                  Back
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {submitting ? 'Creating...' : 'Create School'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
