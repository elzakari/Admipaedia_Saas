import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { X, Printer, Download, Phone, Mail, MapPin, CalendarDays, User, Heart, BookOpen, Clock } from "lucide-react";
import { useReactToPrint } from "react-to-print";

interface StudentData {
  studentId: string;
  dob: string;
  email: string;
  id: string;
  name: string;
  photo?: string;
  age: number;
  gender: string;
  class: string;
  admissionNumber: string;
  dateOfBirth: string;
  bloodGroup: string;
  emergencyContact: string;
  address: string;
  medicalConditions: string[]; // Changed from string to string[]
}

interface AcademicData {
  overallGrade: string;
  currentGrade: string;
  classTeacher: string;
  overallGPA: number;
  rank: string;
  attendance: number;
  classRank?: number; // Made optional since not in data
  totalStudents?: number; // Made optional since not in data
  subjects: Array<{
    progress: any;
    name: string;
    grade: string;
    score: number;
    teacher: string;
  }>;
  recentExams: Array<{
    name: string;
    date: string;
    score: number;
    maxScore: number;
  }>;
  upcomingExams: Array<{
    name: string;
    date: string;
    time: string;
    venue: string;
  }>;
}

interface AttendanceData {
  percentage: number;
  daysPresent: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendancePercentage: number;
  monthlyAttendance: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
  }>;
  recentAbsences: Array<{
    date: string;
    reason: string;
    status: string;
  }>;
}

interface FeeData {
  tuitionFee: number;
  transportFee: number;
  libraryFee: number;
  computerLabFee: number;
  activityFee: number;
  totalFee: number;
  paid: number;
  due: number;
  dueDate: string;
  paymentHistory: Array<{
    id: string;
    date: string;
    amount: number;
    method: string;
    status: string;
  }>;
  upcomingPayments: Array<{
    id: string;
    dueDate: string;
    amount: number;
    description: string;
  }>;
}

interface StudentFullProfileProps {
  currentChild: StudentData;
  currentAcademicData: AcademicData;
  currentAttendanceData: AttendanceData;
  currentFeeData: FeeData;
  isOpen: boolean;
  onClose: () => void;
}

