import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";

interface AttendanceTabProps {
  currentAttendanceData: any;
}

const AttendanceTab = ({ currentAttendanceData }: AttendanceTabProps) => {
  // Calculate total days
  const totalDays = currentAttendanceData.present + currentAttendanceData.absent + currentAttendanceData.late;
  
  const monthlyAttendance = Array.isArray(currentAttendanceData.monthlyAttendance)
    ? currentAttendanceData.monthlyAttendance
    : [];
  const recentRecords = Array.isArray(currentAttendanceData.recentAbsences)
    ? currentAttendanceData.recentAbsences.map((absence: any) => ({
        date: absence.date,
        time: "--:--",
        status: absence.status === "Excused" ? "Excused" : "Absent",
        reason: absence.reason
      }))
    : [];
  
  return (
    <>
      {/* Attendance overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Attendance History</CardTitle>
            <CardDescription>Recent attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRecords.length > 0 ? (
              <div className="space-y-4">
                {recentRecords.map((record: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white bg-opacity-20">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-full ${
                        record.status === "Excused"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-red-100 text-red-600"
                      }`}>
                        {record.status === "Excused" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-indigo-900">{record.date}</p>
                        <p className="text-xs text-indigo-700">{record.time}</p>
                        {record.reason && (
                          <p className="text-xs text-indigo-700">Reason: {record.reason}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={record.status === "Excused" ? "secondary" : "destructive"}>
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-indigo-200 bg-white/60 px-4 py-6 text-sm text-indigo-700">
                No recent attendance exceptions are available.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle
                    className="text-indigo-100 stroke-current"
                    strokeWidth="10"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-green-500 stroke-current"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    strokeDasharray={`${currentAttendanceData.attendancePercentage * 2.51} 251.2`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-indigo-900">{currentAttendanceData.attendancePercentage}%</span>
                  <span className="text-sm text-indigo-700">Present</span>
                </div>
              </div>
              
              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Present:</span>
                  <span className="text-sm font-medium text-green-600">{currentAttendanceData.present} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Late:</span>
                  <span className="text-sm font-medium text-amber-600">{currentAttendanceData.late} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Absent:</span>
                  <span className="text-sm font-medium text-red-600">{currentAttendanceData.absent} days</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Total School Days:</span>
                  <span className="text-sm font-medium text-indigo-900">{totalDays} days</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly attendance trend */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Attendance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyAttendance.length > 0 ? (
            <div className="h-[200px] flex items-end justify-between">
              {monthlyAttendance.map((month: any, index: number) => {
              // Calculate percentage for each month
              const total = month.present + month.absent + month.late;
              const percentage = total > 0 ? Math.round((month.present / total) * 100) : 0;
              
              return (
                <div key={index} className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-indigo-500 rounded-t-md" 
                    style={{ height: `${percentage * 1.5}px` }}
                  ></div>
                  <p className="text-xs font-medium text-indigo-900 mt-2">{month.month}</p>
                  <p className="text-xs text-indigo-700">{percentage}%</p>
                </div>
              );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-indigo-200 bg-white/60 px-4 py-6 text-sm text-indigo-700">
              No monthly attendance breakdown is available yet.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default AttendanceTab;
