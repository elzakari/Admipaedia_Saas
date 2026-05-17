import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  FileText, Download, Filter, Printer, BarChart2, PieChart, 
  Calendar, Users, DollarSign, Settings, RefreshCw, Eye,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPieChart, Cell, Area, AreaChart, Pie
} from 'recharts';
import PageHeader from '../../components/common/PageHeader';
import { reportsService, ReportData, ReportFilter } from '../../services/reportsService';
import { useToast } from '../../hooks/useToast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('academic');
  const [selectedReport, setSelectedReport] = useState<NonNullable<ReportFilter['reportType']>>('grades');
  const [availableClasses, setAvailableClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Array<{ id: string; name: string }>>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [classes, subjects] = await Promise.all([
        reportsService.getAvailableClasses(),
        reportsService.getAvailableSubjects()
      ]);
      setAvailableClasses(classes);
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    switch (dateRange) {
      case 'current':
        return {
          from: `${currentYear}-01-01`,
          to: now.toISOString().split('T')[0],
          preset: 'current' as const
        };
      case 'previous':
        return {
          from: `${currentYear - 1}-01-01`,
          to: `${currentYear - 1}-12-31`,
          preset: 'previous' as const
        };
      case 'year':
        return {
          from: `${currentYear}-01-01`,
          to: `${currentYear}-12-31`,
          preset: 'year' as const
        };
      case 'custom':
        return {
          from: customDateFrom,
          to: customDateTo,
          preset: 'custom' as const
        };
      default:
        return {
          from: `${currentYear}-01-01`,
          to: now.toISOString().split('T')[0],
          preset: 'current' as const
        };
    }
  };

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const filters: ReportFilter = {
        reportType: selectedReport,
        dateRange: getDateRange(),
        classFilter: classFilter !== 'all' ? Number(classFilter) : undefined,
        subjectFilter: subjectFilter !== 'all' ? [Number(subjectFilter)] : undefined
      };

      let report: ReportData;
      
      switch (activeTab) {
        case 'academic':
          report = await reportsService.generateAcademicReport(filters);
          break;
        case 'attendance':
          report = await reportsService.generateAttendanceReport(filters);
          break;
        case 'financial':
          report = await reportsService.generateFinancialReport(filters);
          break;
        case 'administrative':
          report = await reportsService.generateAdministrativeReport(filters);
          break;
        default:
          throw new Error('Invalid report type');
      }
      
      setReportData(report);
      toast({
        title: 'Report Generated',
        description: 'Your report has been generated successfully.'
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!reportData) return;
    
    setIsExporting(true);
    try {
      const blob = await reportsService.exportReportData(reportData, format);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportData.title.replace(/\s+/g, '_')}_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Successful',
        description: `Report exported as ${format.toUpperCase()} successfully.`
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const printReport = async () => {
    if (!reportData) return;
    
    setIsExporting(true);
    try {
      const blob = await reportsService.exportReportData(reportData, 'pdf');
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          // We can't easily revoke the URL immediately because printing might still be happening
          // but most browsers handle this well.
        };
      }
    } catch (error) {
      console.error('Error printing report:', error);
      toast({
        title: 'Print Failed',
        description: 'Failed to prepare report for printing. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderAcademicReportVisualization = () => {
    if (!reportData?.data) return null;
    
    const { performance, subjects } = reportData.data as any;
    
    return (
      <div className="space-y-6">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Grade</p>
                  <p className="text-2xl font-bold">{performance?.average?.toFixed(1) || 'N/A'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold">{reportData.metadata?.totalRecords || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Subjects</p>
                  <p className="text-2xl font-bold">{subjects?.length || 0}</p>
                </div>
                <BarChart2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Grade Distribution Chart */}
        {performance?.distribution && Object.keys(performance.distribution).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={Object.entries(performance.distribution).map(([grade, count]) => ({
                        name: grade,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(performance.distribution).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Subject Performance */}
        {subjects && subjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjects}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#8884d8" name="Average Grade" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderAttendanceReportVisualization = () => {
    if (!reportData?.data) return null;
    
    const data = reportData.data as any;
    const overall = data.overall || {
      present: 0,
      absent: 0,
      late: 0,
      rate: 0
    };
    const trends = data.trends || [];
    const classComparison = data.classComparison || [];
    
    return (
      <div className="space-y-6">
        {/* Attendance Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{overall.present || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{overall.absent || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{overall.late || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Rate</p>
                <p className="text-2xl font-bold text-blue-600">{overall.rate?.toFixed(1) || '0.0'}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Attendance Trends */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="present" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Present" />
                    <Area type="monotone" dataKey="late" stackId="1" stroke="#ffc658" fill="#ffc658" name="Late" />
                    <Area type="monotone" dataKey="absent" stackId="1" stroke="#ff7c7c" fill="#ff7c7c" name="Absent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Class Comparison */}
        {classComparison && classComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Class Attendance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="className" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attendanceRate" fill="#8884d8" name="Attendance Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderFinancialReportVisualization = () => {
    if (!reportData?.data) return null;
    
    const data = reportData.data as any;
    // Map backend names to frontend expected names if necessary
    const feeCollection = data.feeCollection || {
      total: data.total_revenue || 0,
      collected: (data.total_revenue || 0) - (data.outstanding_fees || 0),
      pending: data.outstanding_fees || 0,
      overdue: 0
    };
    const trends = data.trends || data.monthly_breakdown || [];
    const classBreakdown = data.classBreakdown || [];
    
    return (
      <div className="space-y-6">
        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Fees</p>
                <p className="text-2xl font-bold">${feeCollection.total?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Collected</p>
                <p className="text-2xl font-bold text-green-600">${feeCollection.collected?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">${feeCollection.pending?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">${feeCollection.overdue?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Collection Trends */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fee Collection Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={trends[0]?.month ? "month" : "date"} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey={trends[0]?.collected ? "collected" : "revenue"} stroke="#82ca9d" name="Collected" />
                    <Line type="monotone" dataKey={trends[0]?.pending ? "pending" : "expenses"} stroke="#ffc658" name="Pending" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderReportVisualization = () => {
    if (!reportData) {
      return (
        <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {selectedReport === 'grades' || selectedReport === 'progress' ? (
                <BarChart2 className="h-16 w-16 text-indigo-500 opacity-50" />
              ) : (
                <PieChart className="h-16 w-16 text-indigo-500 opacity-50" />
              )}
            </div>
            <h3 className="text-lg font-medium mb-2">Select filters and generate a report</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Choose your report type, time period, and class filters, then click "Generate Report" to view the data.
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'academic':
        return renderAcademicReportVisualization();
      case 'attendance':
        return renderAttendanceReportVisualization();
      case 'financial':
        return renderFinancialReportVisualization();
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Report Generated Successfully</h3>
                <p className="text-gray-500">Your {reportData.title} has been generated.</p>
                <div className="mt-4">
                  <Badge variant="outline">
                    Generated: {new Date(reportData.generatedAt).toLocaleString()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{overall.late || 0}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Rate</p>
                <p className="text-2xl font-bold text-blue-600">{overall.rate?.toFixed(1) || '0.0'}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Attendance Trends */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="present" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Present" />
                    <Area type="monotone" dataKey="late" stackId="1" stroke="#ffc658" fill="#ffc658" name="Late" />
                    <Area type="monotone" dataKey="absent" stackId="1" stroke="#ff7c7c" fill="#ff7c7c" name="Absent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Class Comparison */}
        {classComparison && classComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Class Attendance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="className" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attendanceRate" fill="#8884d8" name="Attendance Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderFinancialReportVisualization = () => {
    if (!reportData?.data) return null;
    
    const data = reportData.data as any;
    // Map backend names to frontend expected names if necessary
    const feeCollection = data.feeCollection || {
      total: data.total_revenue || 0,
      collected: (data.total_revenue || 0) - (data.outstanding_fees || 0),
      pending: data.outstanding_fees || 0,
      overdue: 0
    };
    const trends = data.trends || data.monthly_breakdown || [];
    const classBreakdown = data.classBreakdown || [];
    
    return (
      <div className="space-y-6">
        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Total Fees</p>
                <p className="text-2xl font-bold">${feeCollection.total?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Collected</p>
                <p className="text-2xl font-bold text-green-600">${feeCollection.collected?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">${feeCollection.pending?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">${feeCollection.overdue?.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Collection Trends */}
        {trends && trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Fee Collection Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={trends[0]?.month ? "month" : "date"} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey={trends[0]?.collected ? "collected" : "revenue"} stroke="#82ca9d" name="Collected" />
                    <Line type="monotone" dataKey={trends[0]?.pending ? "pending" : "expenses"} stroke="#ffc658" name="Pending" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderReportVisualization = () => {
    if (!reportData) {
      return (
        <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-800 flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {selectedReport === 'grades' || selectedReport === 'progress' ? (
                <BarChart2 className="h-16 w-16 text-indigo-500 opacity-50" />
              ) : (
                <PieChart className="h-16 w-16 text-indigo-500 opacity-50" />
              )}
            </div>
            <h3 className="text-lg font-medium mb-2">Select filters and generate a report</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Choose your report type, time period, and class filters, then click "Generate Report" to view the data.
            </p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'academic':
        return renderAcademicReportVisualization();
      case 'attendance':
        return renderAttendanceReportVisualization();
      case 'financial':
        return renderFinancialReportVisualization();
      default:
        return (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Report Generated Successfully</h3>
                <p className="text-gray-500">Your {reportData.title} has been generated.</p>
                <div className="mt-4">
                  <Badge variant="outline">
                    Generated: {new Date(reportData.generatedAt).toLocaleString()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <PageHeader 
          title={t('admin_reports.title', 'Reports')} 
          description={t('admin_reports.description', 'Generate and view detailed reports')}
          icon={<FileText className="h-6 w-6 text-indigo-600" />}
        />
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={printReport}
            disabled={!reportData || isLoading}
          >
            <Printer className="mr-2 h-4 w-4" />
            {t('common.print', 'Print')}
          </Button>
          
          <Select onValueChange={(format) => exportReport(format as 'pdf' | 'excel' | 'csv')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder={t('common.export', 'Export')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">{t('common.export_pdf', 'Export PDF')}</SelectItem>
              <SelectItem value="excel">{t('common.export_excel', 'Export Excel')}</SelectItem>
              <SelectItem value="csv">{t('common.export_csv', 'Export CSV')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            className="flex items-center"
            onClick={generateReport}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {isLoading ? t('common.generating', 'Generating...') : t('admin_reports.generate_report', 'Generate Report')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="academic">{t('admin_reports.academic_reports', 'Academic Reports')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('admin_reports.attendance_reports', 'Attendance Reports')}</TabsTrigger>
          <TabsTrigger value="financial">{t('admin_reports.financial_reports', 'Financial Reports')}</TabsTrigger>
          <TabsTrigger value="administrative">{t('admin_reports.administrative_reports', 'Administrative Reports')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_reports.academic_perf_reports', 'Academic Performance Reports')}</CardTitle>
              <CardDescription>{t('admin_reports.academic_perf_desc', 'View and generate reports on student academic performance')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/5">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.report_type', 'Report Type')}</label>
                  <Select
                    value={selectedReport}
                    onValueChange={(value) =>
                      setSelectedReport(value as NonNullable<ReportFilter["reportType"]>)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_report_type', 'Select report type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grades">{t('admin_reports.grade_reports', 'Grade Reports')}</SelectItem>
                      <SelectItem value="progress">{t('admin_reports.progress_reports', 'Progress Reports')}</SelectItem>
                      <SelectItem value="transcripts">{t('admin_reports.transcripts', 'Transcripts')}</SelectItem>
                      <SelectItem value="class-performance">{t('admin_reports.class_performance', 'Class Performance')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/5">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.time_period', 'Time Period')}</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_time_period', 'Select time period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{t('admin_reports.current_term', 'Current Term')}</SelectItem>
                      <SelectItem value="previous">{t('admin_reports.previous_term', 'Previous Term')}</SelectItem>
                      <SelectItem value="year">{t('admin_reports.academic_year', 'Academic Year')}</SelectItem>
                      <SelectItem value="custom">{t('admin_reports.custom_range', 'Custom Range')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/5">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.class_grade', 'Class/Grade')}</label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_class', 'Select class')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin_reports.all_classes', 'All Classes')}</SelectItem>
                      {availableClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/5">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.subject', 'Subject')}</label>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_subject', 'Select subject')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin_reports.all_subjects', 'All Subjects')}</SelectItem>
                      {availableSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/5 flex items-end">
                  <Button className="w-full" onClick={generateReport} disabled={isLoading}>
                    <Filter className="mr-2 h-4 w-4" />
                    {t('admin_reports.apply_filters', 'Apply Filters')}
                  </Button>
                </div>
              </div>
              
              {dateRange === 'custom' && (
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.from_date', 'From Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateFrom} 
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.to_date', 'To Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateTo} 
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {renderReportVisualization()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_reports.attendance_reports', 'Attendance Reports')}</CardTitle>
              <CardDescription>{t('admin_reports.attendance_reports_desc', 'Track student attendance patterns and statistics')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/4">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.time_period', 'Time Period')}</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_time_period', 'Select time period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{t('admin_reports.current_term', 'Current Term')}</SelectItem>
                      <SelectItem value="previous">{t('admin_reports.previous_term', 'Previous Term')}</SelectItem>
                      <SelectItem value="year">{t('admin_reports.academic_year', 'Academic Year')}</SelectItem>
                      <SelectItem value="custom">{t('admin_reports.custom_range', 'Custom Range')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/4">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.class_grade', 'Class/Grade')}</label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_class', 'Select class')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin_reports.all_classes', 'All Classes')}</SelectItem>
                      {availableClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/4 flex items-end">
                  <Button className="w-full" onClick={generateReport} disabled={isLoading}>
                    <Filter className="mr-2 h-4 w-4" />
                    {t('admin_reports.generate_report', 'Generate Report')}
                  </Button>
                </div>
              </div>
              
              {dateRange === 'custom' && (
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.from_date', 'From Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateFrom} 
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.to_date', 'To Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateTo} 
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {renderReportVisualization()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_reports.financial_reports', 'Financial Reports')}</CardTitle>
              <CardDescription>{t('admin_reports.financial_reports_desc', 'View financial statements and fee collection reports')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.time_period', 'Time Period')}</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_time_period', 'Select time period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{t('admin_reports.current_term', 'Current Term')}</SelectItem>
                      <SelectItem value="previous">{t('admin_reports.previous_term', 'Previous Term')}</SelectItem>
                      <SelectItem value="year">{t('admin_reports.academic_year', 'Academic Year')}</SelectItem>
                      <SelectItem value="custom">{t('admin_reports.custom_range', 'Custom Range')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.class_grade', 'Class/Grade')}</label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_class', 'Select class')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin_reports.all_classes', 'All Classes')}</SelectItem>
                      {availableClasses.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/3 flex items-end">
                  <Button className="w-full" onClick={generateReport} disabled={isLoading}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    {t('admin_reports.generate_report', 'Generate Report')}
                  </Button>
                </div>
              </div>
              
              {dateRange === 'custom' && (
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.from_date', 'From Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateFrom} 
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.to_date', 'To Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateTo} 
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {renderReportVisualization()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="administrative" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_reports.administrative_reports', 'Administrative Reports')}</CardTitle>
              <CardDescription>{t('admin_reports.administrative_reports_desc', 'Access administrative and operational reports')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.report_type', 'Report Type')}</label>
                  <Select
                    value={selectedReport}
                    onValueChange={(value) =>
                      setSelectedReport(value as NonNullable<ReportFilter["reportType"]>)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_report_type', 'Select report type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">{t('admin_reports.staff_reports', 'Staff Reports')}</SelectItem>
                      <SelectItem value="enrollment">{t('admin_reports.enrollment_reports', 'Enrollment Reports')}</SelectItem>
                      <SelectItem value="facilities">{t('admin_reports.facilities_reports', 'Facilities Reports')}</SelectItem>
                      <SelectItem value="compliance">{t('admin_reports.compliance_reports', 'Compliance Reports')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium mb-1">{t('admin_reports.time_period', 'Time Period')}</label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_reports.select_time_period', 'Select time period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">{t('admin_reports.current_term', 'Current Term')}</SelectItem>
                      <SelectItem value="previous">{t('admin_reports.previous_term', 'Previous Term')}</SelectItem>
                      <SelectItem value="year">{t('admin_reports.academic_year', 'Academic Year')}</SelectItem>
                      <SelectItem value="custom">{t('admin_reports.custom_range', 'Custom Range')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full md:w-1/3 flex items-end">
                  <Button className="w-full" onClick={generateReport} disabled={isLoading}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('admin_reports.generate_report', 'Generate Report')}
                  </Button>
                </div>
              </div>
              
              {dateRange === 'custom' && (
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.from_date', 'From Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateFrom} 
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">{t('admin_reports.to_date', 'To Date')}</label>
                    <Input 
                      type="date" 
                      value={customDateTo} 
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {renderReportVisualization()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {isExporting && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('admin_reports.exporting_wait', 'Exporting report... Please wait.')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ReportsPage;
