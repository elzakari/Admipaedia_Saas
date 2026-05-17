import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '../../components/ui/card';
import PageHeader from '../../components/common/PageHeader';
import { FileText } from 'lucide-react';
import ExamManagement from '../../components/academics/ExamManagement';

export const ExamsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('exams_page.title', 'Exams Management')}
        description={t('exams_page.description', 'Create, manage, and grade exams for all classes')}
        icon={<FileText className="h-6 w-6 text-indigo-600" />}
      />
      
      <Card>
        <CardContent className="p-0">
          <ExamManagement />
        </CardContent>
      </Card>
    </div>
  );
};

// Default export for lazy loading
export default ExamsPage;