import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, MapPin, GraduationCap, Save, ArrowLeft, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import studentService from '../../services/studentService';
import { useToast } from '../../components/ui/use-toast';
import { ADMIN_PRIMARY_BUTTON_CLASS, ADMIN_SECONDARY_BUTTON_CLASS } from '../../lib/adminUi';
import { useTranslation } from 'react-i18next';

const StudentEditPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;
      const studentId = Number(id);

      if (!Number.isInteger(studentId) || studentId <= 0) {
        setLoading(false);
        toast({
          title: t('common.error', 'Error'),
          description: t('students_page.invalid_student', 'Invalid student record'),
          variant: "destructive"
        });
        navigate('/students', { replace: true });
        return;
      }
      
      try {
        setLoading(true);
        const studentResp: any = await studentService.getStudentById(studentId);
        const studentData: any = studentResp?.data || {};
        setStudent(studentData);
        setFormData(studentData);
      } catch (error) {
        toast({
            title: t('common.error', 'Error'),
            description: t('students_page.failed_fetch', 'Failed to fetch student data'),
            variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id, t]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!id) return;
    const studentId = Number(id);
    if (!Number.isInteger(studentId) || studentId <= 0) return;
    
    try {
      setSaving(true);
      await studentService.updateStudent(studentId, formData);
      toast({
        title: t('common.success', 'Success'),
        description: t('students_page.update_success', 'Student updated successfully'),
        variant: "default"
      });
      navigate(`/students/${id}`);
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: t('students_page.update_failed', 'Failed to update student'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl font-bold text-gray-600 mb-2">{t('students_page.no_students_found', 'Student Not Found')}</h2>
        <Button onClick={() => navigate('/students')} variant="outline" className={ADMIN_SECONDARY_BUTTON_CLASS}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back_to_students', 'Back to Students')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/students/${id}`)}
            className={`mr-3 ${ADMIN_SECONDARY_BUTTON_CLASS}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('students_page.edit_student', 'Edit Student')}</h1>
            <p className="text-gray-600">{student.display_name}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate(`/students/${id}`)} className={ADMIN_SECONDARY_BUTTON_CLASS}>
            <X className="h-4 w-4 mr-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className={ADMIN_PRIMARY_BUTTON_CLASS}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('common.saving', 'Saving...') : t('common.save_changes', 'Save Changes')}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('common.personal_information', 'Personal Information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">{t('students_page.first_name', 'First Name')}</Label>
                <Input
                  id="first_name"
                  value={formData.first_name || ''}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="last_name">{t('students_page.last_name', 'Last Name')}</Label>
                <Input
                  id="last_name"
                  value={formData.last_name || ''}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="middle_name">{t('students_page.middle_name', 'Middle Name')}</Label>
                <Input
                  id="middle_name"
                  value={formData.middle_name || ''}
                  onChange={(e) => handleInputChange('middle_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">{t('teachers_page.profile.email', 'Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t('teachers_page.profile.phone', 'Phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="date_of_birth">{t('common.date_of_birth', 'Date of Birth')}</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gender">{t('common.gender', 'Gender')}</Label>
                <Select value={formData.gender || ''} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select_gender', 'Select gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{t('common.male', 'Male')}</SelectItem>
                    <SelectItem value="Female">{t('common.female', 'Female')}</SelectItem>
                    <SelectItem value="Other">{t('common.other', 'Other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">{t('teachers_page.profile.status', 'Status')}</Label>
                <Select value={formData.status || ''} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select_status', 'Select status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('common.active', 'Active')}</SelectItem>
                    <SelectItem value="inactive">{t('common.inactive', 'Inactive')}</SelectItem>
                    <SelectItem value="suspended">{t('common.suspended', 'Suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="address">{t('common.address', 'Address')}</Label>
              <Textarea
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('academics_page.management_title', 'Academic Information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admission_number">{t('common.admission_number', 'Admission Number')}</Label>
                <Input
                  id="admission_number"
                  value={formData.admission_number || ''}
                  onChange={(e) => handleInputChange('admission_number', e.target.value)}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="enrollment_date">{t('students_page.profile.enrollment_date', 'Enrollment Date')}</Label>
                <Input
                  id="enrollment_date"
                  type="date"
                  value={formData.enrollment_date || ''}
                  onChange={(e) => handleInputChange('enrollment_date', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('common.health_information', 'Health Information')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="blood_group">{t('common.blood_group', 'Blood Group')}</Label>
                <Input
                  id="blood_group"
                  value={formData.blood_group || ''}
                  onChange={(e) => handleInputChange('blood_group', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="allergies">{t('common.allergies', 'Allergies')}</Label>
                <Input
                  id="allergies"
                  value={formData.allergies || ''}
                  onChange={(e) => handleInputChange('allergies', e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="medical_conditions">{t('common.medical_conditions', 'Medical Conditions')}</Label>
              <Textarea
                id="medical_conditions"
                value={formData.medical_conditions || ''}
                onChange={(e) => handleInputChange('medical_conditions', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentEditPage;
