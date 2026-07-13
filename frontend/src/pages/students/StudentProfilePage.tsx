import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Phone, Calendar, MapPin, GraduationCap, 
  BookOpen, Clock, Award, FileText, Printer, Share2, 
  Edit, ArrowLeft, Download, BarChart3, Users, 
  CheckCircle, AlertCircle, XCircle, Link2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Progress } from '../../components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { studentService } from '../../services/studentService';
import StudentPrintView from '../../components/students/StudentPrintView';
import { Label } from '../../components/ui/label';
import { ADMIN_PRIMARY_BUTTON_CLASS, ADMIN_SECONDARY_BUTTON_CLASS } from '../../lib/adminUi';
import { resolveStudentAvatar } from '../../utils/avatar';
import { useTranslation } from 'react-i18next';

interface StudentProfile {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  display_name: string;
  full_name: string;
  email: string;
  phone: string;
  admission_number: string;
  date_of_birth: string;
  gender: string;
  address?: string;
  class_id?: string;
  class_name?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  enrollment_date: string;
  status: string;
  attendance_percentage: number;
  performance_average: number;
  profile_picture?: string;
  place_of_birth?: string;
  religious_denomination?: string;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
}

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent' | 'late';
  subject: string;
}

interface GradeRecord {
  subject: string;
  exam_type: string;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade: string;
  date: string;
}

const StudentProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [gradeRecords, setGradeRecords] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  const handleGenerateSetupLink = async () => {
    if (!student) return;
    try {
      setGeneratingLink(true);
      const res: any = await studentService.generateActivationLink(parseInt(student.id));
      if (res && res.success && res.url) {
        await navigator.clipboard.writeText(res.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        alert(res?.message || t('students_page.failed_activation', 'Failed to generate activation link'));
      }
    } catch (err) {
      console.error(err);
      alert(t('students_page.error_activation', 'Error generating activation link'));
    } finally {
      setGeneratingLink(false);
    }
  };

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!id) return;
      const studentId = Number(id);

      if (!Number.isInteger(studentId) || studentId <= 0) {
        setError(t('students_page.invalid_student', 'Invalid student record'));
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Fetch student details
        const studentResp: any = await studentService.getStudentById(studentId);
        const studentData: any = studentResp?.data || {};
        
        // Transform Student to StudentProfile by adding missing fields
        const studentProfile: StudentProfile = {
          ...studentData,
          id: String(studentData.id),
          email: studentData.email || 'No email provided',
          phone: studentData.phone || (studentData as any).telephone || 'No phone provided',
          class_id: studentData.class_id?.toString(),
          date_of_birth: studentData.date_of_birth || '2000-01-01',
          enrollment_date: studentData.enrollment_date || studentData.created_at || new Date().toISOString(),
          attendance_percentage: studentData.attendance_percentage || 0,
          performance_average: studentData.performance_average || 0,
          class_name: studentData.class_name || `Class ${studentData.class_id || 'Unknown'}`,
          parent_name: (studentData.parent_name as any) || studentData.father_name || studentData.mother_name || 'No parent name provided',
          parent_email: (studentData.parent_email as any) || studentData.father_email || studentData.mother_email || 'No parent email provided',
          parent_phone: (studentData.parent_phone as any) || studentData.father_contact || studentData.mother_contact || 'No parent phone provided',
          status: studentData.status || 'Active',
          emergency_contact_name: (studentData as any).emergency_contact_name || '',
          emergency_contact_phone: (studentData as any).emergency_contact_phone || '',
          emergency_contact_relationship: (studentData as any).emergency_contact_relationship || ''
        };
        
        setStudent(studentProfile);
        
        // Fetch attendance records (mock data for now)
        const mockAttendance: AttendanceRecord[] = [
          { date: '2024-01-15', status: 'present', subject: 'Mathematics' },
          { date: '2024-01-15', status: 'present', subject: 'English' },
          { date: '2024-01-16', status: 'late', subject: 'Science' },
          { date: '2024-01-17', status: 'absent', subject: 'History' },
        ];
        setAttendanceRecords(mockAttendance);
        
        // Fetch grade records (mock data for now)
        const mockGrades: GradeRecord[] = [
          { subject: 'Mathematics', exam_type: 'Mid-term', marks_obtained: 85, total_marks: 100, percentage: 85, grade: 'A', date: '2024-01-10' },
          { subject: 'English', exam_type: 'Quiz', marks_obtained: 78, total_marks: 100, percentage: 78, grade: 'B+', date: '2024-01-12' },
          { subject: 'Science', exam_type: 'Assignment', marks_obtained: 92, total_marks: 100, percentage: 92, grade: 'A+', date: '2024-01-14' },
        ];
        setGradeRecords(mockGrades);
        
      } catch (err) {
        setError(t('students_page.failed_fetch', 'Failed to fetch student data'));
        console.error('Error fetching student:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [id, t]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create a comprehensive student report
    const reportData = {
      student,
      attendanceRecords,
      gradeRecords,
      generatedAt: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-report-${student?.admission_number}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-red-500 mb-2">{t('common.error', 'Error')}</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => navigate('/students')} variant="outline" className={ADMIN_SECONDARY_BUTTON_CLASS}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back_to_students', 'Back to Students')}
        </Button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <XCircle className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-600 mb-2">{t('students_page.no_students_found', 'Student Not Found')}</h2>
        <p className="text-gray-500 mb-4">{t('students_page.no_students_found_desc', 'The requested student could not be found.')}</p>
        <Button onClick={() => navigate('/students')} variant="outline" className={ADMIN_SECONDARY_BUTTON_CLASS}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back_to_students', 'Back to Students')}
        </Button>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800'; // Default style if status is undefined
    
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl print:max-w-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 print:mb-4">
        <div className="flex items-center mb-4 sm:mb-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/students')}
            className={`mr-3 print:hidden ${ADMIN_SECONDARY_BUTTON_CLASS}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.display_name}</h1>
            <p className="text-gray-600">{t('common.admission_number', 'Student ID')}: {student.admission_number}</p>
          </div>
        </div>
        
        <div className="flex space-x-2 print:hidden">
          {student.status?.toLowerCase() === 'pending_activation' && (
            <Button 
              variant="default" 
              onClick={handleGenerateSetupLink}
              disabled={generatingLink}
              className={ADMIN_PRIMARY_BUTTON_CLASS}
            >
              <Link2 className="h-4 w-4 mr-2" />
              {copied ? t('common.link_copied', 'Link Copied!') : generatingLink ? t('common.generating', 'Generating...') : t('common.generate_setup_link', 'Generate Setup Link')}
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint} className={ADMIN_SECONDARY_BUTTON_CLASS}>
            <Printer className="h-4 w-4 mr-2" />
            {t('common.print', 'Print')}
          </Button>
          <Button variant="outline" onClick={handleExport} className={ADMIN_SECONDARY_BUTTON_CLASS}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export', 'Export')}
          </Button>
          <Button variant="outline" onClick={() => navigate(`/students/${student.id}/edit`)} className={ADMIN_SECONDARY_BUTTON_CLASS}>
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit', 'Edit')}
          </Button>
        </div>
      </div>

      {/* Student Overview Card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={resolveStudentAvatar(student)} alt={student.display_name} />
              <AvatarFallback className="text-2xl">
                {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('common.personal_information', 'Personal Info')}</h3>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center"><User className="h-4 w-4 mr-2 text-gray-400" />{student.full_name}</p>
                  <p className="flex items-center"><Mail className="h-4 w-4 mr-2 text-gray-400" />{student.email}</p>
                  <p className="flex items-center"><Phone className="h-4 w-4 mr-2 text-gray-400" />{student.phone}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('academics_page.management_title', 'Academic Info')}</h3>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center"><GraduationCap className="h-4 w-4 mr-2 text-gray-400" />{student.class_name || t('common.not_assigned', 'Not Assigned')}</p>
                  <p className="flex items-center"><Calendar className="h-4 w-4 mr-2 text-gray-400" />{t('students_page.profile.enrollment_date', 'Enrolled')}: {new Date(student.enrollment_date).toLocaleDateString()}</p>
                  <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('common.performance', 'Performance')}</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t('navigation.attendance', 'Attendance')}</span>
                      <span>{student.attendance_percentage}%</span>
                    </div>
                    <Progress value={student.attendance_percentage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t('common.performance', 'Performance')}</span>
                      <span>{student.performance_average}%</span>
                    </div>
                    <Progress value={student.performance_average} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="min-w-[120px]">{t('common.overview', 'Overview')}</TabsTrigger>
          <TabsTrigger value="personal" className="min-w-[120px]">{t('common.profile', 'Personal')}</TabsTrigger>
          <TabsTrigger value="academic" className="min-w-[120px]">{t('academics_page.title', 'Academic')}</TabsTrigger>
          <TabsTrigger value="attendance" className="min-w-[140px]">{t('navigation.attendance', 'Attendance')}</TabsTrigger>
          <TabsTrigger value="grades" className="min-w-[120px]">{t('navigation.grades', 'Grades')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  {t('common.performance_summary', 'Performance Summary')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>{t('students_page.profile.overall_performance', 'Overall Performance')}</span>
                    <Badge variant={student.performance_average >= 80 ? 'default' : student.performance_average >= 60 ? 'secondary' : 'destructive'}>
                      {student.performance_average}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('students_page.profile.attendance_rate', 'Attendance Rate')}</span>
                    <Badge variant={student.attendance_percentage >= 90 ? 'default' : student.attendance_percentage >= 75 ? 'secondary' : 'destructive'}>
                      {student.attendance_percentage}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{t('common.total_subjects', 'Total Subjects')}</span>
                    <span className="font-medium">{gradeRecords.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  {t('students_page.profile.parent_info', 'Parent/Guardian Info')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.parent_name && (
                    <p><span className="font-medium">{t('students_page.profile.parent_name', 'Name')}:</span> {student.parent_name}</p>
                  )}
                  {student.parent_email && (
                    <p className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {student.parent_email}
                    </p>
                  )}
                  {student.parent_phone && (
                    <p className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {student.parent_phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <EmergencyContactSection student={student} />
          </div>
        </TabsContent>

        <TabsContent value="personal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.personal_information', 'Personal Information')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-gray-700">{t('teachers_page.profile.name', 'Full Name')}</label>
                    <p className="text-gray-900">{student.full_name}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">{t('common.date_of_birth', 'Date of Birth')}</label>
                    <p className="text-gray-900">
                      {student.date_of_birth ? 
                        new Date(student.date_of_birth).toLocaleDateString() : 
                        t('common.no_date_provided', 'No date provided')}
                    </p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">{t('common.gender', 'Gender')}</label>
                    <p className="text-gray-900">{student.gender}</p>
                  </div>
                  {student.place_of_birth && (
                    <div>
                      <label className="font-medium text-gray-700">{t('common.place_of_birth', 'Place of Birth')}</label>
                      <p className="text-gray-900">{student.place_of_birth}</p>
                    </div>
                  )}
                  {student.religious_denomination && (
                    <div>
                      <label className="font-medium text-gray-700">{t('common.religion', 'Religion')}</label>
                      <p className="text-gray-900">{student.religious_denomination}</p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-gray-700">{t('teachers_page.profile.email', 'Email')}</label>
                    <p className="text-gray-900">{student.email}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">{t('teachers_page.profile.phone', 'Phone')}</label>
                    <p className="text-gray-900">{student.phone}</p>
                  </div>
                  {student.address && (
                    <div>
                      <label className="font-medium text-gray-700">{t('common.address', 'Address')}</label>
                      <p className="text-gray-900">{student.address}</p>
                    </div>
                  )}
                  {student.blood_group && (
                    <div>
                      <label className="font-medium text-gray-700">{t('common.blood_group', 'Blood Group')}</label>
                      <p className="text-gray-900">{student.blood_group}</p>
                    </div>
                  )}
                  {student.allergies && (
                    <div>
                      <label className="font-medium text-gray-700">{t('common.allergies', 'Allergies')}</label>
                      <p className="text-gray-900">{student.allergies}</p>
                    </div>
                  )}
                  {student.medical_conditions && (
                    <div>
                      <label className="font-medium text-gray-700">{t('common.medical_conditions', 'Medical Conditions')}</label>
                      <p className="text-gray-900">{student.medical_conditions}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('academics_page.management_title', 'Academic Information')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-gray-700">{t('common.admission_number', 'Admission Number')}</label>
                    <p className="text-gray-900">{student.admission_number}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">{t('common.class', 'Class')}</label>
                    <p className="text-gray-900">{student.class_name || t('common.not_assigned', 'Not Assigned')}</p>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">{t('students_page.profile.enrollment_date', 'Enrollment Date')}</label>
                    <p className="text-gray-900">{new Date(student.enrollment_date).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="font-medium text-gray-700">{t('teachers_page.profile.status', 'Status')}</label>
                    <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">{t('students_page.profile.overall_performance', 'Overall Performance')}</label>
                    <div className="flex items-center space-x-2">
                      <Progress value={student.performance_average} className="flex-1" />
                      <span className="font-medium">{student.performance_average}%</span>
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">{t('students_page.profile.attendance_rate', 'Attendance Rate')}</label>
                    <div className="flex items-center space-x-2">
                      <Progress value={student.attendance_percentage} className="flex-1" />
                      <span className="font-medium">{student.attendance_percentage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                {t('common.attendance_records', 'Attendance Records')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">{t('common.date', 'Date')}</th>
                      <th className="text-left p-2 font-medium">{t('common.subject', 'Subject')}</th>
                      <th className="text-left p-2 font-medium">{t('teachers_page.profile.status', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="p-2">{record.subject}</td>
                        <td className="p-2">
                          <Badge className={getAttendanceStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                {t('common.grade_records', 'Grade Records')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">{t('common.subject', 'Subject')}</th>
                      <th className="text-left p-2 font-medium">{t('common.exam_type', 'Exam Type')}</th>
                      <th className="text-left p-2 font-medium">{t('common.marks', 'Marks')}</th>
                      <th className="text-left p-2 font-medium">{t('common.percentage', 'Percentage')}</th>
                      <th className="text-left p-2 font-medium">{t('common.grade', 'Grade')}</th>
                      <th className="text-left p-2 font-medium">{t('common.date', 'Date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeRecords.map((record, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{record.subject}</td>
                        <td className="p-2">{record.exam_type}</td>
                        <td className="p-2">{record.marks_obtained}/{record.total_marks}</td>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <Progress value={record.percentage} className="w-16" />
                            <span>{record.percentage}%</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant={record.percentage >= 80 ? 'default' : record.percentage >= 60 ? 'secondary' : 'destructive'}>
                            {record.grade}
                          </Badge>
                        </td>
                        <td className="p-2">{new Date(record.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print-only comprehensive view */}
      <div className="hidden print:block print:space-y-6">
        <div className="text-center border-b pb-4 mb-6">
          <h1 className="text-2xl font-bold">{t('students_page.profile_report', 'Student Profile Report')}</h1>
          <p className="text-gray-600">{t('common.generated_on', 'Generated on')} {new Date().toLocaleDateString()}</p>
        </div>
        
        {/* All sections for print */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">{t('common.personal_information', 'Personal Information')}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>{t('teachers_page.profile.name', 'Name')}:</strong> {student.full_name}</div>
              <div><strong>{t('common.admission_number', 'Admission Number')}:</strong> {student.admission_number}</div>
              <div><strong>{t('teachers_page.profile.email', 'Email')}:</strong> {student.email}</div>
              <div><strong>{t('teachers_page.profile.phone', 'Phone')}:</strong> {student.phone}</div>
              <div><strong>{t('common.date_of_birth', 'Date of Birth')}:</strong> {new Date(student.date_of_birth).toLocaleDateString()}</div>
              <div><strong>{t('common.gender', 'Gender')}:</strong> {student.gender}</div>
              {student.address && <div><strong>{t('common.address', 'Address')}:</strong> {student.address}</div>}
              <div><strong>{t('teachers_page.profile.status', 'Status')}:</strong> {student.status}</div>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-bold mb-4">{t('academics_page.management_title', 'Academic Information')}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>{t('common.class', 'Class')}:</strong> {student.class_name || t('common.not_assigned', 'Not Assigned')}</div>
              <div><strong>{t('students_page.profile.enrollment_date', 'Enrollment Date')}:</strong> {new Date(student.enrollment_date).toLocaleDateString()}</div>
              <div><strong>{t('navigation.attendance', 'Attendance')}:</strong> {student.attendance_percentage}%</div>
              <div><strong>{t('common.performance', 'Performance')}:</strong> {student.performance_average}%</div>
            </div>
          </div>
          
          {student.parent_name && (
            <div>
              <h2 className="text-xl font-bold mb-4">{t('students_page.profile.parent_info', 'Parent/Guardian Information')}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>{t('students_page.profile.parent_name', 'Name')}:</strong> {student.parent_name}</div>
                {student.parent_email && <div><strong>{t('auth.email', 'Email')}:</strong> {student.parent_email}</div>}
                {student.parent_phone && <div><strong>{t('students_page.profile.parent_phone', 'Phone')}:</strong> {student.parent_phone}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* StudentPrintView component for printing */}
      {student && (
        <StudentPrintView 
          student={student} 
          attendanceRecords={attendanceRecords} 
          gradeRecords={gradeRecords} 
        />
      )}
    </div>
  );
};

export default StudentProfilePage;

// Add new sections to the profile page
const EmergencyContactSection = ({ student }: { student: StudentProfile }) => {
  const { t } = useTranslation();
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{t('common.emergency_contact', 'Emergency Contact')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{t('students_page.profile.parent_name', 'Name')}</Label>
            <div className="font-medium">{student?.emergency_contact_name || t('common.not_provided', 'Not provided')}</div>
          </div>
          <div>
            <Label>{t('students_page.profile.parent_phone', 'Phone')}</Label>
            <div className="font-medium">{student?.emergency_contact_phone || t('common.not_provided', 'Not provided')}</div>
          </div>
          <div>
            <Label>{t('common.relationship', 'Relationship')}</Label>
            <div className="font-medium">{student?.emergency_contact_relationship || t('common.not_provided', 'Not provided')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
