import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Download, 
  Calendar, 
  Filter, 
  Printer, 
  BarChart2, 
  PieChart as PieChartIcon, 
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription } from "../ui/alert";
import libraryService from '../../services/libraryService';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FCCDE5'];

const LibraryReports: React.FC = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState<string>('year');
  const [reportType, setReportType] = useState<string>('borrowing');
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Fetch borrowing activity data
  const { data: borrowingData, isLoading: borrowingLoading, error: borrowingError } = useQuery({
    queryKey: ['library-borrowing-activity', timeRange],
    queryFn: () => libraryService.getBorrowingActivity(timeRange),
    enabled: reportType === 'borrowing'
  });

  // Fetch category distribution data
  const { data: categoryData, isLoading: categoryLoading, error: categoryError } = useQuery({
    queryKey: ['library-category-distribution'],
    queryFn: () => libraryService.getCategoryDistribution(),
    enabled: reportType === 'categories'
  });

  // Fetch borrower type distribution data
  const { data: borrowerTypeData, isLoading: borrowerTypeLoading, error: borrowerTypeError } = useQuery({
    queryKey: ['library-borrower-types', timeRange],
    queryFn: () => libraryService.getBorrowerTypeDistribution(timeRange),
    enabled: reportType === 'borrowers'
  });

  // Fetch popular books data
  const { data: popularBooksData, isLoading: popularBooksLoading, error: popularBooksError } = useQuery({
    queryKey: ['library-popular-books', timeRange],
    queryFn: () => libraryService.getPopularBooks(5),
    enabled: reportType === 'popular'
  });

  // Fetch overdue trends data
  const { data: overdueData, isLoading: overdueLoading, error: overdueError } = useQuery({
    queryKey: ['library-overdue-trends', timeRange],
    queryFn: () => libraryService.getOverdueTrends(timeRange),
    enabled: reportType === 'overdue'
  });

  // Fetch library statistics
  const { data: libraryStats, isLoading: statsLoading } = useQuery({
    queryKey: ['library-statistics', timeRange],
    queryFn: () => libraryService.getLibraryStats(timeRange)
  });

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      setIsExporting(true);
      const blob = await libraryService.exportReport(reportType, format, { timeRange });
      const extension = format === 'excel' ? 'csv' : format;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `library-${reportType}-${timeRange}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t('admin_library.report_exported', 'Library report exported'));
    } catch (error) {
      toast.error(t('admin_library.failed_export_report', 'Failed to export report'));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle print
  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const html = await libraryService.printReport(reportType, { timeRange });
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) throw new Error('Popup blocked');
      w.document.open();
      w.document.write(`${html}<script>window.print();</script>`);
      w.document.close();
      toast.success(t('admin_library.print_dialog_opened', 'Print dialog opened'));
    } catch (error) {
      toast.error(t('admin_library.failed_print_report', 'Failed to print report'));
    } finally {
      setIsPrinting(false);
    }
  };

  React.useEffect(() => {
    const handler = () => {
      handleExport('csv');
    };
    window.addEventListener('library:exportReport', handler);
    return () => window.removeEventListener('library:exportReport', handler);
  }, [reportType, timeRange, borrowingData, categoryData, borrowerTypeData, popularBooksData, overdueData]);

  // Loading component
  const LoadingSkeleton = () => (
    <div className="h-80 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  // Error component
  const ErrorAlert = ({ error }: { error: any }) => (
    <Alert variant="destructive">
      <AlertDescription>
        {t('admin_library.failed_load_report_data', 'Failed to load report data: {{message}}', { message: error?.message || 'Unknown error' })}
      </AlertDescription>
    </Alert>
  );
  
  return (
    <div className="space-y-4">
      {/* Report Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center">
                <Filter className="mr-2 h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{t('admin_library.report_options', 'Report Options:')}</span>
              </div>
              
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('admin_library.report_type', 'Report Type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrowing">{t('admin_library.borrowing_activity', 'Borrowing Activity')}</SelectItem>
                  <SelectItem value="categories">{t('admin_library.category_distribution', 'Category Distribution')}</SelectItem>
                  <SelectItem value="borrowers">{t('admin_library.borrower_types', 'Borrower Types')}</SelectItem>
                  <SelectItem value="popular">{t('admin_library.popular_books', 'Popular Books')}</SelectItem>
                  <SelectItem value="overdue">{t('admin_library.overdue_trends', 'Overdue Trends')}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('admin_library.time_range', 'Time Range')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">{t('admin_library.this_month', 'This Month')}</SelectItem>
                  <SelectItem value="quarter">{t('admin_library.this_quarter', 'This Quarter')}</SelectItem>
                  <SelectItem value="year">{t('admin_library.this_year', 'This Year')}</SelectItem>
                  <SelectItem value="all">{t('admin_library.all_time', 'All Time')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handlePrint}
                disabled={isPrinting}
              >
                {isPrinting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="mr-2 h-4 w-4" />
                )}
                {t('admin_library.print', 'Print')}
              </Button>
              <Select onValueChange={(format) => handleExport(format as 'pdf' | 'excel' | 'csv')}>
                <SelectTrigger className="w-[120px]" disabled={isExporting}>
                  <SelectValue placeholder={t('admin_library.export', 'Export')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">{t('admin_library.export_pdf', 'Export PDF')}</SelectItem>
                  <SelectItem value="excel">{t('admin_library.export_excel', 'Export Excel')}</SelectItem>
                  <SelectItem value="csv">{t('admin_library.export_csv', 'Export CSV')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Borrowing Activity Report */}
      {reportType === 'borrowing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="mr-2 h-5 w-5 text-primary" />
              {t('admin_library.borrowing_activity', 'Borrowing Activity')}
            </CardTitle>
            <CardDescription>
              {t('admin_library.borrowing_desc_time', 'Monthly borrowing and return trends for {{time}}', {
                time: timeRange === 'year' 
                  ? t('admin_library.this_year_lower', 'this year') 
                  : timeRange === 'quarter' 
                    ? t('admin_library.this_quarter_lower', 'this quarter') 
                    : timeRange === 'month' 
                      ? t('admin_library.this_month_lower', 'this month') 
                      : t('admin_library.all_time_lower', 'all time')
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {borrowingLoading ? (
              <LoadingSkeleton />
            ) : borrowingError ? (
              <ErrorAlert error={borrowingError} />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={borrowingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="borrowed" fill="#8884d8" name={t('admin_library.borrowed', 'Borrowed')} />
                    <Bar dataKey="returned" fill="#82ca9d" name={t('admin_library.returned', 'Returned')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('admin_library.total_borrowed', 'Total Borrowed')}</p>
                    <h3 className="text-2xl font-bold">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        libraryStats?.totalBorrowed || 0
                      )}
                    </h3>
                  </div>
                  <div className="p-2 bg-green-100 rounded-full">
                    <BarChart2 className="h-6 w-6 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('admin_library.currently_out', 'Currently Out')}</p>
                    <h3 className="text-2xl font-bold">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        libraryStats?.currentlyOut || 0
                      )}
                    </h3>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <BarChart2 className="h-6 w-6 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('admin_library.digital_resources_stat', 'Digital Resources')}</p>
                    <h3 className="text-2xl font-bold">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        libraryStats?.digitalResources || 0
                      )}
                    </h3>
                  </div>
                  <div className="p-2 bg-sky-100 rounded-full">
                    <Download className="h-6 w-6 text-sky-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardFooter>
        </Card>
      )}
      
      {/* Category Distribution Report */}
      {reportType === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
              {t('admin_library.book_category_distribution', 'Book Category Distribution')}
            </CardTitle>
            <CardDescription>
              {t('admin_library.category_distribution_desc', 'Distribution of books by category in the library')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <LoadingSkeleton />
            ) : categoryError ? (
              <ErrorAlert error={categoryError} />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} ${t('admin_library.books', 'books')}`, t('admin_library.count', 'Count')]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{t('admin_library.category_breakdown', 'Category Breakdown')}</h3>
                  <ul className="space-y-2">
                    {categoryData?.slice(0, 4).map((category, index) => (
                      <li key={category.name} className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></span>
                          {category.name}
                        </span>
                        <span className="font-medium">{t('admin_library.books_count', '{{count}} books', { count: category.value })}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{t('admin_library.category_insights', 'Category Insights')}</h3>
                  <p className="text-sm text-gray-600">
                    {categoryData && categoryData.length > 0 ? (
                      t('admin_library.category_insights_most_popular', '{{category}} is the most popular category, making up {{percent}}% of the library collection.', {
                        category: categoryData[0].name,
                        percent: Math.round((categoryData[0].value / categoryData.reduce((sum, cat) => sum + cat.value, 0)) * 100)
                      })
                    ) : (
                      t('admin_library.loading_category_insights', 'Loading category insights...')
                    )}
                  </p>
                  {categoryData && categoryData.length > 2 && (
                    <p className="text-sm text-gray-600 mt-2">
                      {t('admin_library.category_insights_following', '{{cat1}} and {{cat2}} follow as the second and third most common categories.', {
                        cat1: categoryData[1].name,
                        cat2: categoryData[2].name
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardFooter>
        </Card>
      )}
      
      {/* Borrower Types Report */}
      {reportType === 'borrowers' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
              {t('admin_library.borrower_type_distribution', 'Borrower Type Distribution')}
            </CardTitle>
            <CardDescription>
              {t('admin_library.borrowings_by_user_desc', 'Distribution of borrowings by user type')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {borrowerTypeLoading ? (
              <LoadingSkeleton />
            ) : borrowerTypeError ? (
              <ErrorAlert error={borrowerTypeError} />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={borrowerTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {borrowerTypeData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, t('admin_library.percentage', 'Percentage')]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              {borrowerTypeData?.map((type, index) => (
                <Card key={type.name}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('admin_library.borrowings_type_label', '{{type}} Borrowings', { type: type.name })}</p>
                      <h3 className="text-2xl font-bold">{type.value}%</h3>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-full">
                      <div 
                        className="h-6 w-6 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardFooter>
        </Card>
      )}
      
      {/* Popular Books Report */}
      {reportType === 'popular' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart2 className="mr-2 h-5 w-5 text-primary" />
              {t('admin_library.popular_books_title', 'Most Popular Books')}
            </CardTitle>
            <CardDescription>
              {t('admin_library.popular_books_desc', 'Books with the highest number of borrowings')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {popularBooksLoading ? (
              <LoadingSkeleton />
            ) : popularBooksError ? (
              <ErrorAlert error={popularBooksError} />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={popularBooksData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="borrows" fill="#8884d8" name={t('admin_library.borrows_count_label', 'Number of Borrows')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="w-full">
              <h3 className="text-lg font-semibold mb-2">{t('admin_library.popularity_insights', 'Popularity Insights')}</h3>
              {popularBooksData && popularBooksData.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600">
                    {t('admin_library.popular_book_insight_1', '\"{{title}}\" is the most popular book with {{count}} borrows', { title: popularBooksData[0].name, count: popularBooksData[0].borrows })}
                    {popularBooksData.length > 1 && t('admin_library.popular_book_insight_2', ', followed by \"{{title}}\" with {{count}} borrows', { title: popularBooksData[1].name, count: popularBooksData[1].borrows })}.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {t('admin_library.popular_books_recommendation', 'Consider acquiring additional copies of these popular titles to meet demand.')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">{t('admin_library.loading_popularity_insights', 'Loading popularity insights...')}</p>
              )}
            </div>
          </CardFooter>
        </Card>
      )}
      
      {/* Overdue Trends Report */}
      {reportType === 'overdue' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-primary" />
              {t('admin_library.overdue_books_trends', 'Overdue Books Trends')}
            </CardTitle>
            <CardDescription>
              {t('admin_library.overdue_trends_desc', 'Monthly trends of overdue books')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueLoading ? (
              <LoadingSkeleton />
            ) : overdueError ? (
              <ErrorAlert error={overdueError} />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overdueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      name={t('admin_library.overdue_books', 'Overdue Books')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('admin_library.currently_overdue', 'Currently Overdue')}</p>
                    <h3 className="text-2xl font-bold">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        libraryStats?.totalOverdue || 0
                      )}
                    </h3>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Calendar className="h-6 w-6 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('admin_library.total_fines', 'Total Fines')}</p>
                    <h3 className="text-2xl font-bold">
                      {statsLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        `${Number(libraryStats?.totalFines || 0).toFixed(2)}`
                      )}
                    </h3>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-full">
                    <span className="h-6 w-6 flex items-center justify-center text-purple-600 font-bold">F</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default LibraryReports;
