import { Teacher } from '../../../types/teacher.types';

export const exportTeachersToCSV = (teachers: Teacher[]) => {
  const headers = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Status',
    'Specialization',
    'Qualification',
    'Join Date'
  ];

  const csvContent = [
    headers.join(','),
    ...teachers.map(teacher => [
      teacher.id,
      teacher.firstName || '',
      teacher.lastName || '',
      teacher.email || '',
      teacher.phone || '',
      teacher.status || '',
      teacher.specialization || '',
      teacher.qualification || '',
      teacher.joinDate || ''
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `teachers_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTeachersToPDF = (teachers: Teacher[]) => {
  // PDF export implementation using jsPDF or similar library
  console.log('PDF export functionality to be implemented');
};