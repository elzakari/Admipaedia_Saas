import React, { useState } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { BookOpen, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface GradesTabProps {
  teacherId: number;
}

export function GradesTab({ teacherId }: GradesTabProps) {
  // In a real implementation, you would fetch grades data using a custom hook
  // const { data, isLoading, error } = useTeacherGrades(teacherId);
  
  const [activeGradeTab, setActiveGradeTab] = useState("pending");
  
  // Mock data for demonstration
  const pendingGrades = [
    { id: 1, className: "Mathematics - Grade 10", section: "A", dueDate: "2023-05-15", studentsCount: 32 },
    { id: 2, className: "Physics - Grade 11", section: "B", dueDate: "2023-05-18", studentsCount: 28 },
    { id: 3, className: "Chemistry - Grade 10", section: "C", dueDate: "2023-05-20", studentsCount: 30 },
  ];
  
  const completedGrades = [
    { id: 4, className: "Mathematics - Grade 9", section: "A", submittedDate: "2023-05-01", studentsCount: 35 },
    { id: 5, className: "Physics - Grade 10", section: "B", submittedDate: "2023-05-05", studentsCount: 30 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-900">Grades Management</h3>
        <Button className="flex items-center glass-button">
          <FileText className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>
      
      <Card className="glass-card overflow-hidden">
        <Tabs defaultValue="pending" value={activeGradeTab} onValueChange={setActiveGradeTab}>
          <TabsList className="glass-tabs w-full justify-start p-2">
            <TabsTrigger value="pending" className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Pending Grades
              <Badge variant="destructive" className="ml-2">{pendingGrades.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
              <Badge variant="success" className="ml-2">{completedGrades.length}</Badge>
            </TabsTrigger>
          </TabsList>
          
          <CardContent className="p-0">
            <TabsContent value="pending" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.className}</TableCell>
                      <TableCell>{grade.section}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-amber-600">
                          {new Date(grade.dueDate).toLocaleDateString()}
                        </Badge>
                      </TableCell>
                      <TableCell>{grade.studentsCount}</TableCell>
                      <TableCell>
                        <Button size="sm" className="glass-button">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Grade Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            
            <TabsContent value="completed" className="m-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Submitted Date</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-medium">{grade.className}</TableCell>
                      <TableCell>{grade.section}</TableCell>
                      <TableCell>
                        <Badge variant="success" className="text-green-600">
                          {new Date(grade.submittedDate).toLocaleDateString()}
                        </Badge>
                      </TableCell>
                      <TableCell>{grade.studentsCount}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="glass-button-outline">
                          <FileText className="h-4 w-4 mr-2" />
                          View Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
        <div className="flex items-start">
          <div className="bg-indigo-100 p-2 rounded-full mr-3">
            <BookOpen className="h-5 w-5 text-indigo-700" />
          </div>
          <div>
            <h4 className="font-medium text-indigo-900 mb-1">Grading Tips</h4>
            <p className="text-sm text-indigo-700">
              Remember to provide constructive feedback along with grades. Focus on both strengths and areas for improvement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}