const StudentFullProfile = ({ 
  currentChild, 
  currentAcademicData, 
  currentAttendanceData, 
  currentFeeData, 
  isOpen,
  onClose 
}: StudentFullProfileProps) => {
  const profileRef = useRef<HTMLDivElement>(null);

  // Replace the useReactToPrint call (around line 75) with:
  const handlePrint = useReactToPrint({
    contentRef: profileRef,
    documentTitle: `${currentChild.name} - Full Profile`,
  });

  const handleDownload = () => {
    // In a real implementation, this would generate a PDF file
    // For now, we'll just trigger the print function which allows saving as PDF
    handlePrint();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <Card className="glass-card overflow-hidden border border-indigo-100 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-indigo-900">Student Full Profile</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <div ref={profileRef} className="p-4">
          <div className="flex flex-col md:flex-row items-start gap-6 mb-6">
            {/* Student Photo and Basic Info */}
            <div className="md:w-1/3 flex flex-col items-center text-center">
              <Avatar className="h-32 w-32 mb-4">
                <AvatarImage src={currentChild.photo} alt={currentChild.name} />
                <AvatarFallback>{currentChild.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-indigo-900">{currentChild.name}</h2>
              <p className="text-indigo-700">Class {currentChild.class}</p>
              <div className="flex items-center mt-2 justify-center">
                <Badge variant="outline" className="mr-2">
                  ID: {currentChild.studentId || currentChild.admissionNumber}
                </Badge>
                <Badge variant="success">Active</Badge>
              </div>
            </div>

            {/* Contact and Personal Information */}
            <div className="md:w-2/3">
              <h3 className="text-lg font-medium text-indigo-900 mb-3">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-indigo-700" />
                  <span className="text-sm"><span className="font-medium">Age:</span> {currentChild.age} years</span>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-indigo-700" />
                  <span className="text-sm"><span className="font-medium">Date of Birth:</span> {currentChild.dob || "01/15/2010"}</span>
                </div>
                <div className="flex items-center">
                  <Heart className="h-4 w-4 mr-2 text-indigo-700" />
                  <span className="text-sm"><span className="font-medium">Blood Group:</span> {currentChild.bloodGroup}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-indigo-700" />
                  <span className="text-sm"><span className="font-medium">Emergency Contact:</span> {currentChild.emergencyContact}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-indigo-700" />
                  <span className="text-sm"><span className="font-medium">Email:</span> {currentChild.email || `${currentChild.name.toLowerCase().replace(/ /g, ".")}@student.admipaedia.edu`}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-indigo-700" />
                  <span className="text-sm"><span className="font-medium">Address:</span> {currentChild.address || "123 Education Lane, Learning City"}</span>
                </div>
              </div>

              {/* Medical Information */}
              {currentChild.medicalConditions && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-indigo-900 mb-2">Medical Information</h3>
                  <div className="bg-white bg-opacity-50 p-3 rounded-md">
                    <p className="text-sm text-indigo-800">{currentChild.medicalConditions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Academic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-indigo-900 mb-3">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white bg-opacity-50 p-4 rounded-md">
                <div className="flex items-center mb-2">
                  <BookOpen className="h-5 w-5 mr-2 text-indigo-700" />
                  <h4 className="font-medium text-indigo-900">Current Grade</h4>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{currentAcademicData.overallGrade || "A-"}</p>
                <p className="text-sm text-indigo-700">GPA: {currentAcademicData.overallGPA}</p>
              </div>
              <div className="bg-white bg-opacity-50 p-4 rounded-md">
                <div className="flex items-center mb-2">
                  <User className="h-5 w-5 mr-2 text-indigo-700" />
                  <h4 className="font-medium text-indigo-900">Class Rank</h4>
                </div>
                <p className="text-2xl font-bold text-indigo-900">
                  {currentAcademicData.rank || 
                   (currentAcademicData.classRank && currentAcademicData.totalStudents 
                    ? `${currentAcademicData.classRank} of ${currentAcademicData.totalStudents}` 
                    : "N/A")}
                </p>
                <p className="text-sm text-indigo-700">
                  {currentAcademicData.classRank && currentAcademicData.totalStudents 
                   ? `Top ${Math.round((currentAcademicData.classRank / currentAcademicData.totalStudents) * 100)}%`
                   : "Rank not available"}
                </p>
              </div>
              <div className="bg-white bg-opacity-50 p-4 rounded-md">
                <div className="flex items-center mb-2">
                  <Clock className="h-5 w-5 mr-2 text-indigo-700" />
                  <h4 className="font-medium text-indigo-900">Attendance</h4>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{currentAttendanceData.percentage || currentAttendanceData.attendancePercentage}%</p>
                <p className="text-sm text-indigo-700">{currentAttendanceData.daysPresent || "85"} days present</p>
              </div>
            </div>

            {/* Subjects */}
            <div className="bg-white bg-opacity-50 p-4 rounded-md">
              <h4 className="font-medium text-indigo-900 mb-3">Current Subjects</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-indigo-100">
                      <th className="text-left py-2 px-3 font-medium text-indigo-900">Subject</th>
                      <th className="text-left py-2 px-3 font-medium text-indigo-900">Teacher</th>
                      <th className="text-left py-2 px-3 font-medium text-indigo-900">Grade</th>
                      <th className="text-left py-2 px-3 font-medium text-indigo-900">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAcademicData.subjects.map((subject, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white bg-opacity-30" : ""}>
                        <td className="py-2 px-3">{subject.name}</td>
                        <td className="py-2 px-3">{subject.teacher}</td>
                        <td className="py-2 px-3 font-medium">{subject.grade}</td>
                        <td className="py-2 px-3">
                          <div className="w-full bg-indigo-100 rounded-full h-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full" 
                              style={{ width: `${subject.progress}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </CardContent>
        <CardFooter className="flex justify-center space-x-4 pt-4 border-t border-indigo-100">
        <Button 
          variant="outline" 
          className="flex items-center glass-button-outline"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Profile
        </Button>
        <Button 
          className="flex items-center glass-button"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </CardFooter>
      </Card>
    </div>
  );
};

export default StudentFullProfile;
