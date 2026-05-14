import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

const SuperAdminLoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allowDevSeedHelpers = import.meta.env.DEV && import.meta.env.VITE_ENABLE_SEED_HELPERS === 'true'

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)
    try {
      const res = await login(email.trim(), password)
      if (!res.success || !res.user) {
        setError(res.message || t('super_admin.login.errors.login_failed', 'Login failed'))
        return
      }

      if (res.user.role !== 'super_admin') {
        setError(t('super_admin.login.errors.not_authorized', 'This account is not authorized for Super Admin access.'))
        return
      }

      navigate('/super-admin', { replace: true })
    } catch (err) {
      const anyErr = err as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || t('super_admin.login.errors.login_failed_check', 'Login failed. Please check your credentials and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const bootstrapDevAccounts = async () => {
    if (!allowDevSeedHelpers) return
    setError(null)
    try {
      await api.post('/auth/bootstrap-dev')
      setEmail('superadmin@admipaedia.com')
      setPassword('SuperAdmin@123')
    } catch (e) {
      void e
      setError(t('super_admin.login.errors.bootstrap_failed', 'Could not initialize demo accounts.'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">{t('super_admin.login.title', 'Super Admin Login')}</CardTitle>
          <CardDescription className="text-white/70">{t('super_admin.login.subtitle', 'Sign in to manage all users securely.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/80" htmlFor="sa-email">{t('auth.email', 'Email Address')}</label>
              <Input
                id="sa-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40"
                placeholder={t('super_admin.login.email_placeholder', 'superadmin@admipaedia.com')}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/80" htmlFor="sa-password">{t('auth.password', 'Password')}</label>
              <Input
                id="sa-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40"
                placeholder={t('super_admin.login.password_placeholder', 'Your password')}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? t('auth.signing_in', 'Signing in...') : t('auth.sign_in', 'Sign In')}
            </Button>
            {allowDevSeedHelpers ? (
              <button
                type="button"
                onClick={bootstrapDevAccounts}
                className="w-full text-sm text-white/70 hover:text-white underline"
                disabled={isSubmitting}
              >
                {t('super_admin.login.init_dev_super_admin', 'Initialize dev Super Admin')}
              </button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default SuperAdminLoginPage
