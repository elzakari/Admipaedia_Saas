import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Checkbox } from "../../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { MoreHorizontal, Edit, Trash2, Eye, Phone, Mail, MapPin, Calendar, Users, BookOpen, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "../../../components/ui/dropdown-menu";
import { Teacher } from "../../../types/teacher.types";

type SortField = 'name' | 'email' | 'specialization' | 'status' | 'hireDate' | 'experience';
type SortOrder = 'asc' | 'desc';

interface TeachersGridProps {
  teachers: Teacher[];
  selectedTeachers?: Teacher[];
  onSelectTeacher: (teacherId: string | number) => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher?: (teacherId: string | number) => void;
  onTeacherSelect?: (teacher: Teacher, isSelected: boolean) => void;
  showBulkSelect?: boolean;
  isLoading?: boolean;
  error?: any;
  onViewProfile?: (teacher: Teacher) => void;
  onAssignClasses?: (teacher: Teacher) => void;
  onViewSchedule?: (teacher: Teacher) => void;
}

export function TeachersGrid({ 
  teachers, 
  selectedTeachers = [],
  onSelectTeacher, 
  onEditTeacher, 
  onDeleteTeacher,
  onTeacherSelect,
  showBulkSelect = false,
  isLoading,
  error,
  onViewProfile,
  onAssignClasses,
  onViewSchedule
}: TeachersGridProps) {
  const { t } = useTranslation();

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort teachers based on current sort settings
  const sortedTeachers = useMemo(() => {
    if (!teachers?.length) return [];

    return [...teachers].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'specialization':
          aValue = a.specialization?.toLowerCase() || '';
          bValue = b.specialization?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'hireDate':
          aValue = a.hireDate ? new Date(a.hireDate).getTime() : 0;
          bValue = b.hireDate ? new Date(b.hireDate).getTime() : 0;
          break;
        case 'experience':
          aValue = a.hireDate ? new Date().getFullYear() - new Date(a.hireDate).getFullYear() : 0;
          bValue = b.hireDate ? new Date().getFullYear() - new Date(b.hireDate).getFullYear() : 0;
          break;
        default:
          aValue = '';
          bValue = '';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [teachers, sortField, sortOrder]);

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

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'on_leave':
        return 'warning';
      case 'inactive':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Check if teacher is selected
  const isTeacherSelected = (teacher: Teacher) => {
    return selectedTeachers.some(selected => selected.id === teacher.id);
  };

  // Handle teacher selection for bulk operations
  const handleTeacherSelect = (teacher: Teacher, checked: boolean) => {
    if (onTeacherSelect) {
      onTeacherSelect(teacher, checked);
    }
  };

  // Format phone number
  const formatPhoneNumber = (phone?: string | any) => {
    if (!phone || typeof phone !== 'string') return t('teachers_page.no_phone', 'No phone');
    return phone.length > 10 ? `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}` : phone;
  };

  // Get years of experience
  const getExperience = (hireDate?: string) => {
    if (!hireDate) return t('common.not_provided_short', 'N/A');
    const years = new Date().getFullYear() - new Date(hireDate).getFullYear();
    return t('teachers_page.experience_years', '{{count}} year', { count: years });
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

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
        <p className="text-red-500">{t('teachers_page.load_failed', 'Failed to load teachers data')}</p>
      </Card>
    );
  }

  if (!teachers?.length) {
    return (
      <Card className="glass-card p-8 text-center">
        <p className="text-indigo-700">{t('teachers_page.no_teachers_found_card', 'No teachers found. Add a new teacher to get started.')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sorting Controls Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-indigo-900">{t('teachers_page.sort_by', 'Sort by')}:</span>
          <div className="flex gap-2">
            <Button
              variant={sortField === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('name')}
              className="flex items-center gap-1"
            >
              {t('teachers_page.sort.name', 'Name')} {getSortIcon('name')}
            </Button>
            <Button
              variant={sortField === 'specialization' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('specialization')}
              className="flex items-center gap-1"
            >
              {t('teachers_page.sort.subject', 'Subject')} {getSortIcon('specialization')}
            </Button>
            <Button
              variant={sortField === 'status' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('status')}
              className="flex items-center gap-1"
            >
              {t('teachers_page.filters.status', 'Status')} {getSortIcon('status')}
            </Button>
            <Button
              variant={sortField === 'experience' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('experience')}
              className="flex items-center gap-1"
            >
              {t('teachers_page.sort.experience', 'Experience')} {getSortIcon('experience')}
            </Button>
            <Button
              variant={sortField === 'hireDate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSort('hireDate')}
              className="flex items-center gap-1"
            >
              {t('teachers_page.sort.hire_date', 'Hire Date')} {getSortIcon('hireDate')}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-indigo-600">
            {sortedTeachers.length} {t('teachers_page.teachers_count', 'teachers')}
          </span>
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedTeachers.map((teacher) => (
          <Card 
            key={teacher.id} 
            className={`glass-card overflow-hidden border border-indigo-100 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 cursor-pointer group ${
              isTeacherSelected(teacher) ? 'ring-2 ring-indigo-500 shadow-lg' : ''
            }`}
            onClick={() => !showBulkSelect && onSelectTeacher(Number(teacher.id))}
          >
            <CardContent className="p-0">
              {/* Header with Avatar and Actions */}
              <div className="relative p-4 bg-gradient-to-r from-indigo-50 to-blue-50">
                {showBulkSelect && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={isTeacherSelected(teacher)}
                      onCheckedChange={(checked) => {
                        handleTeacherSelect(teacher, checked as boolean);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white border-2"
                    />
                  </div>
                )}
                
                <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => onSelectTeacher(Number(teacher.id))}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('teachers_page.actions.view_details', 'View Details')}
                      </DropdownMenuItem>
                      {onViewProfile && (
                        <DropdownMenuItem onClick={() => onViewProfile(teacher)}>
                          <Users className="h-4 w-4 mr-2" />
                          {t('teachers_page.actions.view_profile', 'View Profile')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEditTeacher(teacher)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('teachers_page.actions.edit_teacher', 'Edit Teacher')}
                      </DropdownMenuItem>
                      {onAssignClasses && (
                        <DropdownMenuItem onClick={() => onAssignClasses(teacher)}>
                          <BookOpen className="h-4 w-4 mr-2" />
                          {t('teachers_page.actions.assign_classes', 'Assign Classes')}
                        </DropdownMenuItem>
                      )}
                      {onViewSchedule && (
                        <DropdownMenuItem onClick={() => onViewSchedule(teacher)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          {t('teachers_page.actions.view_schedule', 'View Schedule')}
                        </DropdownMenuItem>
                      )}
                      {onDeleteTeacher && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDeleteTeacher(Number(teacher.id))}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('teachers_page.actions.delete_teacher', 'Delete Teacher')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Avatar and Status */}
                <div className="flex flex-col items-center">
                  <Avatar className="h-16 w-16 mb-2 border-2 border-white shadow-md">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${formatTeacherName(teacher)}`} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">
                      {teacher.firstName?.[0]}{teacher.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant={getStatusVariant(teacher.status || 'active')} className="text-xs">
                    {t(`common.status.${teacher.status || 'active'}`, teacher.status || 'Active')}
                  </Badge>
                </div>
              </div>

              {/* Teacher Information */}
              <div className="p-4 space-y-3">
                <div className="text-center">
                  <h3 className="font-bold text-lg text-indigo-900 mb-1">{formatTeacherName(teacher)}</h3>
                  <p className="text-sm font-medium text-indigo-700">{teacher.specialization || t('teachers_page.general_education', 'General Education')}</p>
                  {teacher.employeeId && (
                    <p className="text-xs text-indigo-600 mt-1 truncate max-w-full">ID: {teacher.employeeId}</p>
                  )}
                </div>

                {/* Contact Information */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600 min-w-0">
                    <Mail className="h-4 w-4 mr-2 text-indigo-500" />
                    <span className="flex-1 min-w-0 truncate">{teacher.email}</span>
                  </div>
                  
                  {teacher.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-indigo-500" />
                      <span>{formatPhoneNumber(teacher.phone)}</span>
                    </div>
                  )}
                  
                  {teacher.address && (
                    <div className="flex items-center text-gray-600 min-w-0">
                      <MapPin className="h-4 w-4 mr-2 text-indigo-500" />
                      <span className="flex-1 min-w-0 truncate">{teacher.address}</span>
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                <div className="pt-2 border-t border-indigo-100">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {teacher.hireDate && (
                      <div className="text-center p-2 bg-indigo-50 rounded">
                        <div className="font-semibold text-indigo-900">{t('teachers_page.sort.experience', 'Experience')}</div>
                        <div className="text-indigo-700">{getExperience(teacher.hireDate)}</div>
                      </div>
                    )}
                    
                    {teacher.classes && (
                      <div className="text-center p-2 bg-indigo-50 rounded">
                        <div className="font-semibold text-indigo-900">{t('teachers_page.has_classes', 'Has Classes')}</div>
                        <div className="text-indigo-700">{t('common.yes', 'Yes')}</div>
                      </div>
                    )}
                    
                    {teacher.classes && Array.isArray(teacher.classes) && teacher.classes.length > 0 && (
                      <div className="text-center p-2 bg-indigo-50 rounded">
                        <div className="font-semibold text-indigo-900">{t('navigation.classes', 'Classes')}</div>
                        <div className="text-indigo-700">{teacher.classes.length}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex justify-center space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTeacher(Number(teacher.id));
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {t('common.view', 'View')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTeacher(teacher);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {t('common.edit', 'Edit')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
