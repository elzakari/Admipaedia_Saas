import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { ClassAttendance } from "../../../components/classes/ClassAttendance";
import { useToast } from "../../../components/ui/use-toast";

interface AttendanceTabProps {
  teacherId: number;
}

// Define class interface
interface ClassData {
  id: number;
  name: string;
}

export function AttendanceTab({ teacherId }: AttendanceTabProps) {
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Mock classes data - in a real app, this would come from an API
  const classes: ClassData[] = [
    {
      id: 1,
      name: "Math - Grade 10A"
    },
    {
      id: 2,
      name: "Physics - Grade 11B"
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Teacher Attendance</CardTitle>
          <CardDescription>Manage attendance for your classes</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <Select 
                value={selectedClass ? selectedClass.toString() : ""} 
                onValueChange={(value) => {
                  const classId = parseInt(value);
                  setSelectedClass(classId);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedClass ? (
              <ClassAttendance classId={selectedClass} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                Please select a class to view and manage attendance
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}