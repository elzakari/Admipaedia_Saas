import React from "react";
import { useTeacherClasses } from "../../../hooks/useTeachers";
import { Card, CardContent } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { BookOpen, Users, Clock } from "lucide-react";

interface ClassesTabProps {
  teacherId: number;
}

export function ClassesTab({ teacherId }: ClassesTabProps) {
  const { data, isLoading, error } = useTeacherClasses(teacherId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="glass-card p-4">
        <p className="text-red-500">Failed to load classes data</p>
      </Card>
    );
  }

  if (!data?.classes?.length) {
    return (
      <Card className="glass-card p-8 text-center">
        <p className="text-indigo-700">No classes assigned to this teacher</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Assigned Classes</h3>
        <Badge variant="outline">{data.classes.length} Classes</Badge>
      </div>

      <Card className="glass-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Grade Level</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.className}</TableCell>
                  <TableCell>{cls.gradeLevel}</TableCell>
                  <TableCell>{cls.section}</TableCell>
                  <TableCell>{cls.academicYear}</TableCell>
                  <TableCell>
                    <Badge variant={cls.isClassTeacher ? "success" : "outline"}>
                      {cls.isClassTeacher ? "Class Teacher" : "Subject Teacher"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <BookOpen className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <h4 className="font-medium text-indigo-900">Class Schedule</h4>
              <p className="text-sm text-indigo-700">View and manage timetable</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h4 className="font-medium text-indigo-900">Students</h4>
              <p className="text-sm text-indigo-700">Manage class students</p>
            </div>
          </div>
        </Card>
        
        <Card className="glass-card p-4">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-purple-700" />
            </div>
            <div>
              <h4 className="font-medium text-indigo-900">Attendance</h4>
              <p className="text-sm text-indigo-700">Track class attendance</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}