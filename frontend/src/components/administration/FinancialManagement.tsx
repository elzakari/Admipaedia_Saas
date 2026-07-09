import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from "../../lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  DollarSign,
  PlusCircle,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  BarChart,
  Edit,
  PieChart,
  Search,
  Loader2
} from 'lucide-react';
import financialService, {
  Budget,
  Transaction,
  FeeRecord,
  FinancialSummary
} from '../../services/financialService';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../components/ui/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DialogDescription } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';

const FinancialManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('budget');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for financial data
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);

  // Pagination states
  const [budgetPagination] = useState({ page: 1, per_page: 10 });
  const [transactionPagination] = useState({ page: 1, per_page: 10 });
  const [feePagination] = useState({ page: 1, per_page: 10 });

  // Search and filter states
  const [transactionSearch, setTransactionSearch] = useState('');
  const [budgetFilter] = useState({ academic_year: '2024' });
  const [transactionFilter] = useState<{
    type: 'income' | 'expense' | '';
    category: string;
  }>({ type: '', category: '' });

  // Form state management
  const { toast } = useToast();

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [budgetForm, setBudgetForm] = useState({ category: '', allocated_amount: '', academic_year: '2024', description: '' });
  const [transactionForm, setTransactionForm] = useState({ type: 'income' as 'income' | 'expense', amount: '', category: '', description: '', date: '' });
  const [paymentForm, setPaymentForm] = useState({ fee_record_id: 0, amount: '', payment_method: 'cash' as 'cash' | 'bank_transfer' | 'card' | 'mobile_money', reference_number: '', payment_date: '' });

  // Load data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab, budgetPagination, transactionPagination, feePagination]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'budget':
          await loadBudgets();
          await loadFinancialSummary();
          break;
        case 'transactions':
          await loadTransactions();
          await loadFinancialSummary();
          break;
        case 'fees':
          await loadFeeRecords();
          await loadFinancialSummary();
          break;
        case 'reports':
          await loadFinancialSummary();
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loadBudgets = async () => {
    const response = await financialService.getBudgets({
      ...budgetPagination,
      ...budgetFilter
    });
    setBudgets((response as any).data ?? (response as any).budgets ?? []);
  };

  const loadTransactions = async () => {
    const filters: {
      type?: 'income' | 'expense';
      category?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      per_page?: number;
    } = {
      ...transactionPagination,
      ...(transactionFilter.category ? { category: transactionFilter.category } : {}),
      ...(transactionFilter.type ? { type: transactionFilter.type } : {}),
    };

    const response = await financialService.getTransactions(filters);
    setTransactions((response as any).data ?? []);
  };

  const loadFeeRecords = async () => {
    const response = await financialService.getFeeRecords({
      ...feePagination
    });
    setFeeRecords((response as any).data ?? (response as any).fee_records ?? []);
  };

  const loadFinancialSummary = async () => {
    // Pass filters correctly: (dateFrom, dateTo, academicYear)
    const summaryResponse = await financialService.getFinancialSummary(undefined, undefined, '2024');
    // Unwrap nested backend shape if present
    const normalized = (summaryResponse as any)?.financial_summary ?? summaryResponse;
    setFinancialSummary(normalized as any);
  };

  const handleExportData = (section: 'budget' | 'transactions' | 'fees') => {
    toast({ title: 'Export started', description: `Preparing ${section} data for export`, variant: 'default' });
    setTimeout(() => {
      toast({ title: 'Export complete', description: `${section} data exported successfully`, variant: 'default' });
    }, 800);
  };

  const handleAddBudget = () => {
    setBudgetForm({ category: '', allocated_amount: '', academic_year: '2024', description: '' });
    setBudgetDialogOpen(true);
  };

  const handleAddTransaction = () => {
    const today = new Date().toISOString().slice(0, 10);
    setTransactionForm({ type: 'income', amount: '', category: '', description: '', date: today });
    setTransactionDialogOpen(true);
  };

  const handleRecordPayment = (record: any) => {
    const today = new Date().toISOString().slice(0, 10);
    setPaymentForm({ fee_record_id: record?.id || 0, amount: '', payment_method: 'cash', reference_number: '', payment_date: today });
    setPaymentDialogOpen(true);
  };

  const openFeesWorkspace = (tab: 'invoices' | 'payments' | 'templates', type?: 'create' | 'export', detail?: Record<string, any>) => {
    sessionStorage.setItem('fees:navigation-intent', JSON.stringify({
      tab,
      type,
      ...(detail || {})
    }));
    navigate('/fees');
  };

  // Calculate budget totals
  const totalBudget = budgets.reduce((total, item) => total + item.allocated_amount, 0);
  const totalSpent = budgets.reduce((total, item) => total + item.spent_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const budgetUtilizationPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Get budget status based on utilization
  const getBudgetStatus = (allocated: number, spent: number) => {
    const utilization = (spent / allocated) * 100;
    if (utilization >= 90) return 'Critical';
    if (utilization >= 75) return 'Warning';
    return 'On Track';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Error display component
  const ErrorDisplay = ({ message }: { message: string }) => (
    <div className="flex items-center justify-center p-8 text-red-600">
      <p>{message}</p>
    </div>
  );

  // Loading display component
  const LoadingDisplay = () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      <p>Loading...</p>
    </div>
  );

  // Derived summary values for display (support flat and nested shapes)
  const feeExpectedDisplay =
    (financialSummary as any)?.total_fees ??
    (((financialSummary as any)?.total_fee_collections ?? 0) +
      ((financialSummary as any)?.outstanding_fees ?? 0));
  const feeCollectedDisplay =
    (financialSummary as any)?.total_collected ??
    (financialSummary as any)?.total_fee_collections ??
    0;
  const outstandingFeesDisplay = (financialSummary as any)?.outstanding_fees ?? (feeExpectedDisplay - feeCollectedDisplay);

  return (
    <div className="space-y-6">
      <div className="px-6 py-4 bg-emerald-50/50 dark:bg-emerald-900/10 border-b border-emerald-100 dark:border-emerald-900/20">
        <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-300">Financial Management</h2>
        <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">Monitor budgets, transactions, and fee collections</p>
      </div>

      <div className="px-6 pb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-gray-100/50 dark:bg-slate-900/50 rounded-xl mb-6">
            <TabsTrigger value="budget" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-600 shadow-none transition-all">
              <PieChart className="h-4 w-4 mr-2" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="transactions" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-600 shadow-none transition-all">
              <Receipt className="h-4 w-4 mr-2" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="fees" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-600 shadow-none transition-all">
              <CreditCard className="h-4 w-4 mr-2" />
              Fees
            </TabsTrigger>
            <TabsTrigger value="reports" className="py-2.5 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-600 shadow-none transition-all">
              <BarChart className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TabsContent value="budget" className="space-y-4 focus-visible:outline-none">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">School Budget Overview</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportData('budget')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddBudget}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </div>

              {loading ? (
                <LoadingDisplay />
              ) : error ? (
                <ErrorDisplay message={error} />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mb-3">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(totalBudget)}</h3>
                          <p className="text-xs font-medium text-blue-600/70">Total Budget</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-emerald-50/50 dark:bg-emerald-900/10">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3 mb-3">
                            <TrendingDown className="h-5 w-5 text-emerald-600" />
                          </div>
                          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(totalSpent)}</h3>
                          <p className="text-xs font-medium text-emerald-600/70">Total Spent</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-amber-50/50 dark:bg-amber-900/10">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mb-3">
                            <CreditCard className="h-5 w-5 text-amber-600" />
                          </div>
                          <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(totalRemaining)}</h3>
                          <p className="text-xs font-medium text-amber-600/70">Remaining</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-purple-50/50 dark:bg-purple-900/10">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3 mb-3">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                          </div>
                          <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">{budgetUtilizationPercentage}%</h3>
                          <p className="text-xs font-medium text-purple-600/70">Utilization</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-gray-200 dark:border-slate-700 shadow-sm">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50 dark:bg-slate-900/50">
                            <TableHead>Category</TableHead>
                            <TableHead>Allocated</TableHead>
                            <TableHead>Spent</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead>Utilization</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgets.map((item) => {
                            const remaining = item.allocated_amount - item.spent_amount;
                            const utilization = Math.round((item.spent_amount / item.allocated_amount) * 100);
                            const status = getBudgetStatus(item.allocated_amount, item.spent_amount);

                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.category}</TableCell>
                                <TableCell>{formatCurrency(item.allocated_amount)}</TableCell>
                                <TableCell>{formatCurrency(item.spent_amount)}</TableCell>
                                <TableCell>{formatCurrency(remaining)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 min-w-[100px]">
                                    <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all",
                                          status === 'Critical' ? 'bg-red-500' :
                                          status === 'Warning' ? 'bg-amber-500' :
                                          'bg-emerald-500'
                                        )}
                                        style={{ width: `${Math.min(100, utilization)}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-[10px] font-medium text-gray-500">{utilization}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    status === 'Critical' ? 'destructive' :
                                    status === 'Warning' ? 'warning' :
                                    'success'
                                  } className="text-[10px] px-2 py-0">
                                    {status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                                    Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4 focus-visible:outline-none">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Financial Transactions</h3>
                <div className="flex gap-2">
                  <div className="relative w-64 hidden sm:block">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      className="pl-8 h-9 text-sm"
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExportData('transactions')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddTransaction}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New
                  </Button>
                </div>
              </div>

              {loading ? (
                <LoadingDisplay />
              ) : error ? (
                <ErrorDisplay message={error} />
              ) : (
                <Card className="border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 dark:bg-slate-900/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .filter(transaction =>
                          transaction.description.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                          transaction.category.toLowerCase().includes(transactionSearch.toLowerCase())
                        )
                        .map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="text-xs">{new Date(transaction.date).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium text-sm">{transaction.description}</TableCell>
                            <TableCell className="text-xs text-gray-500">{transaction.category}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(transaction.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={transaction.type === 'income' ? 'success' : 'secondary'} className="text-[10px] px-2 py-0">
                                {transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Receipt className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      }
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fees" className="space-y-4 focus-visible:outline-none">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Fee Collection</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openFeesWorkspace('invoices')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Open Fees Page
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportData('fees')}>
                    <Download className="mr-2 h-4 w-4" />
                    Report
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => openFeesWorkspace('payments', 'create')}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Record
                  </Button>
                </div>
              </div>

              {loading ? (
                <LoadingDisplay />
              ) : error ? (
                <ErrorDisplay message={error} />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mb-3">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(feeExpectedDisplay)}</h3>
                          <p className="text-xs font-medium text-blue-600/70">Total Expected</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-emerald-50/50 dark:bg-emerald-900/10">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-3 mb-3">
                            <CreditCard className="h-5 w-5 text-emerald-600" />
                          </div>
                          <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(feeCollectedDisplay)}</h3>
                          <p className="text-xs font-medium text-emerald-600/70">Total Collected</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-amber-50/50 dark:bg-amber-900/10">
                      <CardContent className="p-6">
                        <div className="flex flex-col items-center text-center">
                          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 mb-3">
                            <TrendingUp className="h-5 w-5 text-amber-600" />
                          </div>
                          <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(outstandingFeesDisplay)}</h3>
                          <p className="text-xs font-medium text-amber-600/70">Outstanding</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-slate-900/50">
                          <TableHead>Student</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium text-sm">
                              <div>{`${record.student?.first_name || ''} ${record.student?.last_name || ''}`.trim() || `Student ${record.student_id}`}</div>
                              <div className="text-xs text-gray-500">
                                {record.student?.admission_number || `#${record.student_id}`}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{record.academic_year}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(record.total_amount)}</TableCell>
                            <TableCell className="text-sm text-emerald-600 font-medium">{formatCurrency(record.paid_amount)}</TableCell>
                            <TableCell className="text-sm text-red-600 font-medium">{formatCurrency(record.balance)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                record.status === 'paid' ? 'success' :
                                record.status === 'partial' ? 'warning' :
                                'destructive'
                              } className="text-[10px] px-2 py-0">
                                {record.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs px-3"
                                  onClick={() => handleRecordPayment(record)}
                                >
                                  Record
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs px-3 text-indigo-600"
                                  onClick={() => openFeesWorkspace('payments', 'create', {
                                    feeRecordId: record.id,
                                    amount: record.balance > 0 ? record.balance : '',
                                  })}
                                >
                                  Open
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reports" className="focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-gray-200 dark:border-slate-700 shadow-sm">
                  <CardHeader className="pb-4 border-b border-gray-100 dark:border-slate-700">
                    <CardTitle className="text-lg">Financial Reports</CardTitle>
                    <CardDescription>Generate official school financial documents</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {[
                      { title: 'Income Statement', desc: 'Summary of income and expenses', color: 'blue' },
                      { title: 'Budget Report', desc: 'Detailed budget allocation and usage', color: 'emerald' },
                      { title: 'Fee Collection Report', desc: 'Comprehensive student payment status', color: 'amber' }
                    ].map((report, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-100 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-${report.color}-100 dark:bg-${report.color}-900/20`}>
                            <FileText className={`h-5 w-5 text-${report.color}-600`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{report.title}</h4>
                            <p className="text-xs text-gray-500">{report.desc}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => window.print()}>
                          Generate
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-gray-200 dark:border-slate-700 shadow-sm">
                  <CardHeader className="pb-4 border-b border-gray-100 dark:border-slate-700">
                    <CardTitle className="text-lg">Report Settings</CardTitle>
                    <CardDescription>Customize parameters for your reports</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-gray-400">Period</Label>
                      <Select defaultValue="jan24">
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jan24">January 2024</SelectItem>
                          <SelectItem value="dec23">December 2023</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-gray-400">Format</Label>
                      <div className="flex gap-3">
                        {['PDF', 'Excel', 'CSV'].map(fmt => (
                          <label key={fmt} className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/50 has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-200 dark:has-[:checked]:bg-indigo-900/20">
                            <input type="radio" name="format" className="sr-only" defaultChecked={fmt === 'PDF'} />
                            <span className="text-xs font-medium">{fmt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add budget item</DialogTitle>
            <DialogDescription>Create a budget allocation for the selected academic year.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input className="bg-white" value={budgetForm.category} onChange={(e) => setBudgetForm((p) => ({ ...p, category: e.target.value }))} placeholder="Operations" />
              </div>
              <div className="space-y-2">
                <Label>Academic year</Label>
                <Input className="bg-white" value={budgetForm.academic_year} onChange={(e) => setBudgetForm((p) => ({ ...p, academic_year: e.target.value }))} placeholder="2024" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allocated amount</Label>
              <Input type="number" className="bg-white" value={budgetForm.allocated_amount} onChange={(e) => setBudgetForm((p) => ({ ...p, allocated_amount: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={budgetForm.description} onChange={(e) => setBudgetForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBudgetDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                const category = budgetForm.category.trim();
                const academic_year = budgetForm.academic_year.trim();
                const allocated = Number(budgetForm.allocated_amount);
                if (!category || !academic_year || !Number.isFinite(allocated) || allocated <= 0) return;
                try {
                  await financialService.createBudget({
                    category,
                    academic_year,
                    allocated_amount: allocated,
                    ...(budgetForm.description?.trim() ? { description: budgetForm.description.trim() } : {})
                  });
                  await loadBudgets();
                  await loadFinancialSummary();
                  toast({ title: 'Budget saved', variant: 'default' });
                  setBudgetDialogOpen(false);
                } catch (e: any) {
                  toast({ title: 'Failed to save budget', description: e?.message || 'Try again', variant: 'destructive' });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transactionDialogOpen} onOpenChange={setTransactionDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New transaction</DialogTitle>
            <DialogDescription>Record an income or expense entry for financial tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={transactionForm.type} onValueChange={(v) => setTransactionForm((p) => ({ ...p, type: v as any }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">income</SelectItem>
                    <SelectItem value="expense">expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" className="bg-white" value={transactionForm.date} onChange={(e) => setTransactionForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input className="bg-white" value={transactionForm.category} onChange={(e) => setTransactionForm((p) => ({ ...p, category: e.target.value }))} placeholder="Fees" />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" className="bg-white" value={transactionForm.amount} onChange={(e) => setTransactionForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={transactionForm.description} onChange={(e) => setTransactionForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTransactionDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                const amount = Number(transactionForm.amount);
                const category = transactionForm.category.trim();
                const description = transactionForm.description.trim();
                const date = transactionForm.date;
                if (!category || !description || !date || !Number.isFinite(amount) || amount <= 0) return;
                try {
                  await financialService.createTransaction({ type: transactionForm.type, amount, category, description, date });
                  await loadTransactions();
                  await loadFinancialSummary();
                  toast({ title: 'Transaction saved', variant: 'default' });
                  setTransactionDialogOpen(false);
                } catch (e: any) {
                  toast({ title: 'Failed to save transaction', description: e?.message || 'Try again', variant: 'destructive' });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Record fee payment</DialogTitle>
            <DialogDescription>Apply a payment against the selected student fee record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment date</Label>
                <Input type="date" className="bg-white" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm((p) => ({ ...p, payment_method: v as any }))}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">cash</SelectItem>
                    <SelectItem value="bank_transfer">bank_transfer</SelectItem>
                    <SelectItem value="card">card</SelectItem>
                    <SelectItem value="mobile_money">mobile_money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" className="bg-white" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Reference</Label>
                <Input className="bg-white" value={paymentForm.reference_number} onChange={(e) => setPaymentForm((p) => ({ ...p, reference_number: e.target.value }))} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                const amount = Number(paymentForm.amount);
                if (!paymentForm.fee_record_id || !paymentForm.payment_date || !Number.isFinite(amount) || amount <= 0) return;
                try {
                  await financialService.recordPayment({
                    fee_record_id: paymentForm.fee_record_id,
                    amount,
                    payment_method: paymentForm.payment_method,
                    ...(paymentForm.reference_number?.trim() ? { reference_number: paymentForm.reference_number.trim() } : {}),
                    payment_date: paymentForm.payment_date
                  });
                  await loadFeeRecords();
                  await loadFinancialSummary();
                  toast({ title: 'Payment recorded', variant: 'default' });
                  setPaymentDialogOpen(false);
                } catch (e: any) {
                  toast({ title: 'Failed to record payment', description: e?.message || 'Try again', variant: 'destructive' });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancialManagement;
