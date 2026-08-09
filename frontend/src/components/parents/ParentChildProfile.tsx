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
  const displayRank = (() => {
    const pos = Number(currentAcademicData.classRank ?? currentAcademicData.rank_position ?? 0);
    const total = Number(currentAcademicData.totalStudents ?? currentAcademicData.rank_total ?? 0);
    if (!pos || !total) {
      const raw = currentAcademicData.rank;
      if (raw && typeof raw === 'string' && raw.toLowerCase().includes('n/a')) return raw;
      if (raw) return raw;
      return '—';
    }
    return `${pos} / ${total}`;
  })();
  const attendancePct = Number(currentAttendanceData.percentage ?? currentAttendanceData.attendancePercentage ?? 0);
  const hasAttendanceData =
    Number(currentAttendanceData.present ?? 0) > 0 ||
    Number(currentAttendanceData.absent ?? 0) > 0 ||
    Number(currentAttendanceData.late ?? 0) > 0 ||
    (Array.isArray(currentAttendanceData.monthlyAttendance) && currentAttendanceData.monthlyAttendance.length > 0);
  const feeBalance = Number(currentFeeData.balance ?? currentFeeData.due ?? currentFeeData.pending_amount ?? 0);
  const feeCurrency = String(currentFeeData.currency || currency || 'USD').toUpperCase();
  const hasFeeData = feeBalance !== 0 || Number(currentFeeData.total_fees ?? currentFeeData.totalFee ?? 0) > 0;
  const academicPct = Number(currentAcademicData.overallPercentage ?? ((Number(currentAcademicData.overallGPA ?? 0) * 25) || 0));
  const hasAcademicData =
    academicPct > 0 ||
    (Array.isArray(currentAcademicData.subjects) && currentAcademicData.subjects.length > 0) ||
    (Array.isArray(currentAcademicData.recentExams) && currentAcademicData.recentExams.length > 0);

  return (
    <Card className="glass-card overflow-hidden border border-indigo-100 sticky top-4">
      <CardHeader className="pb-2">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-md opacity-30 -z-10 scale-105" aria-hidden />
            <Avatar className="h-24 w-24 ring-2 ring-white ring-offset-2 ring-offset-indigo-50 shadow-inner bg-gradient-to-br from-indigo-500 to-purple-600">
              <AvatarImage src={resolveStudentAvatar(currentChild)} alt={currentChild.name} className="object-cover" />
              <AvatarFallback className="text-white font-semibold text-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                {currentChild.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-indigo-900">{currentChild.name}</CardTitle>
          <p className="text-sm text-indigo-700">
            {t('parent_portal.my_children.grade_class', 'Class {{grade}}', { grade: currentChild.class })}
            {currentChild.age ? ` • ${t('parent_portal.my_children.years', '{{age}} years', { age: currentChild.age })}` : ''}
          </p>
          <div className="flex items-center mt-2 flex-wrap gap-2 justify-center">
            <Badge variant="outline">
              ID: {currentChild.studentId || currentChild.admissionNumber || '—'}
            </Badge>
            <Badge variant="success">{t('parent_portal.my_children.status_active', 'Active')}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center">
            <Award className="h-4 w-4 mr-2 text-indigo-700" />
            <span className="text-sm text-indigo-900">
              {t('parent_portal.my_children.rank_out_of', 'Class Rank: {{rank}}', { rank: displayRank })}
            </span>
          </div>
          <div className="flex items-center">
            <CheckCircle className={`h-4 w-4 mr-2 ${hasAttendanceData ? 'text-indigo-700' : 'text-gray-400'}`} />
            <span className={`text-sm ${hasAttendanceData ? 'text-indigo-900' : 'text-gray-500'}`}>
              {t('parent_portal.my_children.attendance_label', 'Attendance')}:{' '}
              <span className="font-medium">{Number(attendancePct || 0).toFixed(1)}%</span>
              {!hasAttendanceData && (
                <span className="ml-2 text-[11px] text-gray-400 italic">
                  {t('parent_portal.my_children.no_attendance_yet', 'No attendance recorded yet')}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center">
            <CreditCard className={`h-4 w-4 mr-2 ${hasFeeData ? 'text-indigo-700' : 'text-gray-400'}`} />
            <span className={`text-sm ${hasFeeData ? 'text-indigo-900' : 'text-gray-500'}`}>
              {t('parent_portal.my_children.fees_balance', 'Fees Balance')}:{' '}
              <span className="font-medium">
                {formatCurrency(feeBalance, feeCurrency)}
              </span>
              {!hasFeeData && !feeBalance && (
                <span className="ml-2 text-[11px] text-gray-400 italic">
                  {t('parent_portal.my_children.no_fee_ledger_yet', 'No fee ledger entries yet')}
                </span>
              )}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-indigo-700">
              {t('parent_portal.my_children.academic_progress', 'Overall Academic Progress')}
            </h4>
            <span className="text-xs text-indigo-500/80 font-medium">
              {hasAcademicData
                ? t('parent_portal.my_children.term_cumulative', 'Term / Cumulative')
                : t('parent_portal.my_children.no_grades_yet', 'No grades yet')}
            </span>
          </div>
          <div className="flex items-center">
            <Progress
              value={Number(academicPct || 0)}
              className="flex-grow mr-4"
              aria-label={t('parent_portal.my_children.academic_progress', 'Overall Academic Progress')}
            />
            <span className="font-medium text-indigo-900 tabular-nums">
              {Number(academicPct || 0).toFixed(1)}%
            </span>
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
