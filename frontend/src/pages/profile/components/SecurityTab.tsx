import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, KeyRound, Laptop2, Loader2, Lock, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { authService } from '@/services';
import { profileService, SessionInfo, SecurityEventInfo } from '@/services/profileService';
import { cn } from '@/lib/utils';

type Props = {
  mfaEnabled: boolean;
  passwordChangedAt?: string | null;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function strengthHints(pw: string) {
  const hints = [
    { ok: pw.length >= 8, label: 'At least 8 characters' },
    { ok: /[A-Z]/.test(pw), label: 'One uppercase letter' },
    { ok: /[a-z]/.test(pw), label: 'One lowercase letter' },
    { ok: /\d/.test(pw), label: 'One number' },
    { ok: /[^A-Za-z0-9]/.test(pw), label: 'One symbol' },
  ];
  return hints;
}

export default function SecurityTab({ mfaEnabled, passwordChangedAt }: Props) {
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: sessionsLoading } = useQuery<SessionInfo[]>({
    queryKey: ['profile-sessions'],
    queryFn: profileService.listSessions,
  });

  const { data: events, isLoading: eventsLoading } = useQuery<SecurityEventInfo[]>({
    queryKey: ['profile-security-events'],
    queryFn: () => profileService.listSecurityEvents(20),
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: number) => profileService.revokeSession(sessionId),
    onSuccess: async () => {
      toast.success('Session revoked');
      await queryClient.invalidateQueries({ queryKey: ['profile-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['profile-security-events'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to revoke session');
    }
  });

  const revokeOthersMutation = useMutation({
    mutationFn: async () => profileService.revokeOtherSessions(),
    onSuccess: async () => {
      toast.success('Other sessions revoked');
      await queryClient.invalidateQueries({ queryKey: ['profile-sessions'] });
      await queryClient.invalidateQueries({ queryKey: ['profile-security-events'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to revoke sessions');
    }
  });

  const [pw, setPw] = React.useState({
    current: '',
    next: '',
    confirm: ''
  });

  const pwHints = strengthHints(pw.next);
  const pwOk = pw.next.length >= 8 && pw.next === pw.confirm;

  const changePwMutation = useMutation({
    mutationFn: async () => {
      if (pw.next !== pw.confirm) {
        throw new Error('New passwords do not match');
      }
      await authService.changePassword(pw.current, pw.next);
    },
    onSuccess: async () => {
      toast.success('Password updated');
      setPw({ current: '', next: '', confirm: '' });
      await queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      await queryClient.invalidateQueries({ queryKey: ['profile-security-events'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to change password');
    }
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Last changed: {formatDateTime(passwordChangedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              value={pw.current}
              onChange={(e) => setPw(s => ({ ...s, current: e.target.value }))}
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                value={pw.next}
                onChange={(e) => setPw(s => ({ ...s, next: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm new password</Label>
              <Input
                id="confirm_password"
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw(s => ({ ...s, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {pwHints.map(h => (
              <div key={h.label} className={cn('flex items-center gap-2 text-xs', h.ok ? 'text-green-700' : 'text-slate-500 dark:text-slate-400')}>
                {h.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                <span>{h.label}</span>
              </div>
            ))}
          </div>

          <Button
            type="button"
            onClick={() => changePwMutation.mutate()}
            disabled={!pw.current || !pwOk || changePwMutation.isPending}
          >
            {changePwMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Status: <span className="font-semibold">{mfaEnabled ? 'Enabled' : 'Not enabled'}</span>
          </div>
          <Button asChild variant={mfaEnabled ? 'outline' : 'default'}>
            <Link to="/auth/mfa/setup">{mfaEnabled ? 'Manage MFA' : 'Enable MFA'}</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop2 className="h-5 w-5" />
            Sessions & Devices
          </CardTitle>
          <CardDescription>Revoke sessions you don’t recognize.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="destructive"
              onClick={() => revokeOthersMutation.mutate()}
              disabled={revokeOthersMutation.isPending}
            >
              {revokeOthersMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Revoke all other sessions
            </Button>
          </div>

          <Separator />

          {sessionsLoading ? (
            <div className="text-sm text-slate-500">Loading sessions…</div>
          ) : (
            <div className="space-y-2">
              {(sessions || []).length === 0 ? (
                <div className="text-sm text-slate-500">No active sessions found.</div>
              ) : (
                sessions?.map(s => (
                  <div key={s.id} className={cn('rounded-xl border p-3', s.is_current ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-800')}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {s.is_current ? 'Current session' : 'Session'}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {s.user_agent || 'Unknown device'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          IP: {s.ip_address || '—'} · Issued: {formatDateTime(s.issued_at)} · Expires: {formatDateTime(s.expires_at)}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(!s.is_current && 'text-red-600')}
                          onClick={() => revokeMutation.mutate(s.id)}
                          disabled={s.is_current || revokeMutation.isPending}
                        >
                          {revokeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Activity
          </CardTitle>
          <CardDescription>Recent security events for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-sm text-slate-500">Loading activity…</div>
          ) : (
            <div className="space-y-2">
              {(events || []).length === 0 ? (
                <div className="text-sm text-slate-500">No recent security events.</div>
              ) : (
                events?.map(e => (
                  <div key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                          {e.event_type}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(e.created_at)} · {e.ip_address || '—'}
                        </div>
                      </div>
                      <div className={cn('text-xs font-semibold px-2 py-1 rounded-lg', e.severity === 'critical' ? 'bg-red-100 text-red-700' : e.severity === 'error' ? 'bg-orange-100 text-orange-700' : e.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-700')}
                      >
                        {e.severity}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

