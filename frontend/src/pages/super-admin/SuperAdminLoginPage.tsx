import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

const SuperAdminLoginPage: React.FC = () => {
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
        setError(res.message || 'Login failed')
        return
      }

      if (res.user.role !== 'super_admin') {
        setError('This account is not authorized for Super Admin access.')
        return
      }

      navigate('/super-admin', { replace: true })
    } catch (err) {
      const anyErr = err as any
      const apiError = anyErr?.response?.data?.error || anyErr?.response?.data?.message
      setError(apiError || 'Login failed. Please check your credentials and try again.')
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
      setError('Could not initialize demo accounts.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <Card className="w-full max-w-md border-white/10 bg-white/5 text-white shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">Super Admin Login</CardTitle>
          <CardDescription className="text-white/70">Sign in to manage all users securely.</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/80" htmlFor="sa-email">Email</label>
              <Input
                id="sa-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40"
                placeholder="superadmin@admipaedia.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/80" htmlFor="sa-password">Password</label>
              <Input
                id="sa-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border-white/10 text-white placeholder:text-white/40"
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
            {allowDevSeedHelpers ? (
              <button
                type="button"
                onClick={bootstrapDevAccounts}
                className="w-full text-sm text-white/70 hover:text-white underline"
                disabled={isSubmitting}
              >
                Initialize dev Super Admin
              </button>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default SuperAdminLoginPage
