import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../../../components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { 
  ChevronDown, 
  Trash2, 
  UserX, 
  UserCheck, 
  Mail, 
  Download,
  Edit
} from 'lucide-react';
import { Teacher } from '../../../types/teacher.types';
import { toast } from 'sonner';

interface BulkOperationsProps {
  selectedTeachers: Teacher[];
  onClearSelection: () => void;
  onBulkDelete: (teacherIds: number[]) => void;
  onBulkStatusUpdate: (teacherIds: number[], status: string) => void;
  onBulkExport: (teacherIds: number[]) => void;
}

export function BulkOperations({
  selectedTeachers,
  onClearSelection,
  onBulkDelete,
  onBulkStatusUpdate,
  onBulkExport
}: BulkOperationsProps) {
  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string>('');

  if (selectedTeachers.length === 0) {
    return null;
  }

  const handleBulkDelete = () => {
    const teacherIds = selectedTeachers.map(t => t.id);
    onBulkDelete(teacherIds);
    setShowDeleteDialog(false);
    onClearSelection();
    toast.success(t('teachers_page.bulk.delete_success', '{{count}} teachers deleted successfully', { count: selectedTeachers.length }));
  };

  const handleBulkStatusUpdate = (status: string) => {
    const teacherIds = selectedTeachers.map(t => t.id);
    onBulkStatusUpdate(teacherIds, status);
    onClearSelection();
    const statusLabel = t(`common.status.${status}`, status);
    toast.success(t('teachers_page.bulk.status_update_success', '{{count}} teachers updated to {{status}}', { count: selectedTeachers.length, status: statusLabel }));
  };

  const handleBulkExport = () => {
    const teacherIds = selectedTeachers.map(t => t.id);
    onBulkExport(teacherIds);
    toast.success(t('teachers_page.bulk.export_success', 'Exporting {{count}} teachers', { count: selectedTeachers.length }));
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <Checkbox checked={true} disabled />
          <span className="font-medium text-blue-900">
            {t('teachers_page.bulk.selected_count', '{{count}} teachers selected', { count: selectedTeachers.length })}
          </span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <UserCheck className="h-4 w-4 mr-2" />
                {t('teachers_page.bulk.update_status', 'Update Status')}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                <UserCheck className="h-4 w-4 mr-2" />
                {t('teachers_page.bulk.set_active', 'Set as Active')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>
                <UserX className="h-4 w-4 mr-2" />
                {t('teachers_page.bulk.set_inactive', 'Set as Inactive')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkStatusUpdate('on_leave')}>
                <UserX className="h-4 w-4 mr-2" />
                {t('teachers_page.bulk.set_on_leave', 'Set as On Leave')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm" onClick={handleBulkExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('teachers_page.bulk.export_selected', 'Export Selected')}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Implement bulk email functionality
              toast.info(t('teachers_page.bulk.email_coming_soon', 'Bulk email feature coming soon'));
            }}
          >
            <Mail className="h-4 w-4 mr-2" />
            {t('teachers_page.bulk.send_email', 'Send Email')}
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('teachers_page.bulk.delete_selected', 'Delete Selected')}
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            {t('teachers_page.bulk.clear_selection', 'Clear Selection')}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('teachers_page.bulk.delete_confirm_title', 'Delete Teachers')}</DialogTitle>
            <DialogDescription>
              {t('teachers_page.bulk.delete_confirm_desc', 'Are you sure you want to delete {{count}} teachers?', { count: selectedTeachers.length })} {' '}
              {t('common.cannot_be_undone', 'This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}