import React, { useState } from 'react';
import { useEnhancedApiCall } from '../../hooks/useEnhancedApiCall';
import { Button } from '../ui/button';
import ErrorDisplay from '../common/ErrorDisplay'; // Fixed: default import
import { LoadingState } from '../common/LoadingState';
import teacherService, { TeacherCreate } from '@/services/teacherService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';

const CreateTeacherExample: React.FC = () => {
  const [formData, setFormData] = useState<TeacherCreate>({
    first_name: '',
    last_name: '',
    phone_number: '',
    qualification: '',
    specialization: '',
    joining_date: '',
    employee_id: '',
    user_id: 0, // This would typically come from somewhere else
  });

  // For UI display only - not sent to API
  const [status, setStatus] = useState<'active' | 'inactive' | 'on_leave'>('active');
  const { toast } = useToast();

  // Enhanced API call for creating teacher
  const {
    data: createdTeacher,
    error,
    isLoading,
    isRetrying,
    retryCount,
    execute: createTeacher,
    reset
  } = useEnhancedApiCall(
    () => teacherService.createTeacher(formData),
    {
      immediate: false, // Don't execute immediately
      showErrorToast: true,
      showSuccessToast: true,
      retryOnError: false, // Don't auto-retry form submissions
      maxRetries: 0,
      successMessage: 'Teacher created successfully!',
      onSuccess: (data) => {
        // Reset form on successful creation
        setFormData({
          first_name: '',
          last_name: '',
          phone_number: '',
          qualification: '',
          specialization: '',
          joining_date: '',
          employee_id: '',
          user_id: 0,
        });
        setStatus('active');
        
        // Show additional success toast with teacher details
        toast({
          title: 'Success!',
          description: `Teacher ${data.first_name} ${data.last_name} has been created successfully.`,
          variant: 'default',
          id: ''
        });
      },
      onError: (error) => {
        // Log error for debugging
        console.error('Error creating teacher:', error);
      }
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear any previous errors when user starts typing
    if (error) {
      reset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic form validation
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.employee_id.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (First Name, Last Name, Employee ID).',
        variant: 'destructive',
        id: ''
      });
      return;
    }
    
    // Execute the API call
    await createTeacher();
  };

  const handleRetry = () => {
    createTeacher();
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Enhanced Error Display */}
          {error && (
            <ErrorDisplay 
              error={error}
              onRetry={handleRetry}
              onDismiss={reset}
              showDetails={process.env.NODE_ENV === 'development'}
              className="mb-4"
            />
          )}
          
          {/* Enhanced Loading State */}
          {isLoading && (
            <LoadingState 
              message="Creating teacher..."
              isRetrying={isRetrying}
              retryCount={retryCount}
              maxRetries={0}
              className="mb-4"
            />
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                name="phone_number"
                value={formData.phone_number || ''}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                name="qualification"
                value={formData.qualification || ''}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Enter qualification"
              />
            </div>
            
            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                name="specialization"
                value={formData.specialization || ''}
                onChange={handleChange}
                disabled={isLoading}
                placeholder="Enter specialization"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  name="joining_date"
                  type="date"
                  value={formData.joining_date || ''}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <Label htmlFor="employee_id">Employee ID *</Label>
                <Input
                  id="employee_id"
                  name="employee_id"
                  value={formData.employee_id || ''}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  placeholder="Enter employee ID"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="status">Status (Display Only)</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'active' | 'inactive' | 'on_leave')} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Creating...' : 'Create Teacher'}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    first_name: '',
                    last_name: '',
                    phone_number: '',
                    qualification: '',
                    specialization: '',
                    joining_date: '',
                    employee_id: '',
                    user_id: 0,
                  });
                  setStatus('active');
                  reset();
                }}
                disabled={isLoading}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTeacherExample;