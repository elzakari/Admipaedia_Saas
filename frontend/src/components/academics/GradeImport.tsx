import React, { useState } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Upload, FileUp, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import gradeService from '../../services/gradeService';

interface GradeImportProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const GradeImport: React.FC<GradeImportProps> = ({ onSuccess, trigger }) => {
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    successful_count: number;
    failed_count: number;
    updated_count: number;
    failed_imports?: Array<{row: number; student_id: number; error: string}>;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file to import');
      return;
    }

    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(fileExt || '')) {
      toast.error('Invalid file format. Please use CSV or Excel files.');
      return;
    }

    setIsSubmitting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('update_existing', updateExisting.toString());

      const response = await gradeService.importGrades(formData);
      
      setImportResult(response.result);
      toast.success(response.message || 'Grades imported successfully');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import grades');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Grades
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Grades</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!importResult ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload File (CSV or Excel)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  File must include: student_id, subject_id, class_id, term, academic_year, assessment_type, marks_obtained
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="update-existing" 
                  checked={updateExisting}
                  onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
                />
                <Label htmlFor="update-existing" className="text-sm font-normal">
                  Update existing grades if found
                </Label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!file || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Import Results</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded-md text-center">
                    <p className="text-2xl font-bold text-green-600">{importResult.successful_count}</p>
                    <p className="text-sm text-green-700">Successful</p>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-md text-center">
                    <p className="text-2xl font-bold text-yellow-600">{importResult.updated_count}</p>
                    <p className="text-sm text-yellow-700">Updated</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-md text-center">
                    <p className="text-2xl font-bold text-red-600">{importResult.failed_count}</p>
                    <p className="text-sm text-red-700">Failed</p>
                  </div>
                </div>
              </div>
              
              {importResult.failed_imports && importResult.failed_imports.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Failed Imports</h4>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importResult.failed_imports.map((failure, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{failure.row}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{failure.student_id}</td>
                            <td className="px-3 py-2 text-sm text-red-500">{failure.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GradeImport;