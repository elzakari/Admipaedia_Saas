import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { FileText, Download, Printer, RefreshCw, X, CalendarDays, ClipboardList } from "lucide-react";
import enhancedReportsService, { type GESReportCard } from "../../services/enhancedReportsService";
import attendanceService from "../../services/attendanceService";
import { useToast } from "../ui/use-toast";
import { cn } from "../../lib/utils";
import { parentPortalIconButtonClass, parentPortalPrimaryButtonClass, parentPortalSecondaryButtonClass } from "../../lib/parentPortalUi";
import { resolveAvatarUrl } from "../../utils/avatar";

interface StudentReportProps {
  currentChild: any;
  currentAcademicData: any;
  currentAttendanceData: any;
  currentBehaviorData?: any;
  onClose: () => void;
  className?: string;
}

type ReportMode = "report_card" | "attendance";

const FALLBACK_YEARS = ["2025/2026", "2024/2025", "2023/2024"];

const StudentReport = ({
  currentChild,
  currentAcademicData,
  currentAttendanceData,
  onClose,
  className,
}: StudentReportProps) => {
  const { toast } = useToast();
  const studentId = Number(currentChild?.id || currentChild?.studentId || 0);
  const [reportMode, setReportMode] = useState<ReportMode>("report_card");
  const [term, setTerm] = useState("Term 1");
  const [academicYear, setAcademicYear] = useState(FALLBACK_YEARS[0]);
  const [availableYears, setAvailableYears] = useState<string[]>(FALLBACK_YEARS);
  const [loadingYears, setLoadingYears] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportCard, setReportCard] = useState<GESReportCard | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;

    const loadYears = async () => {
      setLoadingYears(true);
      try {
        const years = await enhancedReportsService.getAvailableAcademicYears();
        if (!active || !Array.isArray(years) || years.length === 0) return;
        setAvailableYears(years);
        setAcademicYear((current) => current || years[0]);
      } finally {
        if (active) {
          setLoadingYears(false);
        }
      }
    };

    void loadYears();
    return () => {
      active = false;
    };
  }, []);

  const handleGenerateReport = async () => {
    if (!Number.isFinite(studentId) || studentId <= 0) {
      setError("Student context is missing.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (reportMode === "report_card") {
        const response = await enhancedReportsService.generateReportCard(studentId, term, academicYear, "json");
        setReportCard(response);
        setAttendanceSummary(null);
      } else {
        const response = await attendanceService.getStudentAttendanceSummary(studentId);
        setAttendanceSummary(response);
        setReportCard(null);
      }
    } catch (err: any) {
      console.error("Failed to generate parent report:", err);
      setError(err?.message || "Unable to generate report right now.");
      setReportCard(null);
      setAttendanceSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  const attendanceView = useMemo(() => {
    const summary = attendanceSummary?.summary || {};
    return {
      percentage: attendanceSummary?.attendance_percentage ?? currentAttendanceData?.attendancePercentage ?? currentAttendanceData?.percentage ?? 0,
      present: summary.present ?? currentAttendanceData?.present ?? 0,
      absent: summary.absent ?? currentAttendanceData?.absent ?? 0,
      late: summary.late ?? currentAttendanceData?.late ?? 0,
      excused: summary.excused ?? currentAttendanceData?.excused ?? 0,
      monthly: Array.isArray(attendanceSummary?.monthly) ? attendanceSummary.monthly : currentAttendanceData?.monthlyAttendance ?? [],
    };
  }, [attendanceSummary, currentAttendanceData]);

  const handleDownloadPdf = async () => {
    try {
      const blob = await enhancedReportsService.downloadReportCardPDF(studentId, term, academicYear);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(currentChild?.name || "student").replace(/\s+/g, "_")}_report_card.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Unable to download the report card.",
        variant: "destructive",
        id: "",
      });
    }
  };

  const handlePrint = async () => {
    try {
      await enhancedReportsService.printReportCard(studentId, term, academicYear);
    } catch (err: any) {
      toast({
        title: "Print failed",
        description: err?.message || "Unable to print the report card.",
        variant: "destructive",
        id: "",
      });
    }
  };

  return (
    <Card className={cn("glass-card overflow-hidden border border-indigo-100", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-indigo-100/70">
        <div className="space-y-2">
          <CardTitle className="text-indigo-950">Student Reports</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-700">
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">
              <CalendarDays className="mr-1 h-3.5 w-3.5" />
              {currentChild?.class || "Class unavailable"}
            </Badge>
            <Badge variant="outline" className="border-indigo-200 bg-white text-indigo-700">
              {currentChild?.name || "Student"}
            </Badge>
          </div>
          <p className="text-sm text-indigo-600">
            Generate the current child&apos;s live academic report card or attendance summary.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className={parentPortalIconButtonClass} onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Report Type</label>
            <Select value={reportMode} onValueChange={(value) => setReportMode(value as ReportMode)}>
              <SelectTrigger className="border-indigo-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="report_card">Report Card</SelectItem>
                <SelectItem value="attendance">Attendance Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Term</label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="border-indigo-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enhancedReportsService.getAvailableTerms().map((termOption) => (
                  <SelectItem key={termOption} value={termOption}>
                    {termOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-indigo-700">Academic Year</label>
            <Select value={academicYear} onValueChange={setAcademicYear} disabled={loadingYears}>
              <SelectTrigger className="border-indigo-200 bg-white">
                <SelectValue />
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

          <div className="flex items-end">
            <Button className={parentPortalPrimaryButtonClass} onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {reportCard ? (
          <div className="space-y-6 rounded-xl border border-indigo-100 bg-white/80 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-indigo-100">
                  <AvatarImage
                    src={resolveAvatarUrl(reportCard.student_info.profile_picture || currentChild?.photo || currentChild?.profile_picture)}
                    alt={reportCard.student_info.name}
                  />
                  <AvatarFallback>{reportCard.student_info.name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div>
                <h3 className="text-xl font-semibold text-indigo-950">Academic Report Card</h3>
                <p className="text-sm text-indigo-600">
                  {reportCard.student_info.term} • {reportCard.student_info.academic_year}
                </p>
                <p className="text-sm text-indigo-700">
                  {reportCard.student_info.name} • {reportCard.student_info.class}
                </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className={parentPortalSecondaryButtonClass} onClick={handleDownloadPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" className={parentPortalSecondaryButtonClass} onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Overall GPA</p>
                <p className="mt-2 text-2xl font-bold text-indigo-950">{reportCard.academic_performance.overall_gpa ?? currentAcademicData?.overallGPA ?? 0}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Class Position</p>
                <p className="mt-2 text-2xl font-bold text-indigo-950">{reportCard.academic_performance.class_position || currentAcademicData?.rank || "N/A"}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Attendance Rate</p>
                <p className="mt-2 text-2xl font-bold text-indigo-950">{reportCard.attendance.attendance_rate}%</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-indigo-100">
              <table className="min-w-full divide-y divide-indigo-100 text-sm">
                <thead className="bg-indigo-50 text-left text-indigo-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Grade</th>
                    <th className="px-4 py-3 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-50 bg-white">
                  {reportCard.academic_performance.subjects.map((subject) => (
                    <tr key={subject.name}>
                      <td className="px-4 py-3 font-medium text-indigo-950">{subject.name}</td>
                      <td className="px-4 py-3 text-indigo-700">{subject.score}</td>
                      <td className="px-4 py-3 text-indigo-700">{subject.grade}</td>
                      <td className="px-4 py-3 text-indigo-600">{subject.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-sm font-semibold text-indigo-800">Teacher Comments</p>
                <p className="mt-2 text-sm text-indigo-700">{reportCard.teacher_comments || "No teacher comments yet."}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-sm font-semibold text-indigo-800">Promotion Status</p>
                <p className="mt-2 text-sm text-indigo-700">{reportCard.progression_status.promotion_status}</p>
                <p className="mt-1 text-xs text-indigo-500">Next level: {reportCard.progression_status.next_level}</p>
              </div>
            </div>
          </div>
        ) : null}

        {attendanceSummary || reportMode === "attendance" ? (
          <div className="space-y-6 rounded-xl border border-indigo-100 bg-white/80 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-indigo-950">Attendance Summary</h3>
                <p className="text-sm text-indigo-600">
                  Monthly attendance overview for {currentChild?.name || "the selected student"}.
                </p>
              </div>
              <ClipboardList className="h-5 w-5 text-indigo-500" />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Attendance Rate</p>
                <p className="mt-2 text-2xl font-bold text-indigo-950">{attendanceView.percentage}%</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Present</p>
                <p className="mt-2 text-2xl font-bold text-indigo-950">{attendanceView.present}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Absent</p>
                <p className="mt-2 text-2xl font-bold text-indigo-950">{attendanceView.absent}</p>
              </div>
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-700">Late</p>
                <p className="mt-2 text-2xl font-bold text-indigo-950">{attendanceView.late}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-indigo-800">Overall Attendance Progress</p>
                <span className="text-sm font-semibold text-indigo-900">{attendanceView.percentage}%</span>
              </div>
              <Progress value={attendanceView.percentage} className="h-2" />
            </div>

            {attendanceView.monthly.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-indigo-100">
                <table className="min-w-full divide-y divide-indigo-100 text-sm">
                  <thead className="bg-indigo-50 text-left text-indigo-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Month</th>
                      <th className="px-4 py-3 font-semibold">Present</th>
                      <th className="px-4 py-3 font-semibold">Absent</th>
                      <th className="px-4 py-3 font-semibold">Late</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50 bg-white">
                    {attendanceView.monthly.map((row: any, index: number) => (
                      <tr key={`${row.month}-${index}`}>
                        <td className="px-4 py-3 font-medium text-indigo-950">{row.month}</td>
                        <td className="px-4 py-3 text-indigo-700">{row.present ?? 0}</td>
                        <td className="px-4 py-3 text-indigo-700">{row.absent ?? 0}</td>
                        <td className="px-4 py-3 text-indigo-700">{row.late ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-6 text-sm text-indigo-600">
                Generate the attendance summary to view detailed monthly data.
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default StudentReport;
