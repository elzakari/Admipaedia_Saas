import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Props = {
  avatarUrl?: string | null;
  displayName: string;
  email: string;
  role: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  updatedAt?: string | null;
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export default function ProfileHeader({
  avatarUrl,
  displayName,
  email,
  role,
  emailVerified,
  mfaEnabled,
  updatedAt,
}: Props) {
  const [imageFailed, setImageFailed] = React.useState(false);

  React.useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const updated = formatDateTime(updatedAt);
  const initials = (displayName || email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'h-16 w-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-slate-700 to-slate-500 flex items-center justify-center text-white font-black',
              !avatarUrl && 'text-lg'
            )}>
              {avatarUrl && !imageFailed ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{email}</span>
                <Badge variant="secondary" className="capitalize">{role}</Badge>
                <Badge variant={emailVerified ? 'outline' : 'secondary'} className={cn(emailVerified ? 'border-green-200 text-green-700 bg-green-50' : '')}>
                  {emailVerified ? 'Email verified' : 'Email unverified'}
                </Badge>
                <Badge variant={mfaEnabled ? 'outline' : 'secondary'} className={cn(mfaEnabled ? 'border-blue-200 text-blue-700 bg-blue-50' : '')}>
                  {mfaEnabled ? 'MFA enabled' : 'MFA not enabled'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            <div className="font-medium">Edit in the Profile tab</div>
            <div>{updated ? `Last updated: ${updated}` : 'Last updated: —'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

