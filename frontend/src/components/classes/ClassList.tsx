import { useState } from 'react';
import { useClasses, useDeleteClass } from '../../hooks/useClasses';
import { useTranslation } from 'react-i18next';
import { ResponsiveTable } from '../common/ResponsiveTable';
import { TouchFriendlyButton } from '../common/TouchFriendlyButton';
import { ClassFormModal } from './ClassFormModal';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Edit, Trash2, Eye } from 'lucide-react';
import { getClassDisplayName } from '../../utils/formatters';

interface ClassListProps {
  gradeFilter?: string;
  academicYearFilter?: string;
  onClassSelected?: (classId: number) => void;
}

export function ClassList({ gradeFilter, academicYearFilter, onClassSelected }: ClassListProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<number | null>(null);

  const [isForceDelete, setIsForceDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, refetch } = useClasses(
    gradeFilter || academicYearFilter ? {
      ...(gradeFilter && { grade_level: gradeFilter }),
      ...(academicYearFilter && { academic_year: academicYearFilter }),
    } : undefined
  );

  const deleteClassMutation = useDeleteClass();

  const handleEditClass = (classData: any) => {
    setSelectedClass(classData);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (classId: number) => {
    setClassToDelete(classId);
    setIsForceDelete(false);
    setErrorMessage(null);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (classToDelete) {
      try {
        await deleteClassMutation.mutateAsync({ 
          classId: classToDelete, 
          force: isForceDelete 
        });
        
        toast.success(isForceDelete ? t('attendance_page.force_delete_success', 'Class and all related data deleted') : t('attendance_page.delete_success', 'Class deleted successfully'));
        setIsDeleteDialogOpen(false);
        setClassToDelete(null);
        setIsForceDelete(false);
        setErrorMessage(null);
        refetch();
      } catch (error: any) {
        console.error('Delete error:', error);
        const backendMessage = error.message || t('attendance_page.delete_failed', 'Failed to delete class');
        setErrorMessage(backendMessage);
        
        if (backendMessage?.toLowerCase().includes('related records') || backendMessage?.toLowerCase().includes('force delete')) {
          setIsForceDelete(true);
        } else {
          toast.error(backendMessage);
        }
      }
    }
  };

  const columns = [
    {
      header: t('admin_academic.class_name', 'Class Name'),
      accessor: (classItem: any) => getClassDisplayName(classItem),
      mobileLabel: t('attendance_page.mobile_class', 'Class'),
      priority: 'high' as const
    },
    {
      header: t('admin_academic.grade_level', 'Grade Level'),
      accessor: (classItem: any) => typeof classItem.grade_level === 'object' && classItem.grade_level !== null ? classItem.grade_level.name : classItem.grade_level,
      mobileLabel: t('attendance_page.mobile_grade', 'Grade'),
      priority: 'high' as const
    },
    {
      header: t('admin_academic.academic_year', 'Academic Year'),
      accessor: (classItem: any) => classItem.academic_year,
      mobileLabel: t('attendance_page.mobile_year', 'Year'),
      priority: 'medium' as const
    },
    {
      header: t('attendance_page.students', 'Students'),
      accessor: (classItem: any) => classItem.student_count || classItem.current_enrollment || 0,
      mobileLabel: t('attendance_page.students', 'Students'),
      priority: 'medium' as const
    },
    {
      header: t('admin_academic.status', 'Status'),
      accessor: (classItem: any) => (
        <Badge variant={(classItem.is_active ?? classItem.status === 'active') ? 'success' : 'secondary'}>
          {(classItem.is_active ?? classItem.status === 'active') ? t('admin_academic.active', 'Active') : t('admin_academic.inactive', 'Inactive')}
        </Badge>
      ),
      mobileLabel: t('admin_academic.status', 'Status'),
      priority: 'medium' as const
    },
    {
      header: t('common.actions', 'Actions'),
      accessor: (classItem: any) => (
        <div className="flex space-x-2">
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClassSelected && onClassSelected(classItem.id);
            }}
            aria-label={t('admin_academic.view_class_details_aria', 'View class details')}
          >
            <Eye className="h-4 w-4" />
          </TouchFriendlyButton>
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleEditClass(classItem);
            }}
            aria-label={t('admin_academic.edit_class_aria', 'Edit class')}
          >
            <Edit className="h-4 w-4" />
          </TouchFriendlyButton>
          <TouchFriendlyButton
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleDeleteClick(classItem.id);
            }}
            aria-label={t('admin_academic.delete_class_aria', 'Delete class')}
          >
            <Trash2 className="h-4 w-4" />
          </TouchFriendlyButton>
        </div>
      ),
      mobileLabel: t('common.actions', 'Actions'),
      priority: 'high' as const
    }
  ];

  // Extract classes array from the response data
  const classesData = Array.isArray(data) ? data : (data?.data || []);

  return (
    <>
      <ResponsiveTable
        data={classesData}
        columns={columns}
        keyExtractor={(item) => item.id.toString()}
        onRowClick={(item) => onClassSelected && onClassSelected(item.id)}
        isLoading={isLoading}
        emptyMessage={t('attendance_page.no_classes_message', 'No classes found. Try adjusting your filters or add a new class.')}
      />

      {isModalOpen && (
        <ClassFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedClass(null);
          }}
          classData={selectedClass}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedClass(null);
            refetch();
          }}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={isForceDelete ? "border-red-500/50" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={isForceDelete ? "text-red-500" : ""}>
              {isForceDelete ? t('attendance_page.force_delete_title', 'Force Delete Class?') : t('attendance_page.delete_confirm_title', 'Are you sure?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {errorMessage ? (
                <div className="space-y-4">
                  <p className="text-red-500 font-medium">{errorMessage}</p>
                  <p className="text-slate-400 text-sm italic">
                    {t('attendance_page.force_delete_warn_note', 'Note: Force deleting will unassign students and permanently remove all attendance, exams, and grades associated with this class.')}
                  </p>
                </div>
              ) : (
                t('attendance_page.delete_confirm_desc', 'This action cannot be undone. This will permanently delete the class and remove all associated data.')
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsForceDelete(false);
              setErrorMessage(null);
            }}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className={isForceDelete ? "bg-red-600 hover:bg-red-700" : ""}
              disabled={deleteClassMutation.isPending}
            >
              {deleteClassMutation.isPending ? t('common.deleting', 'Deleting...') : (isForceDelete ? t('attendance_page.force_delete_btn', 'Force Delete Everything') : t('common.delete', 'Delete'))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
