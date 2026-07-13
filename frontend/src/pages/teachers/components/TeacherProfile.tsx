import React from "react";
import { useTranslation } from "react-i18next";
import { Teacher } from "../../../types/teacher.types";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "../../../components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { Mail, Phone, GraduationCap, Calendar, FileText, Edit3 } from "lucide-react";

interface TeacherProfileProps {
  teacher: Teacher;
  onEditClick: () => void;
  compact?: boolean; // Add compact prop for mobile optimization
}

export function TeacherProfile({ teacher, onEditClick, compact = false }: TeacherProfileProps) {
  const { t } = useTranslation();
  
  // Format teacher name
  const formatTeacherName = (teacher: Teacher) => {
    // First try to use full_name if available from backend
    if (teacher.full_name) {
      return teacher.full_name;
    }
    
    // Handle both snake_case and camelCase naming conventions
    const firstName = teacher.firstName || teacher.first_name || '';
    const lastName = teacher.lastName || teacher.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Teacher';
  };
  return (
    <Card className="glass-card overflow-hidden border border-indigo-100 sticky top-4">
      <CardHeader className={compact ? 'pb-1 pt-3' : 'pb-2'}>
        <div className="flex flex-col items-center text-center">
          <Avatar className={compact ? 'h-16 w-16 mb-2' : 'h-24 w-24 mb-4'}>
            <AvatarImage src={teacher.profileImage} alt={formatTeacherName(teacher)} />
            <AvatarFallback>{teacher.firstName?.[0]}{teacher.lastName?.[0]}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-indigo-900">{formatTeacherName(teacher)}</CardTitle>
          <p className="text-sm text-indigo-700">
            {t('teachers_page.profile.teacher_specialization', '{{specialization}} Teacher', { specialization: teacher.specialization || 'General' })}
          </p>
          <div className="flex items-center mt-2">
            <Badge variant="outline" className="mr-2">
              {t('teachers_page.profile.id_label', 'ID')}: {teacher.employeeId}
            </Badge>
            <Badge variant={teacher.status === 'active' ? 'success' : 
                    teacher.status === 'on_leave' ? 'warning' : 'destructive'}>
              {t(`common.status.${teacher.status}`, teacher.status.replace('_', ' ').charAt(0).toUpperCase() + teacher.status.replace('_', ' ').slice(1))}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? 'space-y-2 py-2' : 'space-y-4'}>
        <div className="grid grid-cols-1 gap-3">
          {!compact ? (
            // Full view for desktop
            <>
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2 text-indigo-700" />
                <span className="text-sm text-indigo-900">{teacher.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 text-indigo-700" />
                <span className="text-sm text-indigo-900">{teacher.phone || t('common.not_provided', 'Not provided')}</span>
              </div>
              <div className="flex items-center">
                <GraduationCap className="h-4 w-4 mr-2 text-indigo-700" />
                <span className="text-sm text-indigo-900">{teacher.qualification || t('common.not_provided', 'Not provided')}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-indigo-700" />
                <span className="text-sm text-indigo-900">{t('teachers_page.profile.joined_label', 'Joined')}: {new Date(teacher.joinDate || '').toLocaleDateString()}</span>
              </div>
            </>
          ) : (
            // Compact view for mobile
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-1 text-indigo-700" />
                <span className="text-xs text-indigo-900 truncate max-w-[150px]">{teacher.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-3 w-3 mr-1 text-indigo-700" />
                <span className="text-xs text-indigo-900">{teacher.phone || t('common.not_provided_short', 'N/A')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Attendance progress */}
        <div>
          <h4 className="text-sm font-medium text-indigo-700 mb-2">{t('teachers_page.profile.attendance_rate', 'Attendance Rate')}</h4>
          <div className="flex items-center">
            <Progress value={98} className="flex-grow mr-4" />
            <span className="font-medium text-indigo-900">98%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className={`flex justify-between border-t pt-4 border-white border-opacity-20 ${compact ? 'pb-2' : ''}`}>
        {!compact ? (
          <>
            <Button variant="outline" className="flex items-center glass-button-outline">
              <FileText className="h-4 w-4 mr-2" />
              {t('teachers_page.profile.full_profile_btn', 'Full Profile')}
            </Button>
            <Button 
              className="flex items-center glass-button"
              onClick={onEditClick}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {t('common.edit', 'Edit')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="flex items-center glass-button-outline">
              <FileText className="h-3 w-3 mr-1" />
              {t('teachers_page.profile.profile_btn', 'Profile')}
            </Button>
            <Button 
              size="sm"
              className="flex items-center glass-button"
              onClick={onEditClick}
            >
              <Edit3 className="h-3 w-3 mr-1" />
              {t('common.edit', 'Edit')}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}