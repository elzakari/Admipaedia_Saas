import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { invitationLinksService, InviteeType } from '@/services/invitationLinksService'

type InviteState =
  | { status: 'loading' }
  | { status: 'invalid'; message: string }
  | { status: 'unavailable'; message: string }
  | { status: 'valid'; inviteeType: InviteeType; expiresAt: string | null; tenantId: string }

export default function InviteAcceptPage() {
  const navigate = useNavigate()
  const { inviteId } = useParams()
  const [searchParams] = useSearchParams()

  const sig = searchParams.get('sig') || ''
  const exp = searchParams.get('exp') || ''

  const [inviteState, setInviteState] = useState<InviteState>({ status: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const inviteeType = useMemo(() => {
    if (inviteState.status !== 'valid') return null
    return inviteState.inviteeType
  }, [inviteState])

  useEffect(() => {
    async function run() {
      if (!inviteId) {
        setInviteState({ status: 'invalid', message: 'Invalid invitation link.' })
        return
      }
      if (!sig || !exp) {
        setInviteState({ status: 'invalid', message: 'Invitation link is missing required parameters.' })
        return
      }
      setInviteState({ status: 'loading' })
      try {
        const res = await invitationLinksService.validateInvite(inviteId, { sig, exp })
        if (!res.success || !res.invite) {
          const m = res.message || 'This invitation is not valid.'
          setInviteState({ status: 'unavailable', message: m })
          return
        }
        setInviteState({
          status: 'valid',
          inviteeType: res.invite.invitee_type,
          expiresAt: res.invite.expires_at,
          tenantId: res.invite.tenant_id
        })
      } catch (err: unknown) {
        const e = err as AxiosError<{ message?: string }>
        setInviteState({ status: 'invalid', message: e.response?.data?.message || e.message || 'Invitation validation failed.' })
      }
    }

    run()
  }, [inviteId, sig, exp])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!inviteId) return
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      const payload: any = {
        username,
        email,
        password,
        confirm_password: confirmPassword,
        first_name: firstName,
        last_name: lastName
      }
      const res = await invitationLinksService.registerWithInvite(inviteId, { sig, exp }, payload)
      if (!res.success) {
        setError(res.message || 'Registration failed. Please try again.')
        return
      }
      if (res.access_token) localStorage.setItem('token', res.access_token)
      if (res.refresh_token) localStorage.setItem('refreshToken', res.refresh_token)
      if (res.tenant?.id) localStorage.setItem('saas_current_tenant_id', res.tenant.id)

      const role = res.user?.role
      if (role === 'admin') navigate('/admin/dashboard')
      else if (role === 'teacher') navigate('/teacher/dashboard')
      else if (role === 'parent') navigate('/parent/dashboard')
      else if (role === 'student') navigate('/student/dashboard')
      else navigate('/login')
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      setError(e.response?.data?.message || e.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const title =
    inviteState.status === 'valid'
      ? `Create your ${inviteState.inviteeType} account`
      : 'Invitation'

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(50rem_35rem_at_90%_20%,rgba(79,70,229,0.14),transparent_55%),radial-gradient(50rem_35rem_at_50%_90%,rgba(59,130,246,0.10),transparent_60%)]" />
      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 p-6 sm:p-8">
            <div className="flex items-center justify-center mb-6">
              <img src="/assets/images/Admipaedia_Logo.png" alt="Admipaedia Logo" className="h-10" />
            </div>

            <div className="text-center mb-6">
              <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{title}</h1>
              {inviteState.status === 'valid' ? (
                <p className="mt-2 text-sm text-slate-600">Single-use invitation. Expires {inviteState.expiresAt ? new Date(inviteState.expiresAt).toLocaleString() : 'soon'}.</p>
              ) : null}
            </div>

            {inviteState.status === 'loading' ? (
              <div className="space-y-4">
                <div className="h-10 rounded-lg bg-slate-200/70 animate-pulse" />
                <div className="h-10 rounded-lg bg-slate-200/70 animate-pulse" />
                <div className="h-10 rounded-lg bg-slate-200/70 animate-pulse" />
                <div className="h-10 rounded-xl bg-slate-200/70 animate-pulse" />
              </div>
            ) : inviteState.status === 'invalid' || inviteState.status === 'unavailable' ? (
              <div className="space-y-4">
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{inviteState.message}</div>
                <div className="text-sm text-slate-600">
                  <span>Need help? </span>
                  <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">Sign in</Link>
                  <span> or request a new invite from your school.</span>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {error ? <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div> : null}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Choose a username"
                  />
                </div>

                {inviteeType === 'teacher' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="firstName">First name</label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="lastName">Last name</label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Create a password"
                  />
                  <div className="text-xs text-slate-500 mt-1">Use at least 8 characters and avoid common passwords.</div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="confirmPassword">Confirm password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Creating account…' : 'Create account'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            <span>© {new Date().getFullYear()} ADMIPAEDIA. All rights reserved.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

