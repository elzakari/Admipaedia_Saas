import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Mail, Save, FlaskConical } from 'lucide-react';

interface EmailProviderCardProps {
  emailConfig: Record<string, any>;
  setEmailConfig: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  onSave: () => void;
  onTest: () => void;
  isSaving: boolean;
  isTesting: boolean;
  testStatus: 'idle' | 'verified' | 'failed';
  statusNote?: string | null;
  providerWarning?: string | null;
  configStatus?: string | null;
}

export const EmailProviderCard: React.FC<EmailProviderCardProps> = ({
  emailConfig,
  setEmailConfig,
  onSave,
  onTest,
  isSaving,
  isTesting,
  testStatus,
  statusNote,
  providerWarning,
  configStatus,
}) => {
  const { t } = useTranslation();

  // Backward compatibility: Treat legacy smtp configs containing amazonaws.com as ses_smtp
  useEffect(() => {
    if (
      emailConfig.provider_key === 'smtp' &&
      emailConfig.smtpHost &&
      String(emailConfig.smtpHost).includes('amazonaws.com')
    ) {
      setEmailConfig((p) => ({
        ...p,
        provider_key: 'ses_smtp',
        display_name: 'Amazon SES SMTP',
      }));
    }
  }, [emailConfig.smtpHost, emailConfig.provider_key, setEmailConfig]);

  const handleProviderChange = (value: string) => {
    let displayName = 'SMTP';
    if (value === 'ses_smtp') displayName = 'Amazon SES SMTP';
    else if (value === 'resend') displayName = 'Resend API';
    else if (value === 'ses_api') displayName = 'Amazon SES API';

    setEmailConfig((p) => ({
      ...p,
      provider_key: value,
      display_name: displayName,
    }));
  };

  const currentProvider = emailConfig.provider_key || 'smtp';

  return (
    <Card className="border rounded-xl shadow-sm bg-white dark:bg-slate-900">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <CardTitle className="text-lg font-bold">{t('platform_settings.email_provider_card.title', 'Email Integration')}</CardTitle>
              <CardDescription className="text-xs">
                {t('platform_settings.email_provider_card.description', 'Configure global platform outbound communication service provider.')}
              </CardDescription>
            </div>
            {testStatus === 'verified' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                Verified
              </span>
            )}
            {testStatus === 'failed' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                Failed
              </span>
            )}
            {configStatus && configStatus !== 'active' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                {configStatus.replaceAll('_', ' ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isSaving || isTesting}
              onClick={onTest}
              className="h-9 px-3 text-xs"
            >
              <FlaskConical className="h-4 w-4 mr-2" />
              {t('common.test', 'Test')}
            </Button>
            <Button
              disabled={isSaving || isTesting}
              onClick={onSave}
              className="h-9 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {t('common.save', 'Save Email')}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {providerWarning ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {providerWarning}
          </div>
        ) : null}
        {statusNote ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {statusNote}
          </div>
        ) : null}
        {/* Strategy Selector trigger */}
        <div className="space-y-2 max-w-md">
          <Label className="text-sm font-semibold">{t('platform_settings.email_provider_card.strategy', 'Email Strategy')}</Label>
          <Select value={currentProvider} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-full bg-slate-50 dark:bg-slate-800 border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ses_api">Amazon SES API (AWS Native SDK)</SelectItem>
              <SelectItem value="ses_smtp">Amazon SES SMTP (Direct Port Integration)</SelectItem>
              <SelectItem value="smtp">Direct SMTP (Generic Outbound Server)</SelectItem>
              <SelectItem value="resend">Resend API (REST JSON Gateway)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic switchable schema layouts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(currentProvider === 'smtp' || currentProvider === 'ses_smtp') && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">SMTP Host</Label>
                <Input
                  value={emailConfig.smtpHost || ''}
                  onChange={(e) => setEmailConfig((p) => ({ ...p, smtpHost: e.target.value }))}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">SMTP Port</Label>
                <Input
                  type="number"
                  value={emailConfig.smtpPort ?? ''}
                  onChange={(e) => setEmailConfig((p) => ({ ...p, smtpPort: e.target.value ? Number(e.target.value) : '' }))}
                  placeholder="587"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">SMTP Username</Label>
                <Input
                  value={emailConfig.smtpUsername || ''}
                  onChange={(e) => setEmailConfig((p) => ({ ...p, smtpUsername: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">SMTP Password</Label>
                <Input
                  type="password"
                  value={emailConfig.smtpPassword || ''}
                  onChange={(e) => setEmailConfig((p) => ({ ...p, smtpPassword: e.target.value }))}
                  placeholder="********"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">SMTP Encryption</Label>
                <Select
                  value={emailConfig.smtpEncryption || 'tls'}
                  onValueChange={(val) => setEmailConfig((p) => ({ ...p, smtpEncryption: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tls">STARTTLS (Port 587 / 2587)</SelectItem>
                    <SelectItem value="ssl">SSL / TLS (Port 465)</SelectItem>
                    <SelectItem value="none">None (Port 25 / 8025)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {currentProvider === 'resend' && (
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-semibold">Resend API Key</Label>
              <Input
                type="password"
                value={emailConfig.apiKey || ''}
                onChange={(e) => setEmailConfig((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          )}

          {currentProvider === 'ses_api' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">AWS Access Key ID</Label>
                <Input
                  value={emailConfig.awsAccessKeyId || ''}
                  onChange={(e) => setEmailConfig((p) => ({ ...p, awsAccessKeyId: e.target.value }))}
                  placeholder="AKIAXXXXXXXXXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">AWS Secret Access Key</Label>
                <Input
                  type="password"
                  value={emailConfig.awsSecretAccessKey || ''}
                  onChange={(e) => setEmailConfig((p) => ({ ...p, awsSecretAccessKey: e.target.value }))}
                  placeholder="********"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">AWS Region</Label>
                <Select
                  value={emailConfig.awsRegion || 'us-east-1'}
                  onValueChange={(val) => setEmailConfig((p) => ({ ...p, awsRegion: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us-east-1">US East (N. Virginia) [us-east-1]</SelectItem>
                    <SelectItem value="us-east-2">US East (Ohio) [us-east-2]</SelectItem>
                    <SelectItem value="us-west-2">US West (Oregon) [us-west-2]</SelectItem>
                    <SelectItem value="eu-west-1">Europe (Ireland) [eu-west-1]</SelectItem>
                    <SelectItem value="ap-southeast-1">Asia Pacific (Singapore) [ap-southeast-1]</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Shared Standard Branding Fields */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">From Email Address</Label>
            <Input
              type="email"
              value={emailConfig.fromEmail || ''}
              onChange={(e) => setEmailConfig((p) => ({ ...p, fromEmail: e.target.value }))}
              placeholder="support@admipaedia.easymsdigit.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">From Name (Branding)</Label>
            <Input
              value={emailConfig.fromName || ''}
              onChange={(e) => setEmailConfig((p) => ({ ...p, fromName: e.target.value }))}
              placeholder="Admipaedia Support"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
