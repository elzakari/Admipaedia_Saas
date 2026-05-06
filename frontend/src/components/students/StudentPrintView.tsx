import React from 'react';
import { StudentProfile, AttendanceRecord, GradeRecord } from '../../types/student';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

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
        <h1 className="text-2xl font-bold mb-2">ADMIPAEDIA SCHOOL SYSTEM</h1>
        <h2 className="text-xl font-semibold mb-4">Student Profile Report</h2>
        <div className="border-b-2 border-gray-300 pb-2">
          <p><strong>Student:</strong> {student.display_name}</p>
          <p><strong>Admission Number:</strong> {student.admission_number}</p>
          <p><strong>Generated:</strong> {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="print-content">
        {/* Personal Information */}
        <section className="mb-6">
          <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Full Name:</strong> {student.full_name}</p>
              <p><strong>Date of Birth:</strong> 
                {student.date_of_birth ? 
                  new Date(student.date_of_birth).toLocaleDateString() : 
                  'No date provided'}
              </p>
              <p><strong>Gender:</strong> {student.gender}</p>
              <p><strong>Email:</strong> {student.email}</p>
            </div>
            <div>
              <p><strong>Phone:</strong> {student.phone}</p>
              {student.address && <p><strong>Address:</strong> {student.address}</p>}
              {student.blood_group && <p><strong>Blood Group:</strong> {student.blood_group}</p>}
              <p><strong>Status:</strong> {student.status}</p>
            </div>
          </div>
        </section>

        {/* Academic Information */}
        <section className="mb-6">
          <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Academic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Admission Number:</strong> {student.admission_number}</p>
              <p><strong>Class:</strong> {student.class_name || 'Not Assigned'}</p>
              <p><strong>Enrollment Date:</strong> {new Date(student.enrollment_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p><strong>Attendance Rate:</strong> {student.attendance_percentage}%</p>
              <p><strong>Performance Average:</strong> {student.performance_average}%</p>
            </div>
          </div>
        </section>

        {/* Parent Information */}
        {student.parent_name && (
          <section className="mb-6">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Parent/Guardian Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p><strong>Name:</strong> {student.parent_name}</p>
                {student.parent_email && <p><strong>Email:</strong> {student.parent_email}</p>}
              </div>
              <div>
                {student.parent_phone && <p><strong>Phone:</strong> {student.parent_phone}</p>}
              </div>
            </div>
          </section>
        )}

        {/* Recent Attendance */}
        {attendanceRecords.length > 0 && (
          <section className="mb-6">
            <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Recent Attendance</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Date</th>
                  <th className="border border-gray-300 p-2 text-left">Subject</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
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
            <h3 className="text-lg font-bold border-b border-gray-300 pb-1 mb-3">Recent Grades</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Subject</th>
                  <th className="border border-gray-300 p-2 text-left">Exam Type</th>
                  <th className="border border-gray-300 p-2 text-left">Marks</th>
                  <th className="border border-gray-300 p-2 text-left">Grade</th>
                  <th className="border border-gray-300 p-2 text-left">Date</th>
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
          <p>This report was generated automatically by ADMIPAEDIA School Management System</p>
          <p>For any queries, please contact the school administration</p>
        </div>
      </div>
    </div>
  );
};

export default StudentPrintView;