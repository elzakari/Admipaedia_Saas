import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Eye,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorBoundary } from 'react-error-boundary';

// Import our enhanced components
import StatisticsGrid from './StatisticsGrid';
import EnhancedDashboardFilters from './EnhancedDashboardFilters';
import PerformanceMonitor from './PerformanceMonitor';

// Simple error fallback component
const ErrorFallback = ({ error }: { error: Error }) => (
  <div className="text-red-500 p-4 border border-red-200 rounded">
    <h3 className="font-semibold">Something went wrong:</h3>
    <p className="text-sm mt-1">{error.message}</p>
  </div>
);

// Create a testable ErrorBoundary component
const TestableErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    {children}
  </ErrorBoundary>
);

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number | undefined;
  error?: string | undefined;
  details?: string | undefined;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TestResult[];
  component?: React.ComponentType<any>;
}

const DashboardTester: React.FC = () => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});

  // Initialize test suites
  useEffect(() => {
    const suites: TestSuite[] = [
      {
        id: 'statistics-grid',
        name: 'Statistics Grid',
        description: 'Test enhanced statistics grid with accessibility and error handling',
        component: StatisticsGrid,
        tests: [
          {
            id: 'accessibility-test',
            name: 'Accessibility Compliance',
            status: 'pending'
          },
          {
            id: 'error-handling-test',
            name: 'Error Handling',
            status: 'pending'
          },
          {
            id: 'loading-states-test',
            name: 'Loading States',
            status: 'pending'
          },
          {
            id: 'keyboard-navigation-test',
            name: 'Keyboard Navigation',
            status: 'pending'
          },
          {
            id: 'screen-reader-test',
            name: 'Screen Reader Support',
            status: 'pending'
          }
        ]
      },
      {
        id: 'dashboard-filters',
        name: 'Dashboard Filters',
        description: 'Test advanced filtering and export functionality',
        component: EnhancedDashboardFilters,
        tests: [
          {
            id: 'filter-functionality-test',
            name: 'Filter Functionality',
            status: 'pending'
          },
          {
            id: 'preset-management-test',
            name: 'Preset Management',
            status: 'pending'
          },
          {
            id: 'export-functionality-test',
            name: 'Export Functionality',
            status: 'pending'
          },
          {
            id: 'responsive-design-test',
            name: 'Responsive Design',
            status: 'pending'
          }
        ]
      },
      {
        id: 'error-boundary',
        name: 'Error Boundary',
        description: 'Test comprehensive error handling and recovery',
        component: TestableErrorBoundary,
        tests: [
          {
            id: 'error-catching-test',
            name: 'Error Catching',
            status: 'pending'
          },
          {
            id: 'error-reporting-test',
            name: 'Error Reporting',
            status: 'pending'
          },
          {
            id: 'recovery-mechanism-test',
            name: 'Recovery Mechanism',
            status: 'pending'
          },
          {
            id: 'user-feedback-test',
            name: 'User Feedback',
            status: 'pending'
          }
        ]
      },
      {
        id: 'performance-monitor',
        name: 'Performance Monitor',
        description: 'Test real-time performance tracking and metrics',
        component: PerformanceMonitor,
        tests: [
          {
            id: 'metrics-collection-test',
            name: 'Metrics Collection',
            status: 'pending'
          },
          {
            id: 'real-time-updates-test',
            name: 'Real-time Updates',
            status: 'pending'
          },
          {
            id: 'trend-analysis-test',
            name: 'Trend Analysis',
            status: 'pending'
          },
          {
            id: 'performance-scoring-test',
            name: 'Performance Scoring',
            status: 'pending'
          }
        ]
      }
    ];

    setTestSuites(suites);
    
    // Initialize test results
    const initialResults: Record<string, TestResult[]> = {};
    suites.forEach(suite => {
      initialResults[suite.id] = suite.tests;
    });
    setTestResults(initialResults);
  }, []);

  // Simulate test execution
  const runTest = useCallback(async (suiteId: string, testId: string): Promise<TestResult> => {
    const startTime = Date.now();
    
    // Simulate test execution time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    const duration = Date.now() - startTime;
    
    // Simulate test results (90% pass rate)
    const passed = Math.random() > 0.1;
    
    const testName = testResults[suiteId]?.find((t: TestResult) => t.id === testId)?.name || testId;
    
    return {
      id: testId,
      name: testName,
      status: passed ? 'passed' : 'failed',
      duration,
      error: passed ? undefined : 'Simulated test failure',
      details: passed ? 'Test completed successfully' : 'This is a simulated test failure for demonstration purposes'
    };
  }, [testResults]);

  // Run all tests in a suite
  const runSuiteTests = useCallback(async (suiteId: string) => {
    const suite = testSuites.find((s: TestSuite) => s.id === suiteId);
    if (!suite) return;

    setIsRunning(true);
    
    for (const test of suite.tests) {
      setCurrentTest(`${suiteId}-${test.id}`);
      
      // Update test status to running
      setTestResults((prev: Record<string, TestResult[]>) => ({
        ...prev,
        [suiteId]: prev[suiteId]?.map((t: TestResult) => 
          t.id === test.id ? { ...t, status: 'running' as const } : t
        ) || []
      }));

      const result = await runTest(suiteId, test.id);
      
      // Update test results
      setTestResults((prev: Record<string, TestResult[]>) => ({
        ...prev,
        [suiteId]: prev[suiteId]?.map((t: TestResult) => 
          t.id === test.id ? result : t
        ) || []
      }));
    }
    
    setCurrentTest(null);
    setIsRunning(false);
  }, [testSuites, runTest]);

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    
    for (const suite of testSuites) {
      await runSuiteTests(suite.id);
    }
    
    setIsRunning(false);
  }, [testSuites, runSuiteTests]);

  // Reset all tests
  const resetTests = useCallback(() => {
    const resetResults: Record<string, TestResult[]> = {};
    testSuites.forEach(suite => {
      resetResults[suite.id] = suite.tests.map(test => ({
        ...test,
        status: 'pending',
        duration: undefined,
        error: undefined,
        details: undefined
      }));
    });
    setTestResults(resetResults);
    setCurrentTest(null);
    setIsRunning(false);
  }, [testSuites]);

  // Generate test report
  const generateReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      suites: testSuites.map(suite => ({
        id: suite.id,
        name: suite.name,
        description: suite.description,
        tests: testResults[suite.id] || [],
        summary: {
          total: suite.tests.length,
          passed: (testResults[suite.id] || []).filter(t => t.status === 'passed').length,
          failed: (testResults[suite.id] || []).filter(t => t.status === 'failed').length,
          pending: (testResults[suite.id] || []).filter(t => t.status === 'pending').length
        }
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-test-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [testSuites, testResults]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    const allTests = Object.values(testResults).flat();
    return {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'passed').length,
      failed: allTests.filter(t => t.status === 'failed').length,
      pending: allTests.filter(t => t.status === 'pending').length,
      running: allTests.filter(t => t.status === 'running').length
    };
  }, [testResults]);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Dashboard Component Tester
              </CardTitle>
              <Badge variant="outline">
                {overallStats.passed}/{overallStats.total} Passed
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetTests}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={generateReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Report
              </Button>
              
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run All Tests
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Overall Progress */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{overallStats.passed}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{overallStats.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{overallStats.running}</div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{overallStats.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Test Suites */}
      <Tabs defaultValue={testSuites[0]?.id || 'statistics-grid'} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          {testSuites.map(suite => (
            <TabsTrigger key={suite.id} value={suite.id} className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {suite.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {testSuites.map(suite => (
          <TabsContent key={suite.id} value={suite.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{suite.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{suite.description}</p>
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => runSuiteTests(suite.id)}
                    disabled={isRunning}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Run Suite
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  <AnimatePresence>
                    {(testResults[suite.id] || []).map((test, index) => (
                      <motion.div
                        key={test.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className={`${getStatusColor(test.status)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(test.status)}
                                <div>
                                  <div className="font-medium">{test.name}</div>
                                  {test.duration && (
                                    <div className="text-sm text-gray-600">
                                      Duration: {test.duration}ms
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Badge variant="outline" className={getStatusColor(test.status)}>
                                {test.status}
                              </Badge>
                            </div>
                            
                            {test.error && (
                              <Alert className="mt-3 bg-red-50 border-red-200">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <AlertDescription className="text-red-800">
                                  <strong>Error:</strong> {test.error}
                                  {test.details && (
                                    <div className="mt-1 text-sm">{test.details}</div>
                                  )}
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {test.details && test.status === 'passed' && (
                              <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                                {test.details}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Component Preview */}
                {suite.component && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Component Preview
                    </h4>
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <ErrorBoundary
                        FallbackComponent={ErrorFallback}
                      >
                        <suite.component />
                      </ErrorBoundary>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Current Test Indicator */}
      {currentTest && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Clock className="h-4 w-4 animate-spin" />
                <span className="font-medium">Running: {currentTest}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default DashboardTester;