import { CreditCard, Download, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Separator } from "../../components/ui/separator";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../lib/utils";
import { useTranslation } from "react-i18next";

// Define proper TypeScript interfaces for better type safety
interface FeeItem {
  item: string;
  amount: number;
  balance?: number;
  status?: string;
  dueDate?: string;
}

interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: string;
}

interface UpcomingPayment {
  id: string;
  dueDate: string;
  amount: number;
  description: string;
}

interface FeeData {
  currency?: string;
  breakdownItems?: FeeItem[];
  tuitionFee: number;
  transportFee: number;
  libraryFee: number;
  computerLabFee: number;
  activityFee: number;
  totalFee: number;
  paid: number;
  due: number;
  dueDate: string;
  paymentHistory: PaymentHistoryItem[];
  upcomingPayments: UpcomingPayment[];
}

interface FeesTabProps {
  currentFeeData: FeeData;
}

const FeesTab = ({ currentFeeData }: FeesTabProps) => {
  const { t } = useTranslation();
  // Handle potential undefined data to prevent errors
  if (!currentFeeData) {
    return (
      <div className="p-4 text-center">
        <p>{t('parent_portal.my_children.fee_data_unavailable', 'Fee data is not available. Please try again later.')}</p>
      </div>
    );
  }

  // Create a feeBreakdown array from the individual fee properties
  const currency = currentFeeData.currency || 'USD';
  const feeBreakdown: FeeItem[] = Array.isArray(currentFeeData.breakdownItems) && currentFeeData.breakdownItems.length > 0
    ? currentFeeData.breakdownItems
    : [
        { item: t('parent_portal.my_children.tuition_fee', 'Tuition Fee'), amount: currentFeeData.tuitionFee },
        { item: t('parent_portal.my_children.transport_fee', 'Transport Fee'), amount: currentFeeData.transportFee },
        { item: t('parent_portal.my_children.library_fee', 'Library Fee'), amount: currentFeeData.libraryFee },
        { item: t('parent_portal.my_children.computer_lab_fee', 'Computer Lab Fee'), amount: currentFeeData.computerLabFee },
        { item: t('parent_portal.my_children.activity_fee', 'Activity Fee'), amount: currentFeeData.activityFee },
      ].filter((fee) => Number(fee.amount || 0) > 0);

  const totalFeeSafe = Number.isFinite(currentFeeData.totalFee) ? Math.max(0, currentFeeData.totalFee) : 0;
  const paidSafe = Number.isFinite(currentFeeData.paid) ? Math.max(0, currentFeeData.paid) : 0;
  const dueSafe = Number.isFinite(currentFeeData.due) ? Math.max(0, currentFeeData.due) : 0;

  const paymentRatio = totalFeeSafe > 0 ? Math.min(1, paidSafe / totalFeeSafe) : 0;
  const paymentPercentage = Math.round(paymentRatio * 100);
  const dashArrayValue = paymentRatio * 251.2;

  return (
    <>
      {/* Fee summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t('parent_portal.my_children.fee_breakdown', 'Fee Breakdown')}</CardTitle>
            <CardDescription>{t('parent_portal.my_children.fee_details_desc', 'Current term fee details')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {feeBreakdown.map((fee, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-white bg-opacity-20">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-indigo-100 text-indigo-600">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-medium text-indigo-900">{fee.item}</span>
                      {fee.dueDate || fee.status ? (
                        <p className="text-xs text-indigo-700">
                          {[fee.dueDate ? `${t('common.due', 'Due')} ${fee.dueDate}` : '', fee.status ? t(`parent_portal.my_children.status_${fee.status.toLowerCase()}`, String(fee.status).replace(/_/g, ' ')) : ''].filter(Boolean).join(' • ')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                <span className="text-sm font-bold text-indigo-900">{formatCurrency(Number(fee.amount || 0), currency)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center p-3">
                <span className="text-sm font-medium text-indigo-900">{t('parent_portal.my_children.total_fees_label', 'Total Fees')}</span>
                <span className="text-sm font-bold text-indigo-900">{formatCurrency(totalFeeSafe, currency)}</span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-sm font-medium text-indigo-900">{t('parent_portal.my_children.amount_paid', 'Amount Paid')}</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(paidSafe, currency)}</span>
              </div>
              <div className="flex justify-between items-center p-3">
                <span className="text-sm font-medium text-indigo-900">{t('parent_portal.my_children.balance_due', 'Balance Due')}</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(dueSafe, currency)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full glass-button" disabled={dueSafe <= 0}>
              <CreditCard className="h-4 w-4 mr-2" />
              {t('parent_portal.my_children.pay_now', 'Pay Now')}
            </Button>
          </CardFooter>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">{t('parent_portal.my_children.payment_summary', 'Payment Summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4">
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle
                    className="text-indigo-100 stroke-current"
                    strokeWidth="10"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-indigo-600 stroke-current"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    strokeDasharray={`${dashArrayValue} 251.2`}
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-indigo-900">
                    {paymentPercentage}%
                  </span>
                  <span className="text-sm text-indigo-700">{t('parent_portal.my_children.paid_label', 'Paid')}</span>
                </div>
              </div>
              
              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">{t('parent_portal.my_children.due_date_label', 'Due Date')}:</span>
                  <span className="text-sm font-medium text-indigo-900">{currentFeeData.dueDate || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-indigo-700">{t('parent_portal.my_children.status_label', 'Status')}:</span>
                  <Badge variant={dueSafe > 0 ? "warning" : "success"}>
                    {dueSafe > 0 ? t('parent_portal.my_children.status_pending', 'Pending') : t('parent_portal.my_children.status_paid', 'Paid')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment history */}
      <Card className="glass-card mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('parent_portal.my_children.payment_history', 'Payment History')}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentFeeData.paymentHistory && currentFeeData.paymentHistory.length > 0 ? (
            <div className="space-y-4">
              {currentFeeData.paymentHistory.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white bg-opacity-20">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-green-100 text-green-600">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-indigo-900">{t('parent_portal.my_children.payment_number', 'Payment #{{id}}', { id: payment.id })}</p>
                      <p className="text-xs text-indigo-700">{payment.date} • {payment.method}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-indigo-900 mr-3">{formatCurrency(Number(payment.amount || 0), currency)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0" 
                      title={t('parent_portal.my_children.actions.download_receipt', 'Download receipt') as string}
                      onClick={() => toast.success(t('parent_portal.my_children.toast.generating_receipt', 'Receipt for payment #{{id}} is being generated', { id: payment.id }))}
                    >
                      <Download className="h-4 w-4 text-indigo-700" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-indigo-700">{t('parent_portal.my_children.no_payment_history', 'No payment history available.')}</p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming payments section */}
      {currentFeeData.upcomingPayments && currentFeeData.upcomingPayments.length > 0 && (
        <Card className="glass-card mt-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('parent_portal.my_children.upcoming_payments', 'Upcoming Payments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentFeeData.upcomingPayments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-white bg-opacity-20">
                  <div className="flex items-center">
                    <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-indigo-900">{payment.description}</p>
                      <p className="text-xs text-indigo-700">{t('common.due', 'Due')}: {payment.dueDate}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-900">{formatCurrency(Number(payment.amount || 0), currency)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default FeesTab;
