import React from 'react';
import { StudentProfile, AttendanceRecord, GradeRecord } from '../../types/student';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useTranslation } from 'react-i18next';

interface StudentPrintViewProps {
  student: StudentProfile;
  attendanceRecords?: any[];
  gradeRecords?: any[];
}

const StudentPrintView: React.FC<StudentPrintViewProps> = ({ 
  student, 
  attendanceRecords = [], 
  gradeRecords = [] 
}) => {
  const { t } = useTranslation();
  return (
    <div className="print-container" style={{ display: 'none' }}>
      <style>{`
        @media print {
          .print-container {
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          body {
            font-size: 12px;
            line-height: 1.4;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
      
      <div className="print-header text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('scores_dashboard.default_school_name', 'ADMIPAEDIA SCHOOL SYSTEM')}</h1>
        <h2 className="text-xl font-semibold mb-4">{t('students_page.profile_report', 'Student Profile Report')}</h2>
        <div className="border-b-2 border-gray-300 pb-2">
          <p><strong>{t('admin_reports.student', 'Student')}:</strong> {student.display_name}</p>
          <p><strong>{t('common.admission_number', 'Admission Number')}:</strong> {student.admission_number}</p>
          <p><strong>{t('common.generated_on', 'Generated')}:</strong> {new Date().toLocaleDateString()} {t('common.at', 'at')} {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="print-content">
        {/* Personal Information */}
        <section className="mb-6">
          <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">{t('common.personal_information', 'Personal Information')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>{t('teachers_page.profile.name', 'Full Name')}:</strong> {student.full_name}</p>
              <p><strong>{t('common.date_of_birth', 'Date of Birth')}:</strong> 
                {student.date_of_birth ? 
                  new Date(student.date_of_birth).toLocaleDateString() : 
                  t('common.no_date_provided', 'No date provided')}
              </p>
              <p><strong>{t('common.gender', 'Gender')}:</strong> {student.gender}</p>
              <p><strong>{t('teachers_page.profile.email', 'Email')}:</strong> {student.email}</p>
            </div>
            <div>
              <p><strong>{t('teachers_page.profile.phone', 'Phone')}:</strong> {student.phone}</p>
              {student.address && <p><strong>{t('common.address', 'Address')}:</strong> {student.address}</p>}
              {student.blood_group && <p><strong>{t('common.blood_group', 'Blood Group')}:</strong> {student.blood_group}</p>}
              <p><strong>{t('teachers_page.profile.status', 'Status')}:</strong> {student.status}</p>
            </div>
          </div>
        </section>

        {/* Academic Information */}
        <section className="mb-6">
          <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">{t('academics_page.management_title', 'Academic Information')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>{t('common.admission_number', 'Admission Number')}:</strong> {student.admission_number}</p>
              <p><strong>{t('common.class', 'Class')}:</strong> {student.class_name || t('common.not_assigned', 'Not Assigned')}</p>
              <p><strong>{t('students_page.profile.enrollment_date', 'Enrollment Date')}:</strong> {new Date(student.enrollment_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p><strong>{t('students_page.profile.attendance_rate', 'Attendance Rate')}:</strong> {student.attendance_percentage}%</p>
              <p><strong>{t('students_page.profile.overall_performance', 'Performance Average')}:</strong> {student.performance_average}%</p>
            </div>
          </div>
        </section>

        {/* Parent Information */}
        {student.parent_name && (
          <section className="mb-6">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">{t('students_page.profile.parent_info', 'Parent/Guardian Information')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>{t('students_page.profile.parent_name', 'Name')}:</strong> {student.parent_name}</p>
                {student.parent_email && <p><strong>{t('auth.email', 'Email')}:</strong> {student.parent_email}</p>}
              </div>
              <div>
                {student.parent_phone && <p><strong>{t('students_page.profile.parent_phone', 'Phone')}:</strong> {student.parent_phone}</p>}
              </div>
            </div>
          </section>
        )}

        {/* Recent Attendance */}
        {attendanceRecords.length > 0 && (
          <section className="mb-6">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">{t('common.recent_attendance', 'Recent Attendance')}</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">{t('common.date', 'Date')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('common.subject', 'Subject')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('teachers_page.profile.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.slice(0, 10).map((record, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="border border-gray-300 p-2">{record.subject}</td>
                    <td className="border border-gray-300 p-2">{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Recent Grades */}
        {gradeRecords.length > 0 && (
          <section className="mb-6">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">{t('common.recent_grades', 'Recent Grades')}</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">{t('common.subject', 'Subject')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('common.exam_type', 'Exam Type')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('common.marks', 'Marks')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('common.grade', 'Grade')}</th>
                  <th className="border border-gray-300 p-2 text-left">{t('common.date', 'Date')}</th>
                </tr>
              </thead>
              <tbody>
                {gradeRecords.slice(0, 10).map((record, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 p-2">{record.subject}</td>
                    <td className="border border-gray-300 p-2">{record.exam_type}</td>
                    <td className="border border-gray-300 p-2">{record.marks_obtained}/{record.total_marks}</td>
                    <td className="border border-gray-300 p-2">{record.grade}</td>
                    <td className="border border-gray-300 p-2">{new Date(record.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <div className="print-footer mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>{t('students_page.print_report_gen_auto', 'This report was generated automatically by ADMIPAEDIA School Management System')}</p>
          <p>{t('students_page.print_report_queries_contact', 'For any queries, please contact the school administration')}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentPrintView;