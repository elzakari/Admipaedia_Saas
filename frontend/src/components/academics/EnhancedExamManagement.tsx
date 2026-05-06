import React from 'react'
import { useAdvancedSearch, FilterConfig } from '../../hooks/useAdvancedSearch'
import { AdvancedSearch } from '../ui/advanced-search'
import { useExams } from '../../hooks/useExams'
import { useClasses } from '../../hooks/useClasses'
import { useSubjects } from '../../hooks/useSubjects'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Calendar, Clock, Users, BookOpen } from 'lucide-react'

interface ExamRecord {
  id: string
  title: string
  subject: string
  class: string
  date: string
  duration: number
  total_marks: number
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  teacher: string
  students_count: number
  created_at: string
}

const examFilterConfigs: FilterConfig[] = [
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
    key: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { label: 'Scheduled', value: 'scheduled' },
      { label: 'Ongoing', value: 'ongoing' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' }
    ]
  },
  {
    key: 'teacher',
    type: 'text',
    label: 'Teacher',
    placeholder: 'Search by teacher name...'
  },
  {
    key: 'date',
    type: 'daterange',
    label: 'Exam Date Range'
  },
  {
    key: 'total_marks',
    type: 'number',
    label: 'Min Total Marks'
  }
]

export function EnhancedExamManagement() {
  const { data: examsData, isLoading } = useExams()
  
  const searchConfig = useAdvancedSearch<ExamRecord>({
    data: examsData || [],
    searchFields: ['title', 'subject', 'class', 'teacher'],
    filterConfigs: examFilterConfigs,
    defaultSort: { key: 'date', direction: 'asc' },
    enableFuzzySearch: true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'ongoing': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading exams...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
        <Button>Create New Exam</Button>
      </div>

      <AdvancedSearch
        searchTerm={searchConfig.searchTerm}
        onSearchChange={searchConfig.setSearchTerm}
        filters={searchConfig.filters}
        onFilterChange={searchConfig.updateFilter}
        onClearFilter={searchConfig.clearFilter}
        onClearAll={searchConfig.clearAllFilters}
        filterConfigs={examFilterConfigs}
        savedFilters={searchConfig.savedFilters}
        onSaveFilter={searchConfig.saveCurrentFilter}
        onLoadFilter={searchConfig.loadSavedFilter}
        onDeleteFilter={searchConfig.deleteSavedFilter}
        hasActiveFilters={searchConfig.hasActiveFilters}
      />
      
      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {searchConfig.data.length} of {searchConfig.totalItems} exams
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Export Results
          </Button>
          <Button variant="outline" size="sm">
            Bulk Actions
          </Button>
        </div>
      </div>

      {/* Exam Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchConfig.data.map((exam) => (
          <Card key={exam.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{exam.title}</CardTitle>
                <Badge className={getStatusColor(exam.status)}>
                  {exam.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4" />
                <span>{exam.subject}</span>
                <span className="text-gray-400">•</span>
                <span>{exam.class}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{new Date(exam.date).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{exam.duration} minutes</span>
                <span className="text-gray-400">•</span>
                <span>{exam.total_marks} marks</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{exam.students_count} students</span>
              </div>
              
              <div className="text-sm text-gray-500">
                Teacher: {exam.teacher}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {searchConfig.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-6">
          <Button
            variant="outline"
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
            onClick={() => searchConfig.setCurrentPage(searchConfig.currentPage + 1)}
            disabled={searchConfig.currentPage === searchConfig.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}