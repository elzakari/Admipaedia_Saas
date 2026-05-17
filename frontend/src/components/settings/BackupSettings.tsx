import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useToast } from '../ui/use-toast';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Database, 
  Cloud, 
  Clock, 
  Download, 
  Upload, 
  Save,
  RefreshCw,
  Trash2,
  AlertCircle,
  HardDrive,
  Globe,
  History,
  Calendar
} from 'lucide-react';
import { settingsService } from '../../services';
import { format, isValid } from 'date-fns';

interface BackupSettings {
  // Auto Backup Configuration
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  backupRetention: number; // days
  
  // Storage Configuration
  storageType: 'local' | 'cloud' | 'hybrid';
  localStoragePath: string;
  cloudProvider: 'aws' | 'gcp' | 'azure' | 'custom';
  cloudBucket: string;
  encryptionEnabled: boolean;
  
  // Backup Content
  backupStudents: boolean;
  backupTeachers: boolean;
  backupAcademicData: boolean;
  backupFinancialData: boolean;
  backupSystemSettings: boolean;
  backupMediaFiles: boolean;
  
  // Verification
  verifyBackups: boolean;
  checksumValidation: boolean;
  
  // Notifications
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notificationEmail: string;
}

interface BackupSchedule {
  nextBackup: string;
  lastBackup: string;
  estimatedSize: string;
  availableSpace: string;
}

const BackupSettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [backupProgress, setBackupProgress] = useState(0);

  const [settings, setSettings] = useState<BackupSettings>({
    // Auto Backup Configuration
    autoBackupEnabled: true,
    backupFrequency: 'weekly',
    backupTime: '02:00',
    backupRetention: 30,
    
    // Storage Configuration
    storageType: 'hybrid',
    localStoragePath: '/backups/admipaedia',
    cloudProvider: 'aws',
    cloudBucket: 'admipaedia-backups',
    encryptionEnabled: true,
    
    // Backup Content
    backupStudents: true,
    backupTeachers: true,
    backupAcademicData: true,
    backupFinancialData: true,
    backupSystemSettings: true,
    backupMediaFiles: true,
    
    // Verification
    verifyBackups: true,
    checksumValidation: true,
    
    // Notifications
    notifyOnSuccess: true,
    notifyOnFailure: true,
    notificationEmail: 'admin@admipaedia.edu.gh'
  });

  const unwrap = (raw: any) => {
    if (!raw) return null;
    return raw?.data ?? raw?.settings ?? raw?.schedule ?? raw?.backup_schedule ?? raw;
  };

  // Fetch current settings
  const { data: currentSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['backup-settings'],
    queryFn: () => settingsService.getBackupSettings(),
  } as any);

  useEffect(() => {
    const payload = unwrap(currentSettings)
    if (payload && typeof payload === 'object') {
      setSettings((prev) => ({ ...prev, ...(payload as any) }))
    }
  }, [currentSettings])

  // Fetch backup history
  const { data: backupHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['backup-history'],
    queryFn: () => settingsService.getBackupHistory()
  });

  // Fetch backup schedule
  const { data: backupSchedule } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: () => settingsService.getBackupSchedule()
  });

  const normalizedSchedule = unwrap(backupSchedule) as Partial<BackupSchedule> | null;
  const nextBackupDate = normalizedSchedule?.nextBackup ? new Date(normalizedSchedule.nextBackup) : null;
  const lastBackupDate = normalizedSchedule?.lastBackup ? new Date(normalizedSchedule.lastBackup) : null;
  const hasNext = !!nextBackupDate && isValid(nextBackupDate);
  const hasLast = !!lastBackupDate && isValid(lastBackupDate);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: BackupSettings) => settingsService.updateBackupSettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: t('admin_settings.settings_updated', 'Backup Settings Updated'),
        description: t('admin_settings.settings_updated_desc', 'Backup configuration has been updated successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message || t('admin_settings.update_failed', 'Failed to update backup settings'),
        variant: "destructive"
      });
    }
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: (type: 'manual' | 'automatic') => settingsService.createBackup(type),
    onSuccess: () => {
      toast({
        title: t('admin_settings.backup_created', 'Backup Created'),
        description: t('admin_settings.backup_created_desc', 'Manual backup has been created successfully.'),
        variant: "default"
      });
      setIsCreatingBackup(false);
      setBackupProgress(0);
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin_settings.backup_failed', 'Backup Failed'),
        description: error.message || t('admin_settings.backup_failed_desc', 'Failed to create backup'),
        variant: "destructive"
      });
      setIsCreatingBackup(false);
      setBackupProgress(0);
    }
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: string) => settingsService.restoreBackup(backupId),
    onSuccess: () => {
      toast({
        title: t('admin_settings.restore_completed', 'Restore Completed'),
        description: t('admin_settings.restore_completed_desc', 'System has been restored from backup successfully.'),
        variant: "default"
      });
      setIsRestoring(false);
      setSelectedBackup(null);
    },
    onError: (error: any) => {
      toast({
        title: t('admin_settings.restore_failed', 'Restore Failed'),
        description: error.message || t('admin_settings.restore_failed_desc', 'Failed to restore from backup'),
        variant: "destructive"
      });
      setIsRestoring(false);
      setSelectedBackup(null);
    }
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleInputChange = (field: keyof BackupSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setBackupProgress(0);
    
    // Simulate backup progress
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    try {
      await createBackupMutation.mutateAsync('manual');
    } finally {
      clearInterval(interval);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    setSelectedBackup(backupId);
    setIsRestoring(true);
    
    try {
      await restoreBackupMutation.mutateAsync(backupId);
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm(t('admin_settings.delete_backup_confirm', 'Are you sure you want to delete this backup? This action cannot be undone.'))) {
      try {
        await settingsService.deleteBackup(backupId);
        toast({
          title: t('admin_settings.backup_deleted', 'Backup Deleted'),
          description: t('admin_settings.backup_deleted_desc', 'Backup has been deleted successfully.'),
          variant: "default"
        });
        queryClient.invalidateQueries({ queryKey: ['backup-history'] });
      } catch (error: any) {
        toast({
          title: t('admin_settings.delete_failed', 'Delete Failed'),
          description: error.message || t('admin_settings.delete_failed_desc', 'Failed to delete backup'),
          variant: "destructive"
        });
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">{t('common.completed', 'Completed')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('common.failed', 'Failed')}</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">{t('common.in_progress', 'In Progress')}</Badge>;
      default:
        return <Badge variant="outline">{t('common.unknown', 'Unknown')}</Badge>;
    }
  };

  if (settingsLoading || historyLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.backup_recovery', 'Backup & Recovery')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.backup_recovery_desc', 'Configure data backup and recovery options')}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="flex items-center gap-2"
          >
            {isCreatingBackup ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {isCreatingBackup ? t('common.creating', 'Creating...') : t('admin_settings.create_backup', 'Create Backup')}
          </Button>
          <Button 
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
          >
            {updateSettingsMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('school_settings.save_changes', 'Save Settings')}
          </Button>
        </div>
      </div>

      {/* Backup Progress */}
      {isCreatingBackup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              {t('admin_settings.creating_backup', 'Creating Backup')}
            </CardTitle>
            <CardDescription>{t('admin_settings.creating_backup_desc', 'Please wait while we create your backup')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={backupProgress} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">{backupProgress}{t('admin_settings.percent_complete', '% complete')}</p>
          </CardContent>
        </Card>
      )}

      {/* Status Overview */}
      {normalizedSchedule && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('admin_settings.next_backup', 'Next Backup')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hasNext ? format(nextBackupDate!, 'MMM dd, HH:mm') : '—'}</p>
              <p className="text-sm text-gray-500">{hasNext ? format(nextBackupDate!, 'EEEE') : '—'}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                {t('admin_settings.last_backup', 'Last Backup')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hasLast ? format(lastBackupDate!, 'MMM dd, HH:mm') : '—'}</p>
              <p className="text-sm text-gray-500">
                {hasLast ? `${Math.floor((Date.now() - lastBackupDate!.getTime()) / (1000 * 60 * 60))} ${t('admin_settings.hours_ago', 'hours ago')}` : '—'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                {t('admin_settings.storage_status', 'Storage Status')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{normalizedSchedule.availableSpace || '—'}</p>
              <p className="text-sm text-gray-500">{t('admin_settings.available_space', 'Available space')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auto Backup Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('admin_settings.auto_backup_config', 'Auto Backup Configuration')}
            </CardTitle>
            <CardDescription>{t('admin_settings.auto_backup_config_desc', 'Configure automatic backup settings')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">{t('admin_settings.enable_auto_backup', 'Enable Auto Backup')}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.auto_backup_desc', 'Automatically create backups on schedule')}</p>
              </div>
              <Switch
                id="auto-backup"
                checked={settings.autoBackupEnabled}
                onCheckedChange={(checked) => handleInputChange('autoBackupEnabled', checked)}
              />
            </div>

            {settings.autoBackupEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">{t('admin_settings.frequency', 'Frequency')}</Label>
                    <Select value={settings.backupFrequency} onValueChange={(value) => handleInputChange('backupFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t('admin_settings.daily', 'Daily')}</SelectItem>
                        <SelectItem value="weekly">{t('admin_settings.weekly', 'Weekly')}</SelectItem>
                        <SelectItem value="monthly">{t('admin_settings.monthly', 'Monthly')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-time">{t('common.time', 'Time')}</Label>
                    <Input
                      id="backup-time"
                      type="time"
                      value={settings.backupTime}
                      onChange={(e) => handleInputChange('backupTime', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention">{t('admin_settings.retention_period', 'Retention Period (days)')}</Label>
                  <Input
                    id="retention"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.backupRetention}
                    onChange={(e) => handleInputChange('backupRetention', parseInt(e.target.value))}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Storage Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              {t('admin_settings.storage_config', 'Storage Configuration')}
            </CardTitle>
            <CardDescription>{t('admin_settings.storage_config_desc', 'Configure backup storage options')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storage-type">{t('admin_settings.storage_type', 'Storage Type')}</Label>
              <Select value={settings.storageType} onValueChange={(value) => handleInputChange('storageType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">{t('admin_settings.local_storage', 'Local Storage')}</SelectItem>
                  <SelectItem value="cloud">{t('admin_settings.cloud_storage', 'Cloud Storage')}</SelectItem>
                  <SelectItem value="hybrid">{t('admin_settings.hybrid_storage', 'Hybrid (Local + Cloud)')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.storageType !== 'cloud' && (
              <div className="space-y-2">
                <Label htmlFor="local-path">{t('admin_settings.local_path', 'Local Storage Path')}</Label>
                <Input
                  id="local-path"
                  value={settings.localStoragePath}
                  onChange={(e) => handleInputChange('localStoragePath', e.target.value)}
                  placeholder="/backups/admipaedia"
                />
              </div>
            )}

            {(settings.storageType === 'cloud' || settings.storageType === 'hybrid') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cloud-provider">{t('admin_settings.cloud_provider', 'Cloud Provider')}</Label>
                  <Select value={settings.cloudProvider} onValueChange={(value) => handleInputChange('cloudProvider', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">{t('admin_settings.aws', 'Amazon Web Services')}</SelectItem>
                      <SelectItem value="gcp">{t('admin_settings.gcp', 'Google Cloud Platform')}</SelectItem>
                      <SelectItem value="azure">{t('admin_settings.azure', 'Microsoft Azure')}</SelectItem>
                      <SelectItem value="custom">{t('admin_settings.custom_s3', 'Custom S3 Compatible')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cloud-bucket">{t('admin_settings.bucket_name', 'Bucket/Container Name')}</Label>
                  <Input
                    id="cloud-bucket"
                    value={settings.cloudBucket}
                    onChange={(e) => handleInputChange('cloudBucket', e.target.value)}
                    placeholder="admipaedia-backups"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="encryption">{t('admin_settings.enable_encryption', 'Enable Encryption')}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_settings.encrypt_desc', 'Encrypt backup data')}</p>
              </div>
              <Switch
                id="encryption"
                checked={settings.encryptionEnabled}
                onCheckedChange={(checked) => handleInputChange('encryptionEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('admin_settings.backup_content', 'Backup Content')}
          </CardTitle>
          <CardDescription>{t('admin_settings.backup_content_desc', 'Select what data to include in backups')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-students">{t('admin_settings.student_data', 'Student Data')}</Label>
                <p className="text-sm text-gray-500">{t('admin_settings.student_data_desc', 'Student records and profiles')}</p>
              </div>
              <Switch
                id="backup-students"
                checked={settings.backupStudents}
                onCheckedChange={(checked) => handleInputChange('backupStudents', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-teachers">{t('admin_settings.teacher_data', 'Teacher Data')}</Label>
                <p className="text-sm text-gray-500">{t('admin_settings.teacher_data_desc', 'Teacher records and profiles')}</p>
              </div>
              <Switch
                id="backup-teachers"
                checked={settings.backupTeachers}
                onCheckedChange={(checked) => handleInputChange('backupTeachers', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-academic">{t('admin_settings.academic_data', 'Academic Data')}</Label>
                <p className="text-sm text-gray-500">{t('admin_settings.academic_data_desc', 'Grades, schedules, curriculum')}</p>
              </div>
              <Switch
                id="backup-academic"
                checked={settings.backupAcademicData}
                onCheckedChange={(checked) => handleInputChange('backupAcademicData', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-financial">{t('admin_settings.financial_data', 'Financial Data')}</Label>
                <p className="text-sm text-gray-500">{t('admin_settings.financial_data_desc', 'Fees, payments, transactions')}</p>
              </div>
              <Switch
                id="backup-financial"
                checked={settings.backupFinancialData}
                onCheckedChange={(checked) => handleInputChange('backupFinancialData', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-settings">{t('admin_settings.system_settings', 'System Settings')}</Label>
                <p className="text-sm text-gray-500">{t('admin_settings.system_settings_desc', 'Configuration and preferences')}</p>
              </div>
              <Switch
                id="backup-settings"
                checked={settings.backupSystemSettings}
                onCheckedChange={(checked) => handleInputChange('backupSystemSettings', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-media">{t('admin_settings.media_files', 'Media Files')}</Label>
                <p className="text-sm text-gray-500">{t('admin_settings.media_files_desc', 'Images, documents, uploads')}</p>
              </div>
              <Switch
                id="backup-media"
                checked={settings.backupMediaFiles}
                onCheckedChange={(checked) => handleInputChange('backupMediaFiles', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('admin_settings.backup_history', 'Backup History')}
          </CardTitle>
          <CardDescription>{t('admin_settings.backup_history_desc', 'Recent backup operations and their status')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backupHistory.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t('admin_settings.no_backups_found', 'No backups found. Create your first backup to get started.')}</AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date_time', 'Date & Time')}</TableHead>
                      <TableHead>{t('common.type', 'Type')}</TableHead>
                      <TableHead>{t('common.status', 'Status')}</TableHead>
                      <TableHead>{t('common.size', 'Size')}</TableHead>
                      <TableHead>{t('common.duration', 'Duration')}</TableHead>
                      <TableHead>{t('admin_settings.storage', 'Storage')}</TableHead>
                      <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backupHistory.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{format(new Date(backup.timestamp), 'MMM dd, yyyy')}</div>
                            <div className="text-sm text-gray-500">{format(new Date(backup.timestamp), 'HH:mm')}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{backup.type}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(backup.status)}</TableCell>
                        <TableCell>{formatFileSize(backup.size)}</TableCell>
                        <TableCell>{formatDuration(backup.duration)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {backup.storage === 'local' && <HardDrive className="h-4 w-4" />}
                            {backup.storage === 'cloud' && <Cloud className="h-4 w-4" />}
                            {backup.storage === 'hybrid' && <Globe className="h-4 w-4" />}
                            <span className="text-sm">{backup.storage}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {/* Download logic */}}
                              disabled={backup.status !== 'completed'}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleRestoreBackup(backup.id)}
                              disabled={backup.status !== 'completed' || isRestoring}
                            >
                              {isRestoring && selectedBackup === backup.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Upload className="h-3 w-3" />
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteBackup(backup.id)}
                              disabled={isRestoring}
                              className="text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupSettings;
