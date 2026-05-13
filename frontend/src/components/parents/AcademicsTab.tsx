import { Book, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import { Separator } from "../../components/ui/separator";

interface AcademicsTabProps {
  currentAcademicData: any;
}

const AcademicsTab = ({ currentAcademicData }: AcademicsTabProps) => {
  // Combine recent and upcoming exams or use just one of them
  const exams = [...(currentAcademicData.recentExams || []), ...(currentAcademicData.upcomingExams || [])];
  
  return (
    <>
      {/* Academic overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Academic Performance</CardTitle>
            <CardDescription>Current Term Subject Scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAcademicData.subjects.map((subject: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Book className="h-4 w-4 mr-2 text-indigo-700" />
                      <span className="text-sm font-medium text-indigo-900">{subject.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{subject.grade}</Badge>
                      <span className="text-sm font-bold text-indigo-900">{subject.score}%</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Progress value={subject.score} className="flex-grow mr-4" />
                    <span className="text-xs text-indigo-700">Class Avg: {subject.classAverage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Overall Performance</CardTitle>
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
                    className="text-indigo-600 stroke-current"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    strokeDasharray={`${currentAcademicData.overallPercentage * 2.51} 251.2`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-indigo-900">{currentAcademicData.overallPercentage}%</span>
                  <span className="text-sm text-indigo-700">Grade {currentAcademicData.overallGrade}</span>
                </div>
              </div>
              
              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Class Rank:</span>
                  <span className="text-sm font-medium text-indigo-900">{currentAcademicData.classRank} of {currentAcademicData.totalStudents}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">Percentile:</span>
                  <span className="text-sm font-medium text-indigo-900">
                    {Math.round(((currentAcademicData.totalStudents - currentAcademicData.classRank) / currentAcademicData.totalStudents) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exams and assessments */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Exams & Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exams.map((exam: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white bg-opacity-20">
                <div className="flex items-center">
                  <div className={`p-2 rounded-full ${
                    exam.score ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                  }`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-indigo-900">{exam.name}</p>
                    <p className="text-xs text-indigo-700">{exam.date}</p>
                  </div>
                </div>
                <Badge variant={exam.score ? "success" : "outline"}>
                  {exam.score ? `${exam.score}/${exam.maxScore}` : "Upcoming"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AcademicsTab;