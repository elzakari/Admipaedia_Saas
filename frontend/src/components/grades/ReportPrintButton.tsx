import React, { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/button';
import api from '@/lib/api';

interface ReportPrintButtonProps {
  studentId: string | number;
  academicCycleId: string;
}

export const ReportPrintButton: React.FC<ReportPrintButtonProps> = ({ studentId, academicCycleId }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const response = await api.get('/saas/report-card/pdf', {
        params: {
          student_id: studentId,
          academic_cycle_id: academicCycleId
        },
        responseType: 'blob'
      });

      // Create blob container and execute physical stream download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_card_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up DOM components
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report card PDF:', error);
      alert('Failed to generate report card PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      disabled={isGenerating}
      className="flex items-center gap-2 rounded-xl border border-indigo-100 hover:border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 font-bold px-4 py-2 transition-all duration-200"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <Printer className="h-4 w-4 shrink-0" />
          <span>Print Report Card</span>
        </>
      )}
    </Button>
  );
};

export default ReportPrintButton;
