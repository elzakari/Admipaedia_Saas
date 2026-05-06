import { Award, ThumbsUp, AlertTriangle, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

interface BehaviorReport {
  title: string;
  date: string;
  teacher: string;
  description: string;
}

interface Incident {
  date: string;
  description: string;
  action: string;
  teacher: string;
}

interface TeacherComment {
  date: string;
  teacher: string;
  comment: string;
}

interface BehaviorTabProps {
  currentBehaviorData: {
    overallBehavior: string;
    disciplinaryActions: number;
    merits: number;
    recentIncidents: Incident[];
    teacherComments: TeacherComment[];
  };
}

const BehaviorTab = ({ currentBehaviorData }: BehaviorTabProps) => {
  // Create positive reports from teacher comments
  const positiveReports = currentBehaviorData.teacherComments.map((comment) => ({
    title: "Teacher Feedback",
    date: comment.date,
    teacher: comment.teacher,
    description: comment.comment
  }));

  // Use recentIncidents for improvement areas
  const improvementAreas = currentBehaviorData.recentIncidents;

  // Create awards based on merits
  const awards = Array(currentBehaviorData.merits).fill(null).map((_, index) => ({
    title: `Merit Award ${index + 1}`,
    date: "2023-10-" + (index + 1).toString().padStart(2, '0'),
    description: "Recognition for excellent behavior and academic performance"
  }));

  return (
    <>
      {/* Behavior overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Positive reports */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Positive Reports</CardTitle>
            <CardDescription>Recognition for good behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positiveReports.map((report, index) => (
                <div key={index} className="p-3 rounded-lg bg-white bg-opacity-20">
                  <div className="flex items-start">
                    <div className="p-2 rounded-full bg-green-100 text-green-600 mr-3">
                      <ThumbsUp className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-900">{report.title}</p>
                        <Badge variant="outline" className="text-xs">{report.date}</Badge>
                      </div>
                      <p className="text-xs text-indigo-700 mt-1">By {report.teacher}</p>
                      <p className="text-xs text-indigo-700 mt-2">{report.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              {positiveReports.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-indigo-900">No positive reports yet</p>
                  <p className="text-xs text-indigo-700 mt-1">Teacher comments will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Areas for improvement */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Areas for Improvement</CardTitle>
            <CardDescription>Suggestions for better behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {improvementAreas.length > 0 ? (
                improvementAreas.map((area, index) => (
                  <div key={index} className="p-3 rounded-lg bg-white bg-opacity-20">
                    <div className="flex items-start">
                      <div className="p-2 rounded-full bg-amber-100 text-amber-600 mr-3">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-900">{area.description}</p>
                          <Badge variant="outline" className="text-xs">{area.date}</Badge>
                        </div>
                        <p className="text-xs text-indigo-700 mt-1">By {area.teacher}</p>
                        <p className="text-xs text-indigo-700 mt-2">Action taken: {area.action}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <ThumbsUp className="h-12 w-12 text-green-500 mb-3" />
                  <p className="text-sm font-medium text-indigo-900">No improvement areas noted</p>
                  <p className="text-xs text-indigo-700 mt-1">Your child is doing great in all behavioral aspects!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Awards and recognition */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Awards & Recognition</CardTitle>
          <CardDescription>Achievements and accolades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {awards.map((award, index) => (
              <div key={index} className="p-4 rounded-lg bg-white bg-opacity-20 border border-amber-200">
                <div className="flex items-center justify-center mb-3">
                  <div className="p-3 rounded-full bg-amber-100">
                    <Award className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-indigo-900">{award.title}</p>
                  <p className="text-xs text-indigo-700 mt-1">{award.date}</p>
                  <p className="text-xs text-indigo-700 mt-2">{award.description}</p>
                </div>
              </div>
            ))}
            {awards.length === 0 && (
              <div className="col-span-2 flex flex-col items-center justify-center p-8 text-center">
                <Award className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-indigo-900">No awards yet</p>
                <p className="text-xs text-indigo-700 mt-1">Awards and recognitions will appear here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default BehaviorTab;