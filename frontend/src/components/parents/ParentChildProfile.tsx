import { GraduationCap, Award, CheckCircle, CreditCard, Printer, FileText, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { useTranslation } from "react-i18next";
import { parentPortalPrimaryButtonClass, parentPortalSecondaryButtonClass } from "../../lib/parentPortalUi";
import { resolveStudentAvatar } from "../../utils/avatar";
import { formatCurrency } from "../../lib/utils";

interface ParentChildProfileProps {
  currentChild: any;
  currentAcademicData: any;
  currentAttendanceData: any;
  currentFeeData: any;
  currency: string;
  onIdCardClick?: () => void; // Add this prop
  onFullProfileClick?: () => void; // Add this prop
}

const ParentChildProfile = ({
  currentChild,
  currentAcademicData,
  currentAttendanceData,
  currentFeeData,
  currency,
  onIdCardClick,
  onFullProfileClick
}: ParentChildProfileProps) => {
  const { t } = useTranslation();

  return (
    <Card className="glass-card overflow-hidden border border-indigo-100 sticky top-4">
      <CardHeader className="pb-2">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={resolveStudentAvatar(currentChild)} alt={currentChild.name} />
            <AvatarFallback>{currentChild.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-indigo-900">{currentChild.name}</CardTitle>
          <p className="text-sm text-indigo-700">
            {t('parent_portal.my_children.grade_class', 'Class {{grade}}', { grade: currentChild.class })} • {t('parent_portal.my_children.years', '{{age}} years', { age: currentChild.age })}
          </p>
          <div className="flex items-center mt-2">
            <Badge variant="outline" className="mr-2">
              ID: {currentChild.studentId || currentChild.admissionNumber}
            </Badge>
            <Badge variant="success">{t('parent_portal.my_children.status_active', 'Active')}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center">
            <GraduationCap className="h-4 w-4 mr-2 text-indigo-700" />
            <span className="text-sm text-indigo-900">{t('parent_portal.my_children.grade_class', 'Class {{grade}}', { grade: currentChild.class })}</span>
          </div>
          <div className="flex items-center">
            <Award className="h-4 w-4 mr-2 text-indigo-700" />
            <span className="text-sm text-indigo-900">
              {t('parent_portal.my_children.rank_out_of', 'Rank: {{rank}} out of {{total}}', {
                rank: currentAcademicData.rank || currentAcademicData.classRank || '—',
                total: currentAcademicData.totalStudents || '—'
              })}
            </span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-indigo-700" />
            <span className="text-sm text-indigo-900">{t('parent_portal.my_children.attendance_label', 'Attendance')}: {currentAttendanceData.percentage || currentAttendanceData.attendancePercentage}%</span>
          </div>
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-indigo-700" />
            <span className="text-sm text-indigo-900">{t('parent_portal.my_children.fees_balance', 'Fees Balance')}: {formatCurrency(Number(currentFeeData.balance || currentFeeData.due || 0), currency || currentFeeData.currency || 'USD')}</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-indigo-700 mb-2">{t('parent_portal.my_children.academic_progress', 'Academic Progress')}</h4>
          <div className="flex items-center">
            <Progress value={currentAcademicData.overallPercentage || (currentAcademicData.overallGPA * 25)} className="flex-grow mr-4" />
            <span className="font-medium text-indigo-900">{currentAcademicData.overallPercentage || (currentAcademicData.overallGPA * 25)}%</span>
          </div>
        </div>

      </CardContent>
      <CardFooter className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4 border-white border-opacity-20">
        <Button
          type="button"
          variant="outline"
          className={`w-full ${parentPortalSecondaryButtonClass}`}
          onClick={onIdCardClick}
          disabled={!onIdCardClick}
          aria-label="Open student ID card"
          title="Open student ID card"
        >
          <Printer className="h-4 w-4 mr-2" />
          <span>{t('parent_portal.my_children.actions.id_card', 'ID Card')}</span>
        </Button>

        <Button
          type="button"
          className={`w-full ${parentPortalPrimaryButtonClass}`}
          onClick={onFullProfileClick}
          disabled={!onFullProfileClick}
          aria-label="Open full profile"
          title="Open full profile"
        >
          <FileText className="h-4 w-4 mr-2" />
          <span>{t('parent_portal.my_children.actions.full_profile', 'Full Profile')}</span>
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ParentChildProfile;
