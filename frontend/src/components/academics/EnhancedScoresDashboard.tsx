import React from 'react'
import { useAdvancedSearch, FilterConfig } from '../../hooks/useAdvancedSearch'
import { AdvancedSearch } from '../ui/advanced-search'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { TrendingUp, TrendingDown, User, Award } from 'lucide-react'

interface StudentScore {
  id: string
  student_name: string
  student_id: string
  class: string
  subject: string
  exam_title: string
  score: number
  total_marks: number
  percentage: number
  grade: string
  exam_date: string
  teacher: string
  status: 'graded' | 'pending' | 'absent'
}

const scoresFilterConfigs: FilterConfig[] = [
  {
    key: 'class',
    type: 'multiselect',
    label: 'Class',
    options: [
      { label: 'Grade 1', value: 'grade-1' },
      { label: 'Grade 2', value: 'grade-2' },
      { label: 'Grade 3', value: 'grade-3' },
      { label: 'Grade 4', value: 'grade-4' },
      { label: 'Grade 5', value: 'grade-5' }
    ]
  },
  {
    key: 'subject',
    type: 'multiselect',
    label: 'Subject',
    options: [
      { label: 'Mathematics', value: 'mathematics' },
      { label: 'English', value: 'english' },
      { label: 'Science', value: 'science' },
      { label: 'History', value: 'history' },
      { label: 'Geography', value: 'geography' }
    ]
  },
  {
    key: 'grade',
    type: 'multiselect',
    label: 'Grade',
    options: [
      { label: 'A+', value: 'A+' },
      { label: 'A', value: 'A' },
      { label: 'B+', value: 'B+' },
      { label: 'B', value: 'B' },
      { label: 'C+', value: 'C+' },
      { label: 'C', value: 'C' },
      { label: 'D', value: 'D' },
      { label: 'F', value: 'F' }
    ]
  },
  {
    key: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { label: 'Graded', value: 'graded' },
      { label: 'Pending', value: 'pending' },
      { label: 'Absent', value: 'absent' }
    ]
  },
  {
    key: 'percentage',
    type: 'number',
    label: 'Min Percentage',
    placeholder: 'Enter minimum percentage...'
  },
  {
    key: 'exam_date',
    type: 'daterange',
    label: 'Exam Date Range'
  },
  {
    key: 'teacher',
    type: 'text',
    label: 'Teacher',
    placeholder: 'Search by teacher name...'
  }
]

export function EnhancedScoresDashboard() {
  // Mock data - replace with actual API call
  const mockScoresData: StudentScore[] = [
    {
      id: '1',
      student_name: 'John Doe',
      student_id: 'STU001',
      class: 'grade-5',
      subject: 'mathematics',
      exam_title: 'Mid-term Mathematics',
      score: 85,
      total_marks: 100,
      percentage: 85,
      grade: 'A',
      exam_date: '2024-01-15',
      teacher: 'Ms. Smith',
      status: 'graded'
    },
    // Add more mock data as needed
  ]
  
  const searchConfig = useAdvancedSearch<StudentScore>({
    data: mockScoresData,
    searchFields: ['student_name', 'student_id', 'exam_title', 'teacher'],
    filterConfigs: scoresFilterConfigs,
    defaultSort: { key: 'percentage', direction: 'desc' },
    enableFuzzySearch: true
  })

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': case 'A': return 'bg-green-100 text-green-800'
      case 'B+': case 'B': return 'bg-blue-100 text-blue-800'
      case 'C+': case 'C': return 'bg-yellow-100 text-yellow-800'
      case 'D': return 'bg-orange-100 text-orange-800'
      case 'F': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'absent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Scores Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline">Generate Report</Button>
          <Button>Add Scores</Button>
        </div>
      </div>

      <AdvancedSearch
        searchTerm={searchConfig.searchTerm}
        onSearchChange={searchConfig.setSearchTerm}
        filters={searchConfig.filters}
        onFilterChange={searchConfig.updateFilter}
        onClearFilter={searchConfig.clearFilter}
        onClearAll={searchConfig.clearAllFilters}
        filterConfigs={scoresFilterConfigs}
        savedFilters={searchConfig.savedFilters}
        onSaveFilter={searchConfig.saveCurrentFilter}
        onLoadFilter={searchConfig.loadSavedFilter}
        onDeleteFilter={searchConfig.deleteSavedFilter}
        hasActiveFilters={searchConfig.hasActiveFilters}
      />
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">78.5%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Top Performers</p>
                <p className="text-2xl font-bold">24</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Need Support</p>
                <p className="text-2xl font-bold">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">{searchConfig.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Scores ({searchConfig.totalItems} results)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Student</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">Subject</th>
                  <th className="text-left p-2">Exam</th>
                  <th className="text-left p-2">Score</th>
                  <th className="text-left p-2">Grade</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {searchConfig.data.map((score) => (
                  <tr key={score.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{score.student_name}</div>
                        <div className="text-sm text-gray-500">{score.student_id}</div>
                      </div>
                    </td>
                    <td className="p-2">{score.class.replace('-', ' ').toUpperCase()}</td>
                    <td className="p-2 capitalize">{score.subject}</td>
                    <td className="p-2">{score.exam_title}</td>
                    <td className="p-2">
                      <div className="font-medium">{score.score}/{score.total_marks}</div>
                      <div className="text-sm text-gray-500">{score.percentage}%</div>
                    </td>
                    <td className="p-2">
                      <Badge className={getGradeColor(score.grade)}>
                        {score.grade}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge className={getStatusColor(score.status)}>
                        {score.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {new Date(score.exam_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {searchConfig.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => searchConfig.setCurrentPage(searchConfig.currentPage - 1)}
                disabled={searchConfig.currentPage === 1}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600">
                Page {searchConfig.currentPage} of {searchConfig.totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => searchConfig.setCurrentPage(searchConfig.currentPage + 1)}
                disabled={searchConfig.currentPage === searchConfig.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}