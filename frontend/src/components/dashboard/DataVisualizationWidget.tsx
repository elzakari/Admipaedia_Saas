import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Scatter, ScatterChart, Treemap, Sankey
} from 'recharts';
import {
  TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Activity, Maximize2, Download,
  Settings, Filter, Eye, Grid, List
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DataVisualizationWidgetProps {
  data: any;
  timeRange: string;
  viewMode: 'grid' | 'list';
}

const DataVisualizationWidget: React.FC<DataVisualizationWidgetProps> = ({ data, timeRange, viewMode }) => {
  const [selectedChart, setSelectedChart] = useState<string>('performance_analysis');
  const [chartConfig, setChartConfig] = useState({
    showTrendlines: true,
    showTargets: true,
    groupBy: 'month',
    colorScheme: 'default'
  });

  const chartTypes = [
    { id: 'performance_analysis', name: 'Performance Analysis', type: 'composed', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'grade_distribution', name: 'Grade Distribution', type: 'pie', icon: <PieChartIcon className="h-4 w-4" /> },
    { id: 'attendance_trends', name: 'Attendance Trends', type: 'area', icon: <LineChartIcon className="h-4 w-4" /> },
    { id: 'subject_radar', name: 'Subject Performance Radar', type: 'radar', icon: <Activity className="h-4 w-4" /> },
    { id: 'correlation_scatter', name: 'Performance Correlation', type: 'scatter', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'progress_treemap', name: 'Progress Treemap', type: 'treemap', icon: <Grid className="h-4 w-4" /> }
  ];

  const colorSchemes = {
    default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    pastel: ['#93c5fd', '#86efac', '#fde68a', '#fca5a5', '#c4b5fd'],
    vibrant: ['#1d4ed8', '#059669', '#d97706', '#dc2626', '#7c3aed'],
    monochrome: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6']
  };

  // Advanced data processing for different chart types
  const processedData = useMemo(() => {
    const colors = colorSchemes[chartConfig.colorScheme as keyof typeof colorSchemes];
    
    return {
      performance_analysis: data.trends.performance.map((item: any, index: number) => ({
        ...item,
        efficiency: (item.average / item.target) * 100,
        trend: index > 0 ? item.average - data.trends.performance[index - 1].average : 0
      })),
      
      grade_distribution: data.distribution.grades.map((item: any, index: number) => ({
        ...item,
        fill: colors[index % colors.length]
      })),
      
      attendance_trends: data.trends.attendance.map((item: any) => ({
        ...item,
        efficiency: (item.present / (item.present + item.absent)) * 100,
        total: item.present + item.absent
      })),
      
      subject_radar: data.distribution.subjects.map((subject: any) => ({
        subject: subject.name.substring(0, 10),
        performance: subject.average,
        engagement: Math.random() * 100, // This would come from real data
        difficulty: 100 - subject.average,
        satisfaction: Math.random() * 100
      })),
      
      correlation_scatter: data.distribution.subjects.map((subject: any) => ({
        x: subject.average,
        y: subject.students,
        z: Math.random() * 50 + 10, // Class size or engagement metric
        name: subject.name
      })),
      
      progress_treemap: data.distribution.subjects.map((subject: any, index: number) => ({
        name: subject.name,
        size: subject.students,
        performance: subject.average,
        fill: colors[index % colors.length]
      }))
    };
  }, [data, chartConfig]);

  const renderChart = (chartId: string) => {
    const chartData = processedData[chartId as keyof typeof processedData];
    
    switch (chartId) {
      case 'performance_analysis':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="average" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
              {chartConfig.showTargets && (
                <Line yAxisId="left" type="monotone" dataKey="target" stroke="#ef4444" strokeDasharray="5 5" />
              )}
              <Bar yAxisId="right" dataKey="efficiency" fill="#10b981" />
              {chartConfig.showTrendlines && (
                <Line yAxisId="right" type="monotone" dataKey="trend" stroke="#f59e0b" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        );
        
      case 'grade_distribution':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ grade, percentage }) => `${grade}: ${percentage.toFixed(1)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'attendance_trends':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="present" stackId="1" stroke="#10b981" fill="#10b981" />
              <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#ef4444" />
              <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'subject_radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Performance" dataKey="performance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Radar name="Engagement" dataKey="engagement" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Radar name="Difficulty" dataKey="difficulty" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );
        
      case 'correlation_scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name="Average Grade" />
              <YAxis dataKey="y" name="Student Count" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Subjects" dataKey="z" fill="#3b82f6" />
            </ScatterChart>
          </ResponsiveContainer>
        );
        
      case 'progress_treemap':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <Treemap
              data={chartData}
              dataKey="size"
              aspectRatio={4/3}
              stroke="#fff"
              fill="#3b82f6"
            />
          </ResponsiveContainer>
        );
        
      default:
        return <div className="h-400 flex items-center justify-center text-gray-500">Chart not available</div>;
    }
  };

  const selectedChartInfo = chartTypes.find(chart => chart.id === selectedChart);

  return (
    <div className="space-y-6">
      {/* Chart Selection and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedChart} onValueChange={setSelectedChart}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chartTypes.map(chart => (
                <SelectItem key={chart.id} value={chart.id}>
                  <div className="flex items-center">
                    {chart.icon}
                    <span className="ml-2">{chart.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">{chart.type}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            value={chartConfig.colorScheme} 
            onValueChange={(value) => setChartConfig(prev => ({ ...prev, colorScheme: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="pastel">Pastel</SelectItem>
              <SelectItem value="vibrant">Vibrant</SelectItem>
              <SelectItem value="monochrome">Monochrome</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Chart Display */}
      <motion.div
        key={selectedChart}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedChartInfo?.icon}
                <CardTitle>{selectedChartInfo?.name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedChartInfo?.type}</Badge>
                <Button variant="ghost" size="sm">
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Advanced visualization with interactive controls and real-time data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderChart(selectedChart)}
          </CardContent>
        </Card>
      </motion.div>

      {/* Chart Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Chart Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showTrendlines"
                checked={chartConfig.showTrendlines}
                onChange={(e) => setChartConfig(prev => ({ ...prev, showTrendlines: e.target.checked }))}
              />
              <label htmlFor="showTrendlines" className="text-sm font-medium">Show Trendlines</label>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showTargets"
                checked={chartConfig.showTargets}
                onChange={(e) => setChartConfig(prev => ({ ...prev, showTargets: e.target.checked }))}
              />
              <label htmlFor="showTargets" className="text-sm font-medium">Show Targets</label>
            </div>
            
            <Select 
              value={chartConfig.groupBy} 
              onValueChange={(value) => setChartConfig(prev => ({ ...prev, groupBy: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Group by Day</SelectItem>
                <SelectItem value="week">Group by Week</SelectItem>
                <SelectItem value="month">Group by Month</SelectItem>
                <SelectItem value="quarter">Group by Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataVisualizationWidget;