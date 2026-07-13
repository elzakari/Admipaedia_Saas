import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { User, GraduationCap, Calendar, Users, BarChart3, AlertTriangle } from 'lucide-react';
import StudentPerformanceAnalytics from '../../components/students/analytics/StudentPerformanceAnalytics';
import AttendanceHeatmap from '../../components/students/analytics/AttendanceHeatmap';
import StudentRiskAssessment from '../../components/students/analytics/StudentRiskAssessment';
import { useApiCall } from '../../hooks/useApiCall';
import studentService from '../../services/studentService';
import { getNormalizedGradeLevel } from '../../utils/formatters';
import type { Student } from '../../types/student.types';
import { resolveStudentAvatar } from '../../utils/avatar';
import { useTranslation } from 'react-i18next';

const StudentDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('profile');
  
  const { data: student, isLoading, error, execute: fetchStudent } = useApiCall(
    async () => {
      const res = await studentService.getStudentById(Number(id));
      return res.data;
    },
    { immediate: true }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'graduated': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">{t('common.loading', 'Loading student details...')}</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-500 mb-4">{t('students_page.loading_error_title', 'Failed to load student details')}</p>
        <Button onClick={fetchStudent}>{t('common.try_again', 'Retry')}</Button>
      </div>
    );
  }

  if (!student) {
    return <div className="text-center py-12">{t('students_page.no_students_found', 'Student not found')}</div>;
  }

  const displayName = student.full_name || student.name || student.display_name;

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            {resolveStudentAvatar(student) ? (
              <img src={resolveStudentAvatar(student)} alt={displayName} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-gray-500" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusColor(student.status)}>
                {student.status}
              </Badge>
              <span className="text-gray-600">{student.admission_number}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Link to="/students">
            <Button variant="outline">
              {t('common.back_to_students', 'Back to Students')}
            </Button>
          </Link>
          <Button variant="outline">
            {t('common.generate_report', 'Generate Report')}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <GraduationCap className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">{t('common.class', 'Class')}</p>
                <p className="font-semibold">{getNormalizedGradeLevel(student)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">{t('students_page.profile.enrollment_date', 'Enrolled')}</p>
                <p className="font-semibold">{new Date(student.enrollment_date).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">{t('common.gender', 'Gender')}</p>
                <p className="font-semibold">{student.gender}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm text-gray-600">{t('common.age', 'Age')}</p>
                <p className="font-semibold">
                  {new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()} {t('common.years', 'years')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="min-w-[120px]">{t('common.profile', 'Profile')}</TabsTrigger>
          <TabsTrigger value="academics" className="min-w-[140px]">{t('common.performance', 'Performance')}</TabsTrigger>
          <TabsTrigger value="attendance" className="min-w-[140px]">{t('navigation.attendance', 'Attendance')}</TabsTrigger>
          <TabsTrigger value="risk" className="min-w-[160px]">{t('common.risk_assessment', 'Risk Assessment')}</TabsTrigger>
          <TabsTrigger value="parents" className="min-w-[120px]">{t('students_page.linked_parents', 'Parents')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('students_page.profile.title', 'Student Profile')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">{t('common.personal_information', 'Personal Information')}</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="font-medium">{t('teachers_page.profile.name', 'Full Name')}:</span> {displayName}
                    </div>
                    <div>
                      <span className="font-medium">{t('teachers_page.profile.email', 'Email')}:</span> {student.email}
                    </div>
                    <div>
                      <span className="font-medium">{t('common.admission_number', 'Admission Number')}:</span> {student.admission_number}
                    </div>
                    <div>
                      <span className="font-medium">{t('common.class', 'Class')}:</span> {getNormalizedGradeLevel(student)}
                    </div>
                    <div>
                      <span className="font-medium">{t('common.gender', 'Gender')}:</span> {student.gender}
                    </div>
                    <div>
                      <span className="font-medium">{t('common.date_of_birth', 'Date of Birth')}:</span> {new Date(student.date_of_birth).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">{t('common.contact_information', 'Contact Information')}</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="font-medium">{t('common.address', 'Address')}:</span> {student.address}
                    </div>
                    <div>
                      <span className="font-medium">{t('teachers_page.profile.phone', 'Phone')}:</span> {student.phone}
                    </div>
                    <div>
                      <span className="font-medium">{t('students_page.profile.enrollment_date', 'Enrollment Date')}:</span> {new Date(student.enrollment_date).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">{t('teachers_page.profile.status', 'Status')}:</span> 
                      <Badge className={`ml-2 ${getStatusColor(student.status)}`}>
                        {student.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academics" className="mt-6">
          <StudentPerformanceAnalytics studentId={student.id} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceHeatmap studentId={student.id} />
        </TabsContent>

        <TabsContent value="risk" className="mt-6">
          <StudentRiskAssessment studentId={student.id} />
        </TabsContent>

        <TabsContent value="parents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('students_page.profile.parent_info', 'Parent/Guardian Information')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">{t('common.primary_contact', 'Primary Contact')}</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="font-medium">{t('students_page.profile.parent_name', 'Name')}:</span> {student.parent_name}
                    </div>
                    <div>
                      <span className="font-medium">{t('students_page.profile.parent_phone', 'Phone')}:</span> {student.parent_phone}
                    </div>
                    <div>
                      <span className="font-medium">{t('auth.email', 'Email')}:</span> {student.parent_email}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">{t('common.communication', 'Communication')}</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      {t('common.send_message', 'Send Message')}
                    </Button>
                    <Button variant="outline" className="w-full">
                      {t('common.schedule_meeting', 'Schedule Meeting')}
                    </Button>
                    <Button variant="outline" className="w-full">
                      {t('common.view_communication_history', 'View Communication History')}
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

export default StudentDetailPage;
