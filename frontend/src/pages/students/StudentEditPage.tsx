import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Heart, GraduationCap, Users, Save, ArrowLeft, X } from 'lucide-react';
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
import { useClasses } from '../../hooks/useClasses';

const UNASSIGNED_CLASS_SENTINEL = 'unassigned';

const StudentEditPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const { data: classesPaginated, isLoading: classesLoading, isError: classesError } = useClasses({ page: 1, per_page: 500 });
  const classOptions: Array<{ id: number | string; name: string }> = React.useMemo(() => {
    const list = (classesPaginated?.data as any) || classesPaginated?.classes || [];
    return Array.isArray(list)
      ? list.map((c: any) => ({ id: c.id, name: c.display_name || c.name || `Class ${c.id}` }))
      : [];
  }, [classesPaginated]);

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
        const hydrate: any = { ...studentData };
        if (hydrate.class_id === null || hydrate.class_id === undefined || hydrate.class_id === '') {
          hydrate.class_id = UNASSIGNED_CLASS_SENTINEL;
        } else {
          hydrate.class_id = String(hydrate.class_id);
        }
        setFormData(hydrate);
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
      const payload: any = { ...formData };
      if (String(payload.class_id || UNASSIGNED_CLASS_SENTINEL) === UNASSIGNED_CLASS_SENTINEL) {
        payload.class_id = null;
      } else if (payload.class_id) {
        payload.class_id = Number(payload.class_id);
        if (!Number.isFinite(payload.class_id)) payload.class_id = null;
      }
      await studentService.updateStudent(studentId, payload);
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
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              {t('common.personal_information', 'Personal Information')}
            </CardTitle>
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

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-indigo-600" />
              {t('students_page.contact_details', 'Contact Details')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telephone">{t('common.phone_alt', 'Telephone (Alt)')}</Label>
                <Input id="telephone" value={formData.telephone || ''} onChange={(e) => handleInputChange('telephone', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="whatsapp">{t('common.whatsapp', 'WhatsApp')}</Label>
                <Input id="whatsapp" value={formData.whatsapp || ''} onChange={(e) => handleInputChange('whatsapp', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="postal_address">{t('common.postal_address', 'Postal Address')}</Label>
                <Input id="postal_address" value={formData.postal_address || ''} onChange={(e) => handleInputChange('postal_address', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="city">{t('common.city', 'City')}</Label>
                <Input id="city" value={formData.city || ''} onChange={(e) => handleInputChange('city', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="country">{t('common.country', 'Country')}</Label>
                <Input id="country" value={formData.country || ''} onChange={(e) => handleInputChange('country', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="residential_address">{t('common.residential_address', 'Residential Address')}</Label>
                <Input id="residential_address" value={formData.residential_address || ''} onChange={(e) => handleInputChange('residential_address', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-indigo-600" />
              {t('common.health_information', 'Health Information')}
            </CardTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="medication">{t('common.medication', 'Medication')}</Label>
                <Input id="medication" value={formData.medication || ''} onChange={(e) => handleInputChange('medication', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="physician_phone">{t('common.physician_contact', 'Physician Contact')}</Label>
                <Input id="physician_phone" value={formData.physician_phone || ''} onChange={(e) => handleInputChange('physician_phone', e.target.value)} />
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

        {/* Academic Management (Enrollment) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              {t('academics_page.management_title', 'Academic / Enrollment')}
            </CardTitle>
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
              <div>
                <Label htmlFor="class_id">{t('common.class', 'Class')}</Label>
                <Select
                  value={String(formData.class_id || UNASSIGNED_CLASS_SENTINEL)}
                  onValueChange={(value) => handleInputChange('class_id', value)}
                  disabled={classesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.select_class', 'Select class')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classesLoading && (
                      <SelectItem value="__loading__" disabled>
                        {t('common.loading', 'Loading...')}
                      </SelectItem>
                    )}
                    {classesError && (
                      <SelectItem value="__error__" disabled>
                        {t('common.error_loading', 'Error loading classes')}
                      </SelectItem>
                    )}
                    {classOptions.map((cls) => (
                      <SelectItem key={String(cls.id)} value={String(cls.id)}>
                        {cls.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={UNASSIGNED_CLASS_SENTINEL}>
                      {t('common.unassigned', 'Unassigned')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="previous_school">{t('students_page.previous_school', 'Previous School')}</Label>
                <Input id="previous_school" value={formData.previous_school || ''} onChange={(e) => handleInputChange('previous_school', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parent / Guardian */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              {t('students_page.parent_guardian', 'Parent / Guardian')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="father_name">{t('common.father_name', 'Father Name')}</Label>
                <Input id="father_name" value={formData.father_name || ''} onChange={(e) => handleInputChange('father_name', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="father_contact">{t('common.father_contact', 'Father Contact')}</Label>
                <Input id="father_contact" value={formData.father_contact || ''} onChange={(e) => handleInputChange('father_contact', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="mother_name">{t('common.mother_name', 'Mother Name')}</Label>
                <Input id="mother_name" value={formData.mother_name || ''} onChange={(e) => handleInputChange('mother_name', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="mother_contact">{t('common.mother_contact', 'Mother Contact')}</Label>
                <Input id="mother_contact" value={formData.mother_contact || ''} onChange={(e) => handleInputChange('mother_contact', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="guardian_name">{t('common.guardian_name', 'Guardian Name')}</Label>
                <Input id="guardian_name" value={formData.guardian_name || ''} onChange={(e) => handleInputChange('guardian_name', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentEditPage;
