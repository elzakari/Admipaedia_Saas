import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Tabs, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';
import {
  Download, FileText, Mail, Settings,
  BarChart3, Calendar,
  Eye, Save, Share
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { reportsService } from '../../services/reportsService';

interface CustomReportBuilderProps {
  onReportGenerated?: (report: any) => void;
}

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: 'academic' | 'attendance' | 'financial' | 'behavioral' | 'custom';
  dateRange: {
    from: string;
    to: string;
    preset: 'current' | 'previous' | 'year' | 'custom';
  };
  filters: {
    classes: string[];
    subjects: string[];
    students: string[];
    teachers: string[];
  };
  visualizations: {
    charts: string[];
    tables: string[];
    metrics: string[];
  };
  exportFormats: string[];
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({ onReportGenerated }) => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    id: '',
    name: '',
    description: '',
    type: 'academic',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
      to: new Date().toISOString().split('T')[0] || '',
      preset: 'current'
    },
    filters: {
      classes: [],
      subjects: [],
      students: [],
      teachers: []
    },
    visualizations: {
      charts: ['performance_trend'],
      tables: ['student_grades'],
      metrics: ['average_grade', 'attendance_rate']
    },
    exportFormats: ['pdf'],
    schedule: {
      enabled: false,
      frequency: 'weekly',
      recipients: []
    }
  });

  const [savedReports, setSavedReports] = useState<ReportConfig[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<'config' | 'preview' | 'export'>('config');

  // Available options
  const reportTypes = [
    { value: 'academic', label: 'Academic Performance', icon: <BarChart3 className="h-4 w-4" /> },
    { value: 'attendance', label: 'Attendance Analysis', icon: <Calendar className="h-4 w-4" /> },
    { value: 'financial', label: 'Financial Reports', icon: <FileText className="h-4 w-4" /> },
    { value: 'behavioral', label: 'Behavioral Analysis', icon: <Eye className="h-4 w-4" /> },
    { value: 'custom', label: 'Custom Report', icon: <Settings className="h-4 w-4" /> }
  ];

  const chartTypes = [
    { value: 'performance_trend', label: 'Performance Trend', type: 'line' },
    { value: 'grade_distribution', label: 'Grade Distribution', type: 'pie' },
    { value: 'attendance_pattern', label: 'Attendance Pattern', type: 'bar' },
    { value: 'subject_comparison', label: 'Subject Comparison', type: 'bar' },
    { value: 'class_performance', label: 'Class Performance', type: 'radar' }
  ];

  const tableTypes = [
    { value: 'student_grades', label: 'Student Grades' },
    { value: 'attendance_summary', label: 'Attendance Summary' },
    { value: 'teacher_performance', label: 'Teacher Performance' },
    { value: 'class_statistics', label: 'Class Statistics' }
  ];

  const metricTypes = [
    { value: 'average_grade', label: 'Average Grade' },
    { value: 'attendance_rate', label: 'Attendance Rate' },
    { value: 'pass_rate', label: 'Pass Rate' },
    { value: 'improvement_rate', label: 'Improvement Rate' }
  ];

  const handleConfigChange = (field: string, value: any) => {
    setReportConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleVisualizationChange = (vizType: string, values: string[]) => {
    setReportConfig(prev => ({
      ...prev,
      visualizations: {
        ...prev.visualizations,
        [vizType]: values
      }
    }));
  };

  const generatePreview = async () => {
    setIsGenerating(true);
    try {
      const report = await reportsService.generateCustomReport(reportConfig);
      setPreviewData(report);
      setActiveStep('preview');
      toast.success('Report preview generated successfully');
    } catch (error) {
      toast.error('Failed to generate report preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = async (format: 'pdf' | 'csv') => {
    if (!previewData) return;
    setIsGenerating(true);
    try {
      const blob = await reportsService.exportReportData(previewData, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${new Date().getTime()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Report downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to download report as ${format.toUpperCase()}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport = async () => {
    // In this implementation, generateReport effectively does the same as generatePreview
    // but we can add more logic here if we wanted to save it to history
    await generatePreview();
    setActiveStep('export');
  };

  const saveReportTemplate = () => {
    const template = {
      ...reportConfig,
      id: Date.now().toString(),
      name: reportConfig.name || `Report Template ${savedReports.length + 1}`
    };
    setSavedReports(prev => [...prev, template]);
    toast.success('Report template saved');
  };

  const loadReportTemplate = (template: ReportConfig) => {
    setReportConfig(template);
    toast.success('Report template loaded');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Custom Report Builder</h2>
          <p className="text-gray-600 mt-1">Create customized reports with advanced analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveReportTemplate}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4">
        {['config', 'preview', 'export'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${activeStep === step ? 'bg-blue-500 text-white' :
              ['config', 'preview', 'export'].indexOf(activeStep) > index ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
              {index + 1}
            </div>
            <span className={`ml-2 text-sm font-medium ${activeStep === step ? 'text-blue-600' : 'text-gray-500'
              }`}>
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </span>
            {index < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-4" />}
          </div>
        ))}
      </div>

      <Tabs value={activeStep} onValueChange={(value: any) => setActiveStep(value)}>
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
                <CardDescription>Basic report settings and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    value={reportConfig.name}
                    onChange={(e) => handleConfigChange('name', e.target.value)}
                    placeholder="Enter report name"
                  />
                </div>

                <div>
                  <Label htmlFor="reportDescription">Description</Label>
                  <Input
                    id="reportDescription"
                    value={reportConfig.description}
                    onChange={(e) => handleConfigChange('description', e.target.value)}
                    placeholder="Brief description of the report"
                  />
                </div>

                <div>
                  <Label>Report Type</Label>
                  <Select value={reportConfig.type} onValueChange={(value) => handleConfigChange('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            {type.icon}
                            <span className="ml-2">{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFrom">From Date</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={reportConfig.dateRange.from}
                      onChange={(e) => handleConfigChange('dateRange', {
                        ...reportConfig.dateRange,
                        from: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">To Date</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={reportConfig.dateRange.to}
                      onChange={(e) => handleConfigChange('dateRange', {
                        ...reportConfig.dateRange,
                        to: e.target.value
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Visualizations */}
            <Card>
              <CardHeader>
                <CardTitle>Visualizations</CardTitle>
                <CardDescription>Select charts, tables, and metrics to include</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Charts</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {chartTypes.map(chart => (
                      <div key={chart.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={chart.value}
                          checked={reportConfig.visualizations.charts.includes(chart.value)}
                          onCheckedChange={(checked) => {
                            const newCharts = checked
                              ? [...reportConfig.visualizations.charts, chart.value]
                              : reportConfig.visualizations.charts.filter(c => c !== chart.value);
                            handleVisualizationChange('charts', newCharts);
                          }}
                        />
                        <Label htmlFor={chart.value} className="text-sm">{chart.label}</Label>
                        <Badge variant="outline" className="text-xs">{chart.type}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Data Tables</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {tableTypes.map(table => (
                      <div key={table.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={table.value}
                          checked={reportConfig.visualizations.tables.includes(table.value)}
                          onCheckedChange={(checked) => {
                            const newTables = checked
                              ? [...reportConfig.visualizations.tables, table.value]
                              : reportConfig.visualizations.tables.filter(t => t !== table.value);
                            handleVisualizationChange('tables', newTables);
                          }}
                        />
                        <Label htmlFor={table.value} className="text-sm">{table.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Key Metrics</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {metricTypes.map(metric => (
                      <div key={metric.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={metric.value}
                          checked={reportConfig.visualizations.metrics.includes(metric.value)}
                          onCheckedChange={(checked) => {
                            const newMetrics = checked
                              ? [...reportConfig.visualizations.metrics, metric.value]
                              : reportConfig.visualizations.metrics.filter(m => m !== metric.value);
                            handleVisualizationChange('metrics', newMetrics);
                          }}
                        />
                        <Label htmlFor={metric.value} className="text-sm">{metric.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saved Templates */}
          {savedReports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Saved Templates</CardTitle>
                <CardDescription>Load previously saved report configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedReports.map(template => (
                    <div key={template.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadReportTemplate(template)}>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="flex items-center mt-2">
                        <Badge variant="outline" className="text-xs">{template.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={generatePreview} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Preview'}
              <Eye className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {previewData && (
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
                <CardDescription>Preview of your custom report</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                      <p className="text-sm font-medium">Report Type</p>
                      <p className="text-xs text-gray-600">{previewData.config.type}</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Calendar className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-sm font-medium">Date Range</p>
                      <p className="text-xs text-gray-600">
                        {new Date(previewData.config.dateRange.from).toLocaleDateString()} -
                        {new Date(previewData.config.dateRange.to).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <BarChart3 className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                      <p className="text-sm font-medium">Visualizations</p>
                      <p className="text-xs text-gray-600">
                        {previewData.config.visualizations.charts.length +
                          previewData.config.visualizations.tables.length} items
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <Download className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                      <p className="text-sm font-medium">Est. Size</p>
                      <p className="text-xs text-gray-600">{previewData.estimatedSize}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Report Contents:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {previewData.config.visualizations.charts.map((chart: string) => (
                        <li key={chart}>• {chartTypes.find(c => c.value === chart)?.label}</li>
                      ))}
                      {previewData.config.visualizations.tables.map((table: string) => (
                        <li key={table}>• {tableTypes.find(t => t.value === table)?.label}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveStep('config')}>Back to Config</Button>
            <Button onClick={generateReport} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Report'}
              <Download className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Choose how to export and share your report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Export Formats</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['pdf', 'excel', 'csv', 'json'].map(format => (
                      <div key={format} className="flex items-center space-x-2">
                        <Checkbox
                          id={format}
                          checked={reportConfig.exportFormats.includes(format)}
                          onCheckedChange={(checked) => {
                            const newFormats = checked
                              ? [...reportConfig.exportFormats, format]
                              : reportConfig.exportFormats.filter(f => f !== format);
                            handleConfigChange('exportFormats', newFormats);
                          }}
                        />
                        <Label htmlFor={format} className="text-sm uppercase">{format}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Sharing Options</Label>
                  <div className="space-y-2 mt-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => downloadReport('pdf')}
                      disabled={isGenerating}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => downloadReport('csv')}
                      disabled={isGenerating}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download CSV
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Share className="h-4 w-4 mr-2" />
                      Share Link
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomReportBuilder;