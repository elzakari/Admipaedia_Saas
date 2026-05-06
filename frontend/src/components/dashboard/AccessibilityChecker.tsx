import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Eye, 
  Keyboard, 
  MousePointer, 
  Volume2, 
  Palette, 
  Type,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'keyboard' | 'color' | 'text' | 'aria' | 'structure' | 'focus';
  title: string;
  description: string;
  element?: HTMLElement;
  selector?: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  wcagCriterion: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  suggestion: string;
}

interface AccessibilityReport {
  score: number;
  totalIssues: number;
  criticalIssues: number;
  issues: AccessibilityIssue[];
  timestamp: Date;
}

interface AccessibilityCheckerProps {
  className?: string;
  autoCheck?: boolean;
  targetElement?: HTMLElement;
}

const AccessibilityChecker: React.FC<AccessibilityCheckerProps> = ({
  className = '',
  autoCheck = false,
  targetElement
}) => {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Color contrast checker
  const checkColorContrast = useCallback((element: HTMLElement): AccessibilityIssue[] => {
    const issues: AccessibilityIssue[] = [];
    const computedStyle = window.getComputedStyle(element);
    const backgroundColor = computedStyle.backgroundColor;
    const color = computedStyle.color;
    const fontSize = parseFloat(computedStyle.fontSize);

    // Simple contrast ratio calculation (simplified)
    const getLuminance = (rgb: string) => {
      const match = rgb.match(/\d+/g);
      if (!match || match.length < 3) return 0;
      const r = Number(match[0]);
      const g = Number(match[1]);
      const b = Number(match[2]);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };

    const bgLuminance = getLuminance(backgroundColor);
    const textLuminance = getLuminance(color);
    const contrastRatio = (Math.max(bgLuminance, textLuminance) + 0.05) / 
                         (Math.min(bgLuminance, textLuminance) + 0.05);

    const isLargeText = fontSize >= 18 || (fontSize >= 14 && computedStyle.fontWeight === 'bold');
    const minRatio = isLargeText ? 3 : 4.5;

    if (contrastRatio < minRatio) {
      issues.push({
        id: `contrast-${Date.now()}-${Math.random()}`,
        type: 'error',
        category: 'color',
        title: 'Insufficient Color Contrast',
        description: `Contrast ratio of ${contrastRatio.toFixed(2)}:1 is below the minimum requirement of ${minRatio}:1`,
        element,
        selector: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : ''),
        wcagLevel: 'AA',
        wcagCriterion: '1.4.3 Contrast (Minimum)',
        impact: 'serious',
        suggestion: 'Increase the contrast between text and background colors'
      });
    }

    return issues;
  }, []);

  // Keyboard navigation checker
  const checkKeyboardNavigation = useCallback((): AccessibilityIssue[] => {
    const issues: AccessibilityIssue[] = [];
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [tabindex], [role="button"], [role="link"]'
    );

    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const tabIndex = htmlElement.tabIndex;
      const isVisible = htmlElement.offsetParent !== null;

      // Check for positive tabindex (anti-pattern)
      if (tabIndex > 0) {
        issues.push({
          id: `tabindex-${Date.now()}-${Math.random()}`,
          type: 'warning',
          category: 'keyboard',
          title: 'Positive tabindex Found',
          description: 'Positive tabindex values can create confusing navigation order',
          element: htmlElement,
          selector: htmlElement.tagName.toLowerCase() + (htmlElement.id ? `#${htmlElement.id}` : ''),
          wcagLevel: 'A',
          wcagCriterion: '2.4.3 Focus Order',
          impact: 'moderate',
          suggestion: 'Use tabindex="0" or rely on natural DOM order instead'
        });
      }

      // Check for missing focus indicators
      if (isVisible && tabIndex !== -1) {
        const computedStyle = window.getComputedStyle(htmlElement, ':focus');
        const outline = computedStyle.outline;
        const boxShadow = computedStyle.boxShadow;
        
        if (outline === 'none' && boxShadow === 'none') {
          issues.push({
            id: `focus-${Date.now()}-${Math.random()}`,
            type: 'error',
            category: 'focus',
            title: 'Missing Focus Indicator',
            description: 'Interactive element lacks visible focus indicator',
            element: htmlElement,
            selector: htmlElement.tagName.toLowerCase() + (htmlElement.id ? `#${htmlElement.id}` : ''),
            wcagLevel: 'AA',
            wcagCriterion: '2.4.7 Focus Visible',
            impact: 'serious',
            suggestion: 'Add visible focus styles using CSS :focus pseudo-class'
          });
        }
      }
    });

    return issues;
  }, []);

  // ARIA attributes checker
  const checkAriaAttributes = useCallback((): AccessibilityIssue[] => {
    const issues: AccessibilityIssue[] = [];
    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]');

    elementsWithAria.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const ariaLabel = htmlElement.getAttribute('aria-label');
      const ariaLabelledby = htmlElement.getAttribute('aria-labelledby');
      const role = htmlElement.getAttribute('role');

      // Check for empty aria-label
      if (ariaLabel === '') {
        issues.push({
          id: `aria-empty-${Date.now()}-${Math.random()}`,
          type: 'error',
          category: 'aria',
          title: 'Empty ARIA Label',
          description: 'aria-label attribute is present but empty',
          element: htmlElement,
          selector: htmlElement.tagName.toLowerCase() + (htmlElement.id ? `#${htmlElement.id}` : ''),
          wcagLevel: 'A',
          wcagCriterion: '4.1.2 Name, Role, Value',
          impact: 'serious',
          suggestion: 'Provide meaningful text for aria-label or remove the attribute'
        });
      }

      // Check for invalid aria-labelledby references
      if (ariaLabelledby) {
        const referencedElements = ariaLabelledby.split(' ').map(id => document.getElementById(id));
        if (referencedElements.some(el => !el)) {
          issues.push({
            id: `aria-labelledby-${Date.now()}-${Math.random()}`,
            type: 'error',
            category: 'aria',
            title: 'Invalid aria-labelledby Reference',
            description: 'aria-labelledby references non-existent element(s)',
            element: htmlElement,
            selector: htmlElement.tagName.toLowerCase() + (htmlElement.id ? `#${htmlElement.id}` : ''),
            wcagLevel: 'A',
            wcagCriterion: '4.1.2 Name, Role, Value',
            impact: 'serious',
            suggestion: 'Ensure all IDs referenced by aria-labelledby exist in the DOM'
          });
        }
      }

      // Check for invalid roles
      const validRoles = [
        'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell', 'checkbox',
        'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog',
        'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group',
        'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee',
        'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation',
        'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup',
        'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox',
        'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist',
        'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid',
        'treeitem'
      ];

      if (role && !validRoles.includes(role)) {
        issues.push({
          id: `invalid-role-${Date.now()}-${Math.random()}`,
          type: 'error',
          category: 'aria',
          title: 'Invalid ARIA Role',
          description: `"${role}" is not a valid ARIA role`,
          element: htmlElement,
          selector: htmlElement.tagName.toLowerCase() + (htmlElement.id ? `#${htmlElement.id}` : ''),
          wcagLevel: 'A',
          wcagCriterion: '4.1.2 Name, Role, Value',
          impact: 'serious',
          suggestion: 'Use a valid ARIA role or remove the role attribute'
        });
      }
    });

    return issues;
  }, []);

  // Text and heading structure checker
  const checkTextStructure = useCallback((): AccessibilityIssue[] => {
    const issues: AccessibilityIssue[] = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    let previousLevel = 0;
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      // Check for skipped heading levels
      if (level > previousLevel + 1) {
        issues.push({
          id: `heading-skip-${Date.now()}-${Math.random()}`,
          type: 'warning',
          category: 'structure',
          title: 'Skipped Heading Level',
          description: `Heading level ${level} follows level ${previousLevel}, skipping intermediate levels`,
          element: heading as HTMLElement,
          selector: heading.tagName.toLowerCase() + (heading.id ? `#${heading.id}` : ''),
          wcagLevel: 'AA',
          wcagCriterion: '1.3.1 Info and Relationships',
          impact: 'moderate',
          suggestion: 'Use heading levels in sequential order (h1, h2, h3, etc.)'
        });
      }
      
      previousLevel = level;
    });

    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      const role = img.getAttribute('role');
      
      if (alt === null && role !== 'presentation') {
        issues.push({
          id: `img-alt-${Date.now()}-${Math.random()}`,
          type: 'error',
          category: 'text',
          title: 'Missing Alt Text',
          description: 'Image lacks alt attribute for screen readers',
          element: img,
          selector: 'img' + (img.id ? `#${img.id}` : ''),
          wcagLevel: 'A',
          wcagCriterion: '1.1.1 Non-text Content',
          impact: 'serious',
          suggestion: 'Add descriptive alt text or use alt="" for decorative images'
        });
      }
    });

    return issues;
  }, []);

  // Run comprehensive accessibility check
  const runAccessibilityCheck = useCallback(async () => {
    setIsChecking(true);
    
    try {
      const allIssues: AccessibilityIssue[] = [];
      const targetEl = targetElement || document.body;

      // Run all checks
      const keyboardIssues = checkKeyboardNavigation();
      const ariaIssues = checkAriaAttributes();
      const textIssues = checkTextStructure();

      // Check color contrast for all text elements
      const textElements = targetEl.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label');
      const colorIssues: AccessibilityIssue[] = [];
      
      textElements.forEach((element) => {
        const issues = checkColorContrast(element as HTMLElement);
        colorIssues.push(...issues);
      });

      allIssues.push(...keyboardIssues, ...ariaIssues, ...textIssues, ...colorIssues);

      // Calculate score
      const criticalCount = allIssues.filter(issue => issue.impact === 'critical').length;
      const seriousCount = allIssues.filter(issue => issue.impact === 'serious').length;
      const moderateCount = allIssues.filter(issue => issue.impact === 'moderate').length;
      const minorCount = allIssues.filter(issue => issue.impact === 'minor').length;

      const score = Math.max(0, 100 - (criticalCount * 25 + seriousCount * 15 + moderateCount * 10 + minorCount * 5));

      const newReport: AccessibilityReport = {
        score: Math.round(score),
        totalIssues: allIssues.length,
        criticalIssues: criticalCount + seriousCount,
        issues: allIssues,
        timestamp: new Date()
      };

      setReport(newReport);
    } catch (error) {
      console.error('Accessibility check failed:', error);
    } finally {
      setIsChecking(false);
    }
  }, [targetElement, checkColorContrast, checkKeyboardNavigation, checkAriaAttributes, checkTextStructure]);

  // Auto-check on mount
  useEffect(() => {
    if (autoCheck) {
      runAccessibilityCheck();
    }
  }, [autoCheck, runAccessibilityCheck]);

  // Highlight element on hover
  const highlightElement = useCallback((element: HTMLElement | undefined) => {
    // Remove previous highlights
    document.querySelectorAll('.accessibility-highlight').forEach(el => {
      el.classList.remove('accessibility-highlight');
    });

    if (element) {
      element.classList.add('accessibility-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Export report
  const exportReport = useCallback(() => {
    if (!report) return;

    const reportData = {
      timestamp: report.timestamp.toISOString(),
      score: report.score,
      summary: {
        totalIssues: report.totalIssues,
        criticalIssues: report.criticalIssues,
        byCategory: report.issues.reduce((acc, issue) => {
          acc[issue.category] = (acc[issue.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      issues: report.issues.map(issue => ({
        type: issue.type,
        category: issue.category,
        title: issue.title,
        description: issue.description,
        wcagLevel: issue.wcagLevel,
        wcagCriterion: issue.wcagCriterion,
        impact: issue.impact,
        suggestion: issue.suggestion,
        selector: issue.selector
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'serious': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'minor': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'keyboard': return Keyboard;
      case 'color': return Palette;
      case 'text': return Type;
      case 'aria': return Volume2;
      case 'structure': return Eye;
      case 'focus': return MousePointer;
      default: return AlertTriangle;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Accessibility Checker
            {report && (
              <Badge variant="outline" className={getScoreColor(report.score)}>
                Score: {report.score}/100
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={runAccessibilityCheck}
              disabled={isChecking}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Run Check'}
            </Button>
            
            {report && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!report && !isChecking && (
          <div className="text-center py-8">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Run an accessibility check to see results</p>
          </div>
        )}

        {isChecking && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Analyzing accessibility...</p>
          </div>
        )}

        {report && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="issues">Issues ({report.totalIssues})</TabsTrigger>
              <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Score Overview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Accessibility Score</span>
                  <span className={`text-lg font-bold ${getScoreColor(report.score)}`}>
                    {report.score}/100
                  </span>
                </div>
                <Progress value={report.score} className="h-2" />
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-2xl font-bold text-gray-900">{report.totalIssues}</div>
                  <div className="text-sm text-gray-600">Total Issues</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-red-600">{report.criticalIssues}</div>
                  <div className="text-sm text-gray-600">Critical/Serious</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {report.issues.filter(i => i.wcagLevel === 'AA').length}
                  </div>
                  <div className="text-sm text-gray-600">WCAG AA</div>
                </Card>
                <Card className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {report.issues.filter(i => i.wcagLevel === 'A').length}
                  </div>
                  <div className="text-sm text-gray-600">WCAG A</div>
                </Card>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Issues by Category</h3>
                {Object.entries(
                  report.issues.reduce((acc, issue) => {
                    acc[issue.category] = (acc[issue.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([category, count]) => {
                  const Icon = getCategoryIcon(category);
                  return (
                    <div key={category} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{category}</span>
                      </div>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <AnimatePresence>
                {report.issues.map((issue) => {
                  const Icon = getCategoryIcon(issue.category);
                  return (
                    <motion.div
                      key={issue.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card 
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${getImpactColor(issue.impact)}`}
                        onClick={() => {
                          setSelectedIssue(selectedIssue?.id === issue.id ? null : issue);
                          if (issue.element) highlightElement(issue.element);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Icon className="h-5 w-5 mt-0.5" />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{issue.title}</h4>
                                  <Badge variant="outline" className="text-xs">
                                    {issue.wcagLevel}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {issue.impact}
                                  </Badge>
                                </div>
                                <p className="text-sm text-gray-600">{issue.description}</p>
                                {issue.selector && (
                                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                    {issue.selector}
                                  </code>
                                )}
                              </div>
                            </div>
                            {issue.element && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  highlightElement(issue.element);
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {selectedIssue?.id === issue.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t space-y-2"
                            >
                              <div>
                                <strong>WCAG Criterion:</strong> {issue.wcagCriterion}
                              </div>
                              <div>
                                <strong>Suggestion:</strong> {issue.suggestion}
                              </div>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {report.issues.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-green-600 font-medium">No accessibility issues found!</p>
                  <p className="text-gray-600">Your page meets basic accessibility standards.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="guidelines" className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">WCAG 2.1 Guidelines</h3>
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Level A (Minimum):</strong> Basic accessibility features that must be present.
                        Includes alt text for images, keyboard navigation, and proper heading structure.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Level AA (Standard):</strong> Enhanced accessibility that covers most barriers.
                        Includes color contrast ratios, focus indicators, and error identification.
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <Eye className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Level AAA (Enhanced):</strong> Highest level of accessibility.
                        Includes advanced color contrast and comprehensive keyboard support.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Quick Fixes</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Add alt attributes to all images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Ensure proper heading hierarchy (h1 → h2 → h3)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Add focus styles to interactive elements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Use sufficient color contrast (4.5:1 for normal text)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Provide meaningful ARIA labels</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* Add CSS for highlighting */}
      <style>{`
        .accessibility-highlight {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 2px !important;
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
      `}</style>
    </Card>
  );
};

export default AccessibilityChecker;