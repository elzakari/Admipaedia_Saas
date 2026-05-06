import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Download, 
  Users, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  DollarSign, 
  Calendar,
  Database
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { StudentImportExport } from '../../components/students/StudentImportExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import attendanceService from '@/services/attendanceService';

export const ExportPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('navigation.export', 'Data Export')}
        description={t('export.description', 'Export your school data in various formats (CSV, Excel, PDF)')}
        icon={<Download className="h-6 w-6 text-indigo-600" />}
      />

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="students">
            <GraduationCap className="h-4 w-4 mr-2" />
            Students
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <Users className="h-4 w-4 mr-2" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="academics">
            <BookOpen className="h-4 w-4 mr-2" />
            Academics
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Calendar className="h-4 w-4 mr-2" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="system">
            <Database className="h-4 w-4 mr-2" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Data Export</CardTitle>
              <CardDescription>Export student profiles, enrollment data, and contact information.</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentImportExport />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Data Export</CardTitle>
              <CardDescription>Export teacher profiles, specializations, and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">Teacher Export Tool</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                Download comprehensive teacher lists with qualification and specialization details.
              </p>
              <div className="flex gap-4">
                <Button variant="outline">Export as CSV</Button>
                <Button variant="outline">Export as Excel</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Data Export</CardTitle>
              <CardDescription>Export exam results, grades, and class performance data.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">Academic Export Tool</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                Export consolidated grade sheets and performance reports for specific classes or terms.
              </p>
              <Button onClick={() => window.location.href = '/reports'}>
                Go to Reports for Advanced Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Data Export</CardTitle>
              <CardDescription>Export fee collection records, invoices, and financial statements.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">Financial Export Tool</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                Generate CSV/Excel exports for fee payments and outstanding balances.
              </p>
              <Button variant="outline">Export Payment History</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Data Export</CardTitle>
              <CardDescription>Export daily attendance logs and monthly summaries.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">Attendance Export Tool</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                Download attendance records for specific classes or time periods.
              </p>
              <Button
                variant="outline"
                onClick={async () => {
                  const date_from = window.prompt('Start date (YYYY-MM-DD)', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0]) || '';
                  const date_to = window.prompt('End date (YYYY-MM-DD)', new Date().toISOString().split('T')[0]) || '';
                  if (!date_from || !date_to) return;

                  const blob = await attendanceService.generateAttendanceReport({
                    date_from,
                    date_to,
                    format: 'excel'
                  });

                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `attendance_${date_from}_to_${date_to}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                }}
              >
                Export Attendance Logs
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Data Export</CardTitle>
              <CardDescription>Export system logs, audit trails, and configuration backups.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium">System Backup & Export</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6">
                Generate full system backups or export audit logs for security reviews.
              </p>
              <Button variant="destructive">Generate System Backup</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExportPage;
