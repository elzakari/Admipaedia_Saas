import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../ui/use-toast";
import { ClassAttendance } from "./ClassAttendance";
import { ClassAttendanceAnalytics } from "./ClassAttendanceAnalytics";
import { AttendanceCalendar } from "./AttendanceCalendar";
import { BarChart, LineChart } from "lucide-react";

export function EnhancedAttendanceSystem({ classId }: { classId: number }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("daily");
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enhanced Attendance System</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
            <TabsTrigger value="trends">Attendance Trends</TabsTrigger>
            <TabsTrigger value="patterns">Attendance Patterns</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily">
            {/* Daily attendance interface */}
            {classId && <ClassAttendance classId={classId} />}
          </TabsContent>
          
          <TabsContent value="trends">
            {/* Attendance trends visualization */}
            {classId && <ClassAttendanceAnalytics classId={classId} />}
          </TabsContent>
          
          <TabsContent value="patterns">
            {/* Attendance patterns analysis */}
            {classId && <AttendanceCalendar classId={classId} />}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}