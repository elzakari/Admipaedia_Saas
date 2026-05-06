import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Settings, 
  Save,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  Calendar,
  HardDrive,
  Globe,
  Shield,
  History
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

interface BackupRecord {
  id: string;
  timestamp: string;
  type: 'automatic' | 'manual';
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  duration: number;
  files: number;
  storage: string;
  checksum: string;
  error?: string;
}

interface BackupSchedule {
  nextBackup: string;
  lastBackup: string;
  estimatedSize: string;
  availableSpace: string;
}

const BackupSettings = () => {
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
    onSuccess: (data) => {
      const payload = unwrap(data);
      if (payload && typeof payload === 'object') {
        setSettings((prev) => ({ ...prev, ...(payload as any) }));
      }
    }
  });

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
        title: "Backup Settings Updated",
        description: "Backup configuration has been updated successfully.",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update backup settings",
        variant: "destructive"
      });
    }
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: (type: 'manual' | 'automatic') => settingsService.createBackup(type),
    onSuccess: () => {
      toast({
        title: "Backup Created",
        description: "Manual backup has been created successfully.",
        variant: "default"
      });
      setIsCreatingBackup(false);
      setBackupProgress(0);
      queryClient.invalidateQueries({ queryKey: ['backup-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Backup Failed",
        description: error.message || "Failed to create backup",
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
        title: "Restore Completed",
        description: "System has been restored from backup successfully.",
        variant: "default"
      });
      setIsRestoring(false);
      setSelectedBackup(null);
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message || "Failed to restore from backup",
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
    if (confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      try {
        await settingsService.deleteBackup(backupId);
        toast({
          title: "Backup Deleted",
          description: "Backup has been deleted successfully.",
          variant: "default"
        });
        queryClient.invalidateQueries({ queryKey: ['backup-history'] });
      } catch (error: any) {
        toast({
          title: "Delete Failed",
          description: error.message || "Failed to delete backup",
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
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
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
          <h2 className="text-2xl font-bold tracking-tight">Backup & Recovery</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure data backup and recovery options</p>
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
            {isCreatingBackup ? 'Creating...' : 'Create Backup'}
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
            Save Settings
          </Button>
        </div>
      </div>

      {/* Backup Progress */}
      {isCreatingBackup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Creating Backup
            </CardTitle>
            <CardDescription>Please wait while we create your backup</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={backupProgress} className="w-full" />
            <p className="text-sm text-gray-500 mt-2">{backupProgress}% complete</p>
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
                Next Backup
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
                Last Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{hasLast ? format(lastBackupDate!, 'MMM dd, HH:mm') : '—'}</p>
              <p className="text-sm text-gray-500">
                {hasLast ? `${Math.floor((Date.now() - lastBackupDate!.getTime()) / (1000 * 60 * 60))} hours ago` : '—'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Storage Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{normalizedSchedule.availableSpace || '—'}</p>
              <p className="text-sm text-gray-500">Available space</p>
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
              Auto Backup Configuration
            </CardTitle>
            <CardDescription>Configure automatic backup settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">Enable Auto Backup</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Automatically create backups on schedule</p>
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
                    <Label htmlFor="backup-frequency">Frequency</Label>
                    <Select value={settings.backupFrequency} onValueChange={(value) => handleInputChange('backupFrequency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backup-time">Time</Label>
                    <Input
                      id="backup-time"
                      type="time"
                      value={settings.backupTime}
                      onChange={(e) => handleInputChange('backupTime', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retention">Retention Period (days)</Label>
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
              Storage Configuration
            </CardTitle>
            <CardDescription>Configure backup storage options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storage-type">Storage Type</Label>
              <Select value={settings.storageType} onValueChange={(value) => handleInputChange('storageType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Storage</SelectItem>
                  <SelectItem value="cloud">Cloud Storage</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Local + Cloud)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.storageType !== 'cloud' && (
              <div className="space-y-2">
                <Label htmlFor="local-path">Local Storage Path</Label>
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
                  <Label htmlFor="cloud-provider">Cloud Provider</Label>
                  <Select value={settings.cloudProvider} onValueChange={(value) => handleInputChange('cloudProvider', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aws">Amazon Web Services</SelectItem>
                      <SelectItem value="gcp">Google Cloud Platform</SelectItem>
                      <SelectItem value="azure">Microsoft Azure</SelectItem>
                      <SelectItem value="custom">Custom S3 Compatible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cloud-bucket">Bucket/Container Name</Label>
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
                <Label htmlFor="encryption">Enable Encryption</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">Encrypt backup data</p>
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
            Backup Content
          </CardTitle>
          <CardDescription>Select what data to include in backups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-students">Student Data</Label>
                <p className="text-sm text-gray-500">Student records and profiles</p>
              </div>
              <Switch
                id="backup-students"
                checked={settings.backupStudents}
                onCheckedChange={(checked) => handleInputChange('backupStudents', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-teachers">Teacher Data</Label>
                <p className="text-sm text-gray-500">Teacher records and profiles</p>
              </div>
              <Switch
                id="backup-teachers"
                checked={settings.backupTeachers}
                onCheckedChange={(checked) => handleInputChange('backupTeachers', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-academic">Academic Data</Label>
                <p className="text-sm text-gray-500">Grades, schedules, curriculum</p>
              </div>
              <Switch
                id="backup-academic"
                checked={settings.backupAcademicData}
                onCheckedChange={(checked) => handleInputChange('backupAcademicData', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-financial">Financial Data</Label>
                <p className="text-sm text-gray-500">Fees, payments, transactions</p>
              </div>
              <Switch
                id="backup-financial"
                checked={settings.backupFinancialData}
                onCheckedChange={(checked) => handleInputChange('backupFinancialData', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-settings">System Settings</Label>
                <p className="text-sm text-gray-500">Configuration and preferences</p>
              </div>
              <Switch
                id="backup-settings"
                checked={settings.backupSystemSettings}
                onCheckedChange={(checked) => handleInputChange('backupSystemSettings', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="backup-media">Media Files</Label>
                <p className="text-sm text-gray-500">Images, documents, uploads</p>
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
            Backup History
          </CardTitle>
          <CardDescription>Recent backup operations and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backupHistory.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No backups found. Create your first backup to get started.</AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Storage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
