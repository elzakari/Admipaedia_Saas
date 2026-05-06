import React from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Checkbox } from "../../../components/ui/checkbox";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../../../components/ui/dropdown-menu";
import { Teacher } from "../../../types/teacher.types";

interface TeachersListProps {
  teachers: Teacher[];
  selectedTeachers?: Teacher[];
  onSelectTeacher: (teacherId: string | number) => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher?: (teacherId: string | number) => void;
  onTeacherSelect?: (teacher: Teacher, isSelected: boolean) => void;
  showBulkSelect?: boolean;
  isLoading?: boolean;
  error?: any;
}

export function TeachersList({ 
  teachers, 
  selectedTeachers = [],
  onSelectTeacher, 
  onEditTeacher, 
  onDeleteTeacher,
  onTeacherSelect,
  showBulkSelect = false,
  isLoading,
  error 
}: TeachersListProps) {
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
        <p className="text-red-500">Failed to load teachers data</p>
      </Card>
    );
  }

  if (!teachers?.length) {
    return (
      <Card className="glass-card p-8 text-center">
        <p className="text-indigo-700">No teachers found. Add a new teacher to get started.</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden border border-indigo-100">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulkSelect && <TableHead className="w-[50px]">Select</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers.map((teacher) => (
              // Update the onSelectTeacher handler to ensure consistent type handling
              <TableRow 
                key={teacher.id} 
                className={`cursor-pointer hover:bg-indigo-50 ${
                  isTeacherSelected(teacher) ? 'bg-indigo-50' : ''
                }`}
                onClick={() => !showBulkSelect && onSelectTeacher(Number(teacher.id))}
              >
                {showBulkSelect && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isTeacherSelected(teacher)}
                      onCheckedChange={(checked) => handleTeacherSelect(teacher, checked as boolean)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={teacher.profileImage} alt={formatTeacherName(teacher)} />
                    <AvatarFallback>{teacher.firstName?.[0]}{teacher.lastName?.[0]}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{formatTeacherName(teacher)}</TableCell>
                <TableCell>{teacher.email}</TableCell>
                <TableCell>{teacher.specialization}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(teacher.status)}>
                    {teacher.status.replace('_', ' ').charAt(0).toUpperCase() + teacher.status.replace('_', ' ').slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTeacher(Number(teacher.id));
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTeacher(teacher);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {onDeleteTeacher && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete ${formatTeacherName(teacher)}?`)) {
                            onDeleteTeacher(Number(teacher.id));
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}