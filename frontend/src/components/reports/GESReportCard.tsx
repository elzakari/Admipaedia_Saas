import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Download, Printer, Mail, FileText } from 'lucide-react';
import { enhancedReportsService, GESReportCard as GESReportCardType } from '../../services/enhancedReportsService';
import { toast } from 'react-hot-toast';

interface GESReportCardProps {
  studentId: number;
  studentName: string;
}

const GESReportCard: React.FC<GESReportCardProps> = ({ studentId, studentName }) => {
  const [reportData, setReportData] = useState<GESReportCardType | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState('2024/2025');
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableYears();
  }, []);

  useEffect(() => {
    if (selectedTerm && selectedYear) {
      generateReportCard();
    }
  }, [selectedTerm, selectedYear, studentId]);

  const loadAvailableYears = async () => {
    try {
      const years = await enhancedReportsService.getAvailableAcademicYears();
      setAvailableYears(years);
    } catch (error) {
      console.error('Error loading academic years:', error);
    }
  };

  const generateReportCard = async () => {
    setLoading(true);
    try {
      const data = await enhancedReportsService.generateReportCard(
        studentId,
        selectedTerm,
        selectedYear
      );
      setReportData(data);
    } catch (error) {
      console.error('Error generating report card:', error);
      toast.error('Failed to generate report card');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await enhancedReportsService.downloadReportCardPDF(
        studentId,
        selectedTerm,
        selectedYear
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${studentName}_Report_Card_${selectedTerm}_${selectedYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Report card downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download report card');
    }
  };

  const handlePrint = async () => {
    try {
      await enhancedReportsService.printReportCard(studentId, selectedTerm, selectedYear);
      toast.success('Report card sent to printer');
    } catch (error) {
      console.error('Error printing report card:', error);
      toast.error('Failed to print report card');
    }
  };

  const getGradeColor = (grade: string) => {
    const gradeColors: { [key: string]: string } = {
      'A1': 'text-green-600 bg-green-50',
      'A2': 'text-green-600 bg-green-50',
      'B3': 'text-blue-600 bg-blue-50',
      'B4': 'text-blue-600 bg-blue-50',
      'C5': 'text-yellow-600 bg-yellow-50',
      'C6': 'text-yellow-600 bg-yellow-50',
      'D7': 'text-orange-600 bg-orange-50',
      'E8': 'text-red-600 bg-red-50',
      'F9': 'text-red-600 bg-red-50'
    };
    return gradeColors[grade] || 'text-gray-600 bg-gray-50';
  };

  const getCompetencyColor = (level: number) => {
    if (level >= 3.5) return 'text-green-600 bg-green-50';
    if (level >= 2.5) return 'text-blue-600 bg-blue-50';
    if (level >= 1.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Generating report card...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Ghana Education Service Report Card</span>
            <div className="flex space-x-2">
              <Button onClick={handleDownloadPDF} size="sm" className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm" className="flex items-center">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {enhancedReportsService.getAvailableTerms().map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <div className="space-y-6">
          {/* Student Information */}
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-center text-blue-900">
                REPUBLIC OF GHANA - MINISTRY OF EDUCATION
              </CardTitle>
              <p className="text-center text-blue-700 font-medium">
                GHANA EDUCATION SERVICE - ACADEMIC REPORT CARD
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Student Name:</strong> {reportData.student_info.name}</p>
                  <p><strong>Admission Number:</strong> {reportData.student_info.admission_number}</p>
                  <p><strong>Class:</strong> {reportData.student_info.class}</p>
                </div>
                <div>
                  <p><strong>Educational Level:</strong> {reportData.student_info.educational_level}</p>
                  <p><strong>Academic Year:</strong> {reportData.student_info.academic_year}</p>
                  <p><strong>Term:</strong> {reportData.student_info.term}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Academic Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Academic Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-2 text-left">Subject</th>
                      <th className="border border-gray-300 p-2 text-center">Score</th>
                      <th className="border border-gray-300 p-2 text-center">Grade</th>
                      <th className="border border-gray-300 p-2 text-center">Grade Point</th>
                      <th className="border border-gray-300 p-2 text-left">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.academic_performance.subjects.map((subject, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 p-2">{subject.name}</td>
                        <td className="border border-gray-300 p-2 text-center">{subject.score}%</td>
                        <td className={`border border-gray-300 p-2 text-center font-semibold ${getGradeColor(subject.grade)}`}>
                          {subject.grade}
                        </td>
                        <td className="border border-gray-300 p-2 text-center">{subject.grade_point}</td>
                        <td className="border border-gray-300 p-2">{subject.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm font-medium text-blue-700">Overall GPA</p>
                  <p className="text-2xl font-bold text-blue-900">{reportData.academic_performance.overall_gpa}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm font-medium text-green-700">Class Position</p>
                  <p className="text-2xl font-bold text-green-900">{reportData.academic_performance.class_position}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <p className="text-sm font-medium text-purple-700">Total Subjects</p>
                  <p className="text-2xl font-bold text-purple-900">{reportData.academic_performance.total_subjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600">Total Days</p>
                  <p className="text-xl font-bold">{reportData.attendance.total_days}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-green-600">Present</p>
                  <p className="text-xl font-bold text-green-700">{reportData.attendance.present_days}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-red-600">Absent</p>
                  <p className="text-xl font-bold text-red-700">{reportData.attendance.absent_days}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-yellow-600">Late</p>
                  <p className="text-xl font-bold text-yellow-700">{reportData.attendance.late_days}</p>
                </div>
              </div>
              <div className="mt-4 bg-blue-50 p-3 rounded text-center">
                <p className="text-sm font-medium text-blue-700">Attendance Rate</p>
                <p className="text-2xl font-bold text-blue-900">{reportData.attendance.attendance_rate}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Core Competencies */}
          <Card>
            <CardHeader>
              <CardTitle>Core Competencies Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportData.core_competencies.map((competency, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{competency.name}</p>
                      <p className="text-sm text-gray-600">{competency.description}</p>
                    </div>
                    <div className={`px-3 py-1 rounded font-semibold ${getCompetencyColor(competency.level)}`}>
                      {competency.level}/4.0
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Comments and Progression */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Teacher's Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{reportData.teacher_comments}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Principal's Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{reportData.principal_comments}</p>
              </CardContent>
            </Card>
          </div>

          {/* Progression Status */}
          <Card>
            <CardHeader>
              <CardTitle>Progression Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Academic Threshold</p>
                  <p className={`font-semibold ${
                    reportData.progression_status.meets_academic_threshold 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {reportData.progression_status.meets_academic_threshold ? 'Met' : 'Not Met'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Attendance Threshold</p>
                  <p className={`font-semibold ${
                    reportData.progression_status.meets_attendance_threshold 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {reportData.progression_status.meets_attendance_threshold ? 'Met' : 'Not Met'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Promotion Status</p>
                  <p className={`font-semibold ${
                    reportData.progression_status.promotion_status === 'Promoted' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {reportData.progression_status.promotion_status}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Next Level</p>
                  <p className="font-semibold text-blue-600">{reportData.progression_status.next_level}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grading Scheme */}
          <Card>
            <CardHeader>
              <CardTitle>Grading Scheme</CardTitle>
            </CardHeader>
            <CardContent>
              <p><strong>Scheme:</strong> {reportData.grading_scheme.name}</p>
              <p><strong>Standard:</strong> {reportData.grading_scheme.scale}</p>
              <div className="mt-3 text-xs text-gray-600">
                <p>A1-A2: Excellent | B3-B4: Good | C5-C6: Average | D7: Pass | E8-F9: Fail</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GESReportCard;