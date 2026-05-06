import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useToast } from "../ui/use-toast";
import { BookOpen, Search, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import subjectService, { Subject as ServiceSubject } from "../../services/subjectService";
import { Department, departmentService } from '@/services/departmentService';

// Use the service Subject interface with proper typing
type Subject = ServiceSubject & {
  department?: { id: number; name: string; code: string } | string;
};

export function SubjectManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department: undefined as string | undefined,
    credit_hours: 0,
    is_active: true
  });

  // Add department query
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentService.getAllDepartments,
  });

  // Fetch subjects
  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects(),
  });

  // Create/Update subject mutation
  const subjectMutation = useMutation({
    mutationFn: (data: any) => 
      selectedSubject && selectedSubject.id
        ? subjectService.updateSubject(selectedSubject.id, data)
        : subjectService.createSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: "Success",
        description: selectedSubject ? "Subject updated successfully" : "Subject created successfully",
        id: ''
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to ${selectedSubject ? 'update' : 'create'} subject: ${error.message}`,
        variant: "destructive",
        id: ''
      });
    }
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: (id: number) => subjectService.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: "Subject Deleted",
        description: "The subject has been deleted successfully.",
        id: ''
      });
    },
    onError: (error: any) => {
      // Prefer backend-provided message over generic Axios message
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error;
      const finalMessage =
        backendMessage ||
        error?.message ||
        'Failed to delete subject';
  
      // Log everything for debugging
      console.error('Delete subject failed:', {
        error,
        responseData: error?.response?.data,
        status: error?.response?.status
      });
  
      toast({
        title: "Error",
        description: finalMessage,
        variant: "destructive",
        id: ''
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleOpenDialog = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({
        name: subject.name,
        code: subject.code,
        description: subject.description || '',
        department: subject.department,
        credit_hours: typeof subject.credit_hours === 'string' 
          ? parseInt(subject.credit_hours, 10) || 0 
          : parseInt(String(subject.credit_hours) || '0', 10) || 0,
        is_active: subject.is_active
      });
    } else {
      setSelectedSubject(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    subjectMutation.mutate(formData);
  };

  const handleDeleteSubject = (id: number) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      deleteSubjectMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      department: undefined,
      credit_hours: 0,
      is_active: true
    });
  };

  // Filter subjects based on search term
  const filteredSubjects: ServiceSubject[] = (subjectsData?.subjects?.filter((subject: ServiceSubject) => 
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (subject.department && 
      (typeof subject.department === 'string' 
        ? subject.department.toLowerCase().includes(searchTerm.toLowerCase())
        : false // Handle object department case if needed
      )
    )
  ) || []) as ServiceSubject[];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0">
            <div>
              <CardTitle>Academic Subjects</CardTitle>
              <CardDescription>View and manage all subjects offered in the school</CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-2 md:space-y-0 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search subjects..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No subjects found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? "Try a different search term" : "Get started by creating a new subject"}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <Button onClick={() => handleOpenDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Subject
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Credit Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.code}</TableCell>
                      <TableCell>{subject.name}</TableCell>
                      <TableCell>
                        {subject.department && typeof subject.department === 'object' && 'name' in subject.department && 'code' in subject.department
                          ? `${(subject.department as any).name} (${(subject.department as any).code})`
                          : typeof subject.department === 'string' 
                            ? subject.department 
                            : 'No Department'}
                      </TableCell>
                      <TableCell>{subject.credit_hours || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={subject.is_active ? 'default' : 'secondary'}>
                          {subject.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(subject)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
            <DialogDescription>
              {selectedSubject ? 'Update the subject details below.' : 'Fill in the subject details below to create a new subject.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Subject Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">
                  Subject Code
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">
                  Department
                </Label>
                <select
                  id="department"
                  name="department"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value || undefined })}
                  className="col-span-3 p-2 border rounded"
                >
                  <option value="">Select Department</option>
                  {departments?.map((dept: Department) => (
                    <option key={dept.id} value={dept.name}>{dept.name} ({dept.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="credit_hours" className="text-right">
                  Credit Hours
                </Label>
                <Input
                  id="credit_hours"
                  name="credit_hours"
                  type="number"
                  value={formData.credit_hours}
                  onChange={handleNumberChange}
                  className="col-span-3"
                  min="0"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is_active" className="text-right">
                  Active
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Input
                    id="is_active"
                    name="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_active" className="text-sm font-normal">
                    Subject is currently active
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={subjectMutation.isPending}>
                {subjectMutation.isPending ? 'Saving...' : selectedSubject ? 'Update Subject' : 'Create Subject'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}