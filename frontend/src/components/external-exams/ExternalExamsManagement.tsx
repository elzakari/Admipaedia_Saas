import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import {
  Upload,
  Download,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Settings
} from 'lucide-react';

import externalExamsService, {
  ExternalExamination,
  ExternalExamResult,
  ImportResult,
  PerformanceComparison
} from '../../services/externalExamsService';

interface ExternalExamsManagementProps {
  className?: string;
}

interface ExamFilters {
  exam_type: string;
  exam_year: number;
  page: number;
  per_page: number;
}

interface NewExamForm {
  exam_type: string;
  exam_year: number;
  exam_session: string;
  exam_name: string;
  exam_start_date: string;
  exam_end_date: string;
  auto_import_enabled: boolean;
}

type ResultStatus = 'pending' | 'released' | 'verified' | 'disputed' | 'cancelled';
type ExamType = 'bece' | 'wassce' | 'novdec' | 'private';
type ExamSession = 'may_june' | 'november_december' | 'march_april';

const ExternalExamsManagement: React.FC<ExternalExamsManagementProps> = ({ className }) => {
  const [examinations, setExaminations] = useState<ExternalExamination[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExternalExamination | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceComparison | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('examinations');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Form states
  const [newExamForm, setNewExamForm] = useState<NewExamForm>({
    exam_type: '',
    exam_year: new Date().getFullYear(),
    exam_session: '',
    exam_name: '',
    exam_start_date: '',
    exam_end_date: '',
    auto_import_enabled: false
  });

  const [filters, setFilters] = useState<ExamFilters>({
    exam_type: '',
    exam_year: new Date().getFullYear(),
    page: 1,
    per_page: 20
  });

  const loadExaminations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await externalExamsService.getExaminations(filters);
      setExaminations(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load examinations';
      setError(errorMessage);
      console.error('Error loading examinations:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadExaminations();
  }, [loadExaminations]);

  const handleCreateExamination = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!newExamForm.exam_type || !newExamForm.exam_session || !newExamForm.exam_name || 
          !newExamForm.exam_start_date || !newExamForm.exam_end_date) {
        setError('Please fill in all required fields');
        return;
      }

      await externalExamsService.createExamination(newExamForm);
      
      // Reset form
      setNewExamForm({
        exam_type: '',
        exam_year: new Date().getFullYear(),
        exam_session: '',
        exam_name: '',
        exam_start_date: '',
        exam_end_date: '',
        auto_import_enabled: false
      });
      
      setIsDialogOpen(false);
      await loadExaminations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create examination';
      setError(errorMessage);
      console.error('Error creating examination:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (examId: number, file: File): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const result = await externalExamsService.importResults(examId, file);
      setImportResult(result);
      await loadExaminations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import results';
      setError(errorMessage);
      console.error('Error importing results:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceComparison = async (examType?: string, examYear?: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await externalExamsService.getPerformanceComparison({
        exam_type: examType,
        exam_year: examYear
      });
      setPerformanceData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load performance data';
      setError(errorMessage);
      console.error('Error loading performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async (examType: string): Promise<void> => {
    try {
      setLoading(true);
      const blob = await externalExamsService.downloadImportTemplate(examType);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${examType}_import_template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download template';
      setError(errorMessage);
      console.error('Error downloading template:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ResultStatus) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      released: { color: 'bg-blue-100 text-blue-800', icon: FileText },
      verified: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      disputed: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file && selectedExam) {
      handleFileImport(selectedExam.id, file);
    }
  };

  const handleFilterChange = (key: keyof ExamFilters, value: string | number): void => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleFormChange = (key: keyof NewExamForm, value: string | number | boolean): void => {
    setNewExamForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">External Examinations</h1>
          <p className="text-gray-600 mt-2">
            Manage BECE, WASSCE, and other external examination integrations
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="w-4 h-4 mr-2" />
              New Examination
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create External Examination</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Exam Type *</label>
                <Select
                  value={newExamForm.exam_type}
                  onValueChange={(value: ExamType) => handleFormChange('exam_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bece">BECE</SelectItem>
                    <SelectItem value="wassce">WASSCE</SelectItem>
                    <SelectItem value="novdec">Nov/Dec WASSCE</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Exam Year *</label>
                <Input
                  type="number"
                  value={newExamForm.exam_year}
                  onChange={(e) => handleFormChange('exam_year', parseInt(e.target.value) || new Date().getFullYear())}
                  min={2000}
                  max={2050}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Session *</label>
                <Select
                  value={newExamForm.exam_session}
                  onValueChange={(value: ExamSession) => handleFormChange('exam_session', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="may_june">May/June</SelectItem>
                    <SelectItem value="november_december">November/December</SelectItem>
                    <SelectItem value="march_april">March/April</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Exam Name *</label>
                <Input
                  value={newExamForm.exam_name}
                  onChange={(e) => handleFormChange('exam_name', e.target.value)}
                  placeholder="e.g., BECE 2024"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date *</label>
                  <Input
                    type="date"
                    value={newExamForm.exam_start_date}
                    onChange={(e) => handleFormChange('exam_start_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date *</label>
                  <Input
                    type="date"
                    value={newExamForm.exam_end_date}
                    onChange={(e) => handleFormChange('exam_end_date', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-import"
                  checked={newExamForm.auto_import_enabled}
                  onChange={(e) => handleFormChange('auto_import_enabled', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="auto-import" className="text-sm font-medium">
                  Enable auto import
                </label>
              </div>
              
              <Button 
                onClick={handleCreateExamination}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Creating...' : 'Create Examination'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="examinations">Examinations</TabsTrigger>
          <TabsTrigger value="import">Import Results</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="examinations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                External Examinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Select
                  value={filters.exam_type || "all"}
                  onValueChange={(value) => handleFilterChange('exam_type', value === "all" ? "" : value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bece">BECE</SelectItem>
                    <SelectItem value="wassce">WASSCE</SelectItem>
                    <SelectItem value="novdec">Nov/Dec</SelectItem>
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  placeholder="Year"
                  value={filters.exam_year}
                  onChange={(e) => handleFilterChange('exam_year', parseInt(e.target.value) || new Date().getFullYear())}
                  className="w-32"
                  min={2000}
                  max={2050}
                />
              </div>

              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading examinations...</p>
                </div>
              )}

              <div className="space-y-4">
                {examinations.map((exam) => (
                  <div key={exam.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{exam.exam_name}</h3>
                          {getStatusBadge(exam.result_status)}
                          <Badge variant="outline">
                            {exam.exam_type.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Code:</span> {exam.exam_code}
                          </div>
                          <div>
                            <span className="font-medium">Year:</span> {exam.exam_year}
                          </div>
                          <div>
                            <span className="font-medium">Registrations:</span> {exam.total_registrations}
                          </div>
                          <div>
                            <span className="font-medium">Results:</span> {exam.total_results}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span>📅 {exam.exam_start_date} to {exam.exam_end_date}</span>
                          {exam.auto_import_enabled && (
                            <Badge variant="secondary" className="text-xs">
                              <Settings className="w-3 h-3 mr-1" />
                              Auto Import
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedExam(exam)}
                        >
                          <Users className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {!loading && examinations.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No examinations found</p>
                    <p className="text-sm">Create a new examination to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Examination Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Examination</label>
                  <Select
                    value={selectedExam?.id.toString() || ''}
                    onValueChange={(value) => {
                      const exam = examinations.find(e => e.id.toString() === value);
                      setSelectedExam(exam || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose examination" />
                    </SelectTrigger>
                    <SelectContent>
                      {examinations.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id.toString()}>
                          {exam.exam_name} ({exam.exam_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedExam && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload Results File</h3>
                    <p className="text-gray-600 mb-4">
                      Upload CSV file with examination results for {selectedExam.exam_name}
                    </p>
                    
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="file-upload"
                      disabled={loading}
                    />
                    
                    <div className="flex gap-2 justify-center">
                      <Button 
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={loading}
                      >
                        {loading ? 'Uploading...' : 'Choose File'}
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => handleDownloadTemplate(selectedExam.exam_type)}
                        disabled={loading}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Template
                      </Button>
                    </div>
                  </div>
                )}

                {importResult && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Import Completed
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Total:</span> {importResult.total_records}
                        </div>
                        <div>
                          <span className="font-medium">Successful:</span> {importResult.successful_imports}
                        </div>
                        <div>
                          <span className="font-medium">Failed:</span> {importResult.failed_imports}
                        </div>
                        <div>
                          <span className="font-medium">Duplicates:</span> {importResult.duplicate_records}
                        </div>
                      </div>
                      
                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-red-800 mb-2">Import Errors:</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {importResult.errors.map((error, index) => (
                              <div key={index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                                Row {error.row} (Index: {error.index_number}): {error.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Select
                    onValueChange={(value) => loadPerformanceComparison(value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bece">BECE</SelectItem>
                      <SelectItem value="wassce">WASSCE</SelectItem>
                      <SelectItem value="novdec">Nov/Dec WASSCE</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="number"
                    placeholder="Year"
                    onChange={(e) => {
                      const year = parseInt(e.target.value);
                      if (year) loadPerformanceComparison(undefined, year);
                    }}
                    className="w-32"
                    min={2000}
                    max={2050}
                  />
                </div>

                {performanceData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Overall Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Students Analyzed:</span>
                            <span className="font-semibold">{performanceData.total_students}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Subjects:</span>
                            <span className="font-semibold">{performanceData.subjects_analyzed}</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>External Average:</span>
                            <span className="font-semibold">{performanceData.average_external_performance.toFixed(1)}%</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Internal Average:</span>
                            <span className="font-semibold">{performanceData.average_internal_performance.toFixed(1)}%</span>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>Correlation:</span>
                            <span className="font-semibold">{(performanceData.performance_correlation * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Grade Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-2">External Exams</h4>
                            <div className="space-y-1">
                              {Object.entries(performanceData.grade_distribution.external).map(([grade, count]) => (
                                <div key={grade} className="flex justify-between items-center text-sm">
                                  <span>{grade}:</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm mb-2">Internal Assessments</h4>
                            <div className="space-y-1">
                              {Object.entries(performanceData.grade_distribution.internal).map(([grade, count]) => (
                                <div key={grade} className="flex justify-between items-center text-sm">
                                  <span>{grade}:</span>
                                  <span className="font-medium">{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Subject Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {performanceData.subject_breakdown.slice(0, 5).map((subject, index) => (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between items-center text-sm">
                                <span className="truncate">{subject.subject_name}</span>
                                <span className="text-xs text-gray-500">
                                  {(subject.correlation * 100).toFixed(0)}% corr
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500">Ext: {subject.external_average.toFixed(1)}%</div>
                                  <Progress value={subject.external_average} className="h-1" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500">Int: {subject.internal_average.toFixed(1)}%</div>
                                  <Progress value={subject.internal_average} className="h-1" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {!performanceData && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select exam type and year to view analytics</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Integration Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Auto Import Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">BECE Results Auto Import</h4>
                        <p className="text-sm text-gray-600">Automatically import BECE results when available</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">WASSCE Results Auto Import</h4>
                        <p className="text-sm text-gray-600">Automatically import WASSCE results when available</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Data Validation Rules</h3>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Grade Validation</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Configure validation rules for imported grades
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Min Grade (BECE)</label>
                          <Input type="number" defaultValue="1" min="1" max="9" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Max Grade (BECE)</label>
                          <Input type="number" defaultValue="9" min="1" max="9" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Student Matching</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Configure how students are matched during import
                      </p>
                      <Select defaultValue="index_number">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="index_number">Index Number</SelectItem>
                          <SelectItem value="student_id">Student ID</SelectItem>
                          <SelectItem value="name_dob">Name + Date of Birth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Save Settings
                  </Button>
                  <Button variant="outline">
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExternalExamsManagement;