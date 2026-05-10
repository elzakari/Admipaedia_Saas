import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function normalizeUrl(raw: string): URL | null {
  const value = (raw || '').trim()
  if (!value) return null
  try {
    return new URL(value)
  } catch {
    try {
      return new URL(value, window.location.origin)
    } catch {
      return null
    }
  }
}

function extractInvitePath(url: URL): string | null {
  const path = url.pathname || ''
  if (!path.startsWith('/invite/')) return null
  const inviteId = path.split('/invite/')[1]?.split('/')?.[0]?.trim()
  if (!inviteId) return null
  const exp = url.searchParams.get('exp') || ''
  const sig = url.searchParams.get('sig') || ''
  if (!exp || !sig) return null
  return `/invite/${inviteId}?exp=${encodeURIComponent(exp)}&sig=${encodeURIComponent(sig)}`
}

export default function InviteOnlyRegister() {
  const navigate = useNavigate()
  const [inviteUrl, setInviteUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const derivedPath = useMemo(() => {
    const url = normalizeUrl(inviteUrl)
    if (!url) return null
    return extractInvitePath(url)
  }, [inviteUrl])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!derivedPath) {
      setError('Please paste a valid invitation link from your school admin.')
      return
    }
    navigate(derivedPath)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Registration is invitation-only. This prevents creating accounts that are not linked to a school.
      </div>

      {error ? <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div> : null}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="inviteUrl" className="block text-sm font-semibold text-slate-700 mb-1">
            Invitation link
          </label>
          <input
            id="inviteUrl"
            type="text"
            value={inviteUrl}
            onChange={(e) => setInviteUrl(e.target.value)}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Paste your invite link (e.g. https://.../invite/<id>?exp=...&sig=...)"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Continue
        </button>
      </form>

      <div className="text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-800">
          Sign in
        </Link>
      </div>
    </div>
  )
}

