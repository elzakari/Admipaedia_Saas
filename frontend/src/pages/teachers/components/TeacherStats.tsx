import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Teacher } from "../../../types/teacher.types";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Users, GraduationCap, FileText, CheckCircle } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { AITeacherService, TeacherStat } from "../../../services/aiTeacherService";

interface TeacherStatsProps {
  teacher: Teacher;
  classesCount: number;
}

interface StatCardProps {
  name: string;
  value: string;
  icon: LucideIcon;
  color: string;
  trend: string;
  trendDirection: "up" | "down";
}

export function TeacherStats({ teacher, classesCount }: TeacherStatsProps) {
  const [stats, setStats] = useState<StatCardProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchTeacherStats = async () => {
      try {
        setLoading(true);
        const teacherStats = await AITeacherService.getTeacherStats(teacher.id);
        
        // Ensure teacherStats is an array before mapping
        if (!Array.isArray(teacherStats)) {
          console.error("Teacher stats is not an array:", teacherStats);
          setStats([]);
          return;
        }
        
        // Map API response to component state
        const mappedStats = teacherStats.map(stat => {
          let icon: LucideIcon;
          let color: string;
          
          // Assign icon and color based on stat name
          switch(stat.name) {
            case "Students Taught":
              icon = Users;
              color = "bg-blue-500";
              break;
            case "Classes Assigned":
              icon = GraduationCap;
              color = "bg-emerald-500";
              break;
            case "Pending Grades":
              icon = FileText;
              color = "bg-amber-500";
              break;
            case "Attendance Rate":
              icon = CheckCircle;
              color = "bg-purple-500";
              break;
            default:
              icon = Users;
              color = "bg-gray-500";
          }
          
          return {
            name: stat.name,
            value: stat.value,
            icon,
            color,
            trend: stat.trend,
            trendDirection: stat.trendDirection
          };
        });
        
        setStats(mappedStats);
      } catch (error) {
        console.error("Error fetching teacher stats:", error);
        // Fallback to default stats if API fails
        setStats(generateDefaultTeacherStats(classesCount));
      } finally {
        setLoading(false);
      }
    };
    
    if (teacher?.id) {
      fetchTeacherStats();
    } else {
      setStats(generateDefaultTeacherStats(classesCount));
      setLoading(false);
    }
  }, [teacher?.id, classesCount]);
  
  // Generate default stats for fallback
  const generateDefaultTeacherStats = (classesCount: number): StatCardProps[] => [
    { 
      name: "Students Taught", 
      value: "45",
      icon: Users, 
      color: "bg-blue-500", 
      trend: "+12", 
      trendDirection: "up" 
    },
    { 
      name: "Classes Assigned", 
      value: classesCount.toString(), 
      icon: GraduationCap, 
      color: "bg-emerald-500", 
      trend: "+1", 
      trendDirection: "up" 
    },
    { 
      name: "Pending Grades", 
      value: "28", 
      icon: FileText, 
      color: "bg-amber-500", 
      trend: "-5", 
      trendDirection: "down" 
    },
    { 
      name: "Attendance Rate", 
      value: "98%", 
      icon: CheckCircle, 
      color: "bg-purple-500", 
      trend: "+2%", 
      trendDirection: "up" 
    },
  ];

  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardContent className="p-4 h-24"></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getStatTranslationKey = (name: string) => {
    switch (name) {
      case "Students Taught":
        return "teachers_page.stats.students_taught";
      case "Classes Assigned":
        return "teachers_page.stats.classes_assigned";
      case "Pending Grades":
        return "teachers_page.stats.pending_grades";
      case "Attendance Rate":
        return "teachers_page.stats.attendance_rate";
      default:
        return "";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const translationKey = getStatTranslationKey(stat.name);
        const translatedName = translationKey ? t(translationKey, stat.name) : stat.name;

        return (
          <Card key={index} className="glass-card border border-slate-200 dark:border-slate-800 rounded-2xl hover:-translate-y-0.5 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-700/70 dark:text-indigo-300/70">{translatedName}</p>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100 mt-1">{stat.value}</p>
                  <div className="mt-1.5">
                    <Badge variant={stat.trendDirection === "up" ? "success" : "destructive"} className="text-[10px] px-1.5 py-0">
                      {stat.trend}
                    </Badge>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${stat.color} text-white shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}