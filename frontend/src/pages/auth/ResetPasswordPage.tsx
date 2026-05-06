import React, { useMemo, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import authService from '@/services/authService'

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(() => token.trim().length > 0 && password.length >= 8 && password === confirm, [token, password, confirm])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 800)
    } catch (err) {
      void err
      setError('Password reset failed. Your link may be invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen bg-gray-100 justify-center items-center px-4">
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold">Password updated</h2>
          <p className="text-sm text-gray-600">Redirecting you to login…</p>
          <Link to="/login"><Button className="w-full">Go to login</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100 justify-center items-center px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold">Reset password</h2>
        <p className="text-sm text-gray-600">Choose a new password for your account.</p>

        {error ? <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div> : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="rp-password" className="block text-sm font-medium text-gray-700">New password</label>
            <Input id="rp-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="rp-confirm" className="block text-sm font-medium text-gray-700">Confirm password</label>
            <Input id="rp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={!canSubmit || loading}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage

