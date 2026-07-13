import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Printer, Download, X } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { TouchFriendlyButton } from "../../components/common/TouchFriendlyButton";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { useTranslation } from "react-i18next";

interface StudentData {
  name: string;
  photo?: string;
  studentId?: string;
  admissionNumber?: string;
  class: string;
  bloodGroup: string;
  emergencyContact: string;
}

interface StudentIDCardProps {
  student: StudentData;
  isOpen: boolean;
  onClose: () => void;
}

const StudentIdCard = ({ student, isOpen, onClose }: StudentIDCardProps) => {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 640px)');

  const handlePrint = useReactToPrint({
    contentRef: cardRef,
    documentTitle: `${student.name} - ID Card`,
  });

  const handleDownload = () => {
    // In a real implementation, this would generate a PDF file
    // For now, we'll just trigger the print function which allows saving as PDF
    handlePrint();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="glass-card overflow-hidden border border-indigo-100 max-w-md w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-indigo-900">{t('parents_page.id_card', 'Student ID Card')}</CardTitle>
          <TouchFriendlyButton 
            variant="ghost"
            size={isMobile ? "md" : "sm"}
            onClick={onClose}
            icon={<X className="h-4 w-4" />}
            aria-label="Close" children={undefined}          />
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div 
              ref={cardRef} 
              className="w-[350px] h-[220px] bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl overflow-hidden shadow-lg p-4 text-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">ADMIPAEDIA SCHOOL</h3>
                  <p className="text-xs opacity-80">{t('parent_portal.my_children.id_card_subtitle', 'Student Identification Card')}</p>
                </div>
                <div className="bg-white text-indigo-900 text-xs font-bold px-2 py-1 rounded">
                  {student.bloodGroup || "A+"}
                </div>
              </div>
              
              <div className="flex mt-4">
                <div className="mr-4">
                  <Avatar className="h-16 w-16 border-2 border-white">
                    <AvatarImage src={student.photo} alt={student.name} />
                    <AvatarFallback className="bg-indigo-300 text-indigo-800">{student.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h4 className="font-bold text-lg">{student.name}</h4>
                  <p className="text-sm opacity-90">{t('parent_portal.my_children.grade_class', 'Class: {{grade}}', { grade: student.class })}</p>
                  <p className="text-sm opacity-90">ID: {student.studentId || student.admissionNumber}</p>
                </div>
              </div>
              
              <div className="mt-4 text-xs">
                <p>{t('parent_portal.my_children.emergency_contact_label', 'Emergency Contact')}: {student.emergencyContact}</p>
                <p className="mt-1">{t('parent_portal.my_children.id_card_validity', 'Valid for Academic Year 2023-2024')}</p>
              </div>
              
              <div className="absolute bottom-2 right-2 opacity-30">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15 6H9L12 2Z" fill="currentColor" />
                  <path d="M12 22L9 18H15L12 22Z" fill="currentColor" />
                  <path d="M2 12L6 9V15L2 12Z" fill="currentColor" />
                  <path d="M22 12L18 15V9L22 12Z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <TouchFriendlyButton
            variant="outline"
            size={isMobile ? "lg" : "md"}
            onClick={handleDownload}
            icon={<Download className="h-4 w-4 mr-2" />}
          >
            {t('common.export', 'Download')}
          </TouchFriendlyButton>
          <TouchFriendlyButton
            variant="primary"
            size={isMobile ? "lg" : "md"}
            onClick={handlePrint}
            icon={<Printer className="h-4 w-4 mr-2" />}
          >
            {t('common.print', 'Print')}
          </TouchFriendlyButton>
        </CardFooter>
      </Card>
    </div>
  );
};

export default StudentIdCard;