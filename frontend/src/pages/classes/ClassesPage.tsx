import React, { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import { BookOpen } from 'lucide-react';
import { ClassList } from '../../components/classes/ClassList';
import { ClassManagementContainer } from '../../components/classes/ClassManagementContainer';

const ClassesPage: React.FC = () => {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const handleClassSelected = (classId: number) => {
    setSelectedClassId(classId);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Classes Management" 
        description="Manage school classes, sections, and schedules"
        icon={<BookOpen className="h-6 w-6 text-indigo-600" />}
      />
      
      <div className="grid gap-6">
        {selectedClassId ? (
          <ClassManagementContainer 
            classId={selectedClassId} 
            onBack={() => setSelectedClassId(null)}
          />
        ) : (
          <ClassList onClassSelected={handleClassSelected} />
        )}
      </div>
    </div>
  );
};

export default ClassesPage;