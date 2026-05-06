import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { FileText, Download, Printer, Mail, Calendar } from "lucide-react";
import { Progress } from "../../components/ui/progress";

interface StudentReportProps {
  currentChild: any;
  currentAcademicData: any;
  currentAttendanceData: any;
  currentBehaviorData: any;
}

const StudentReport = ({
  currentChild,
  currentAcademicData,
  currentAttendanceData,
  currentBehaviorData,
}: StudentReportProps) => {
  const [reportType, setReportType] = useState("academic");
  const [reportPeriod, setReportPeriod] = useState("term1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
    }, 2000);
  };

  const renderReportContent = () => {
    if (isGenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-full max-w-md">
            <p className="text-center text-indigo-700 mb-4">Generating report...</p>
            <Progress value={65} className="h-2" />
          </div>
        </div>
      );
    }

    if (!reportGenerated) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <FileText className="h-16 w-16 text-indigo-300 mb-4" />
          <p className="text-indigo-700 text-center">Select report type and period, then click Generate Report</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white bg-opacity-50 p-6 rounded-lg border border-indigo-100">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-indigo-900">{reportType === "academic" ? "Academic Report" : reportType === "attendance" ? "Attendance Report" : "Behavior Report"}</h3>
              <p className="text-sm text-indigo-700">{reportPeriod === "term1" ? "Term 1" : reportPeriod === "term2" ? "Term 2" : "Annual"} - {new Date().getFullYear()}</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="flex items-center glass-button-outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" className="flex items-center glass-button-outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" className="flex items-center glass-button-outline">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>

          {reportType === "academic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-700">Overall GPA</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentAcademicData.overallGPA}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-700">Class Rank</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentAcademicData.rank}</p>
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-indigo-100">
                    <th className="p-2 text-left text-indigo-900">Subject</th>
                    <th className="p-2 text-left text-indigo-900">Grade</th>
                    <th className="p-2 text-left text-indigo-900">Score</th>
                    <th className="p-2 text-left text-indigo-900">Teacher</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAcademicData.subjects.map((subject: any, index: number) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-white bg-opacity-50" : "bg-indigo-50 bg-opacity-50"}>
                      <td className="p-2 text-indigo-900">{subject.name}</td>
                      <td className="p-2 text-indigo-900">{subject.grade}</td>
                      <td className="p-2 text-indigo-900">{subject.score}%</td>
                      <td className="p-2 text-indigo-900">{subject.teacher}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-4 bg-white bg-opacity-70 rounded-md border border-indigo-100">
                <h4 className="font-medium text-indigo-900 mb-2">Teacher's Comments</h4>
                <p className="text-indigo-700">
                  {currentChild.name} has shown {currentAcademicData.overallGPA >= 3.5 ? "excellent" : "good"} academic performance this term. 
                  {currentAcademicData.overallGPA >= 3.5 
                    ? " Consistently demonstrates strong understanding of concepts across all subjects." 
                    : " Shows potential for improvement with more focused study habits."}
                </p>
              </div>
            </div>
          )}

          {reportType === "attendance" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-700">Present</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentAttendanceData.present} days</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-700">Absent</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentAttendanceData.absent} days</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-700">Late</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentAttendanceData.late} days</p>
                </div>
              </div>

              <div className="p-4 bg-white bg-opacity-70 rounded-md border border-indigo-100">
                <h4 className="font-medium text-indigo-900 mb-2">Attendance Summary</h4>
                <div className="flex items-center mb-2">
                  <div className="w-full mr-4">
                    <Progress value={currentAttendanceData.attendancePercentage} className="h-2" />
                  </div>
                  <span className="font-medium text-indigo-900">{currentAttendanceData.attendancePercentage}%</span>
                </div>
                <p className="text-indigo-700">
                  {currentChild.name} has maintained {currentAttendanceData.attendancePercentage >= 95 ? "excellent" : "good"} attendance this term.
                </p>
              </div>

              {currentAttendanceData.recentAbsences.length > 0 && (
                <div>
                  <h4 className="font-medium text-indigo-900 mb-2">Absence Details</h4>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-indigo-100">
                        <th className="p-2 text-left text-indigo-900">Date</th>
                        <th className="p-2 text-left text-indigo-900">Reason</th>
                        <th className="p-2 text-left text-indigo-900">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAttendanceData.recentAbsences.map((absence: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white bg-opacity-50" : "bg-indigo-50 bg-opacity-50"}>
                          <td className="p-2 text-indigo-900">{absence.date}</td>
                          <td className="p-2 text-indigo-900">{absence.reason}</td>
                          <td className="p-2 text-indigo-900">
                            <span className={`px-2 py-1 rounded-full text-xs ${absence.status === "Excused" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                              {absence.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {reportType === "behavior" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-700">Overall Behavior</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentBehaviorData.overallBehavior}</p>
                </div>
                <div className="p-4 bg-indigo-50 rounded-md">
                  <p className="text-sm font-medium text-indigo-700">Merit Points</p>
                  <p className="text-2xl font-bold text-indigo-900">{currentBehaviorData.merits}</p>
                </div>
              </div>

              {currentBehaviorData.teacherComments.length > 0 && (
                <div>
                  <h4 className="font-medium text-indigo-900 mb-2">Teacher Comments</h4>
                  {currentBehaviorData.teacherComments.map((comment: any, index: number) => (
                    <div key={index} className="p-3 bg-white bg-opacity-70 rounded-md border border-indigo-100 mb-2">
                      <div className="flex justify-between mb-1">
                        <p className="text-sm font-medium text-indigo-900">{comment.teacher}</p>
                        <p className="text-xs text-indigo-700">{comment.date}</p>
                      </div>
                      <p className="text-indigo-700">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {currentBehaviorData.recentIncidents.length > 0 && (
                <div>
                  <h4 className="font-medium text-indigo-900 mb-2">Incidents</h4>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-indigo-100">
                        <th className="p-2 text-left text-indigo-900">Date</th>
                        <th className="p-2 text-left text-indigo-900">Description</th>
                        <th className="p-2 text-left text-indigo-900">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBehaviorData.recentIncidents.map((incident: any, index: number) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white bg-opacity-50" : "bg-indigo-50 bg-opacity-50"}>
                          <td className="p-2 text-indigo-900">{incident.date}</td>
                          <td className="p-2 text-indigo-900">{incident.description}</td>
                          <td className="p-2 text-indigo-900">{incident.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card overflow-hidden border border-indigo-100">
      <CardHeader>
        <CardTitle className="text-indigo-900">Student Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium text-indigo-700">Report Type</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="glass-button-outline">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="academic">Academic Report</SelectItem>
                <SelectItem value="attendance">Attendance Report</SelectItem>
                <SelectItem value="behavior">Behavior Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium text-indigo-700">Period</label>
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger className="glass-button-outline">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="term1">Term 1</SelectItem>
                <SelectItem value="term2">Term 2</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            className="glass-button" 
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </div>

        {renderReportContent()}
      </CardContent>
    </Card>
  );
};

export default StudentReport;