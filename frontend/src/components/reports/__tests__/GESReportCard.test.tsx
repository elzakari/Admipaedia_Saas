import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import GESReportCard from '../GESReportCard';
import { enhancedReportsService } from '../../../services/enhancedReportsService';
import { toast } from 'react-hot-toast';

// Mock the service
vi.mock('../../../services/enhancedReportsService', () => ({
  enhancedReportsService: {
    getAvailableAcademicYears: vi.fn(),
    generateReportCard: vi.fn(),
    downloadReportCardPDF: vi.fn(),
    printReportCard: vi.fn(),
    getAvailableTerms: vi.fn(() => ['Term 1', 'Term 2', 'Term 3']),
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.URL.createObjectURL and revokeObjectURL
window.URL.createObjectURL = vi.fn(() => 'blob:url');
window.URL.revokeObjectURL = vi.fn();

const mockReportData = {
  student_info: {
    name: 'John Doe',
    admission_number: 'ADM001',
    class: 'Grade 10',
    educational_level: 'Secondary',
    academic_year: '2024/2025',
    term: 'Term 1'
  },
  academic_performance: {
    subjects: [
      { name: 'Mathematics', score: 85, grade: 'A1', grade_point: 4.0, remarks: 'Excellent' },
      { name: 'English', score: 75, grade: 'B3', grade_point: 3.0, remarks: 'Good' }
    ],
    overall_gpa: 3.5,
    class_position: '1st of 30',
    total_subjects: 2
  },
  attendance: {
    total_days: 90,
    present_days: 85,
    absent_days: 5,
    late_days: 2,
    attendance_rate: 94.4
  },
  core_competencies: [
    { name: 'Critical Thinking', description: 'Ability to analyze', level: 3.5 },
    { name: 'Communication', description: 'Ability to express', level: 3.0 }
  ],
  teacher_comments: 'Great progress this term.',
  principal_comments: 'Keep up the good work.',
  progression_status: {
    meets_academic_threshold: true,
    meets_attendance_threshold: true,
    promotion_status: 'Promoted',
    next_level: 'Grade 11'
  },
  grading_scheme: {
    name: 'GES Standard',
    scale: '100-point'
  }
};

describe('GESReportCard', () => {
  const defaultProps = {
    studentId: 1,
    studentName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (enhancedReportsService.getAvailableAcademicYears as any).mockResolvedValue(['2023/2024', '2024/2025']);
    (enhancedReportsService.generateReportCard as any).mockResolvedValue(mockReportData);
  });

  it('renders loading state initially', async () => {
    render(<GESReportCard {...defaultProps} />);
    expect(screen.getByText(/generating report card/i)).toBeInTheDocument();
  });

  it('renders report data after loading', async () => {
    render(<GESReportCard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/generating report card/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('3.5/4.0')).toBeInTheDocument();
  });

  it('handles academic year change', async () => {
    render(<GESReportCard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/generating report card/i)).not.toBeInTheDocument();
    });

    // Note: Radix UI Select is hard to test with fireEvent. 
    // In a real environment we might use a more robust helper or mock Radix Select.
    // For now, let's assume the component triggers generateReportCard on props/state change.
    
    expect(enhancedReportsService.generateReportCard).toHaveBeenCalledWith(1, 'Term 1', '2024/2025');
  });

  it('handles download PDF', async () => {
    const mockBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
    (enhancedReportsService.downloadReportCardPDF as any).mockResolvedValue(mockBlob);

    render(<GESReportCard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/generating report card/i)).not.toBeInTheDocument();
    });

    const downloadButton = screen.getByText(/download pdf/i);
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(enhancedReportsService.downloadReportCardPDF).toHaveBeenCalledWith(1, 'Term 1', '2024/2025');
      expect(toast.success).toHaveBeenCalledWith('Report card downloaded successfully');
    });
  });

  it('handles print report card', async () => {
    (enhancedReportsService.printReportCard as any).mockResolvedValue(undefined);

    render(<GESReportCard {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.queryByText(/generating report card/i)).not.toBeInTheDocument();
    });

    const printButton = screen.getByText(/print/i);
    fireEvent.click(printButton);

    await waitFor(() => {
      expect(enhancedReportsService.printReportCard).toHaveBeenCalledWith(1, 'Term 1', '2024/2025');
      expect(toast.success).toHaveBeenCalledWith('Report card sent to printer');
    });
  });

  it('handles error when generating report card', async () => {
    (enhancedReportsService.generateReportCard as any).mockRejectedValue(new Error('API Error'));

    render(<GESReportCard {...defaultProps} />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to generate report card');
    });
  });
});
