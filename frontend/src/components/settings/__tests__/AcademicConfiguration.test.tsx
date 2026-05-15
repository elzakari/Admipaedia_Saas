import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AcademicConfiguration from '../AcademicConfiguration';
import { settingsService } from '../../../services';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock the service
vi.mock('../../../services', () => ({
  settingsService: {
    getAcademicConfiguration: vi.fn(),
    updateAcademicConfiguration: vi.fn(),
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('../../ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock SubjectsManagement
vi.mock('../subjects/SubjectsManagement', () => ({
  default: () => <div data-testid="subjects-management">Subjects Management Mock</div>,
}));

const mockAcademicConfiguration = {
  academicYear: '2024/2025',
  currentTerm: 'First Term',
  termStartDate: '2024-09-09',
  termEndDate: '2024-12-20',
  gradingSystem: 'GES',
  passingGrade: 50,
  maxGrade: 100,
  gradeScale: [
    { id: '1', minScore: 80, maxScore: 100, grade: 'A', description: 'Excellent', gradePoint: 4.0 }
  ],
  assessmentTypes: [
    { id: '1', name: 'Exams', weight: 40, description: 'Major examinations', isActive: true }
  ],
  assessmentWeights: {
    exams: 40,
    assignments: 20,
    quizzes: 15,
    projects: 15,
    classParticipation: 10,
    attendance: 0
  },
  maxStudentsPerClass: 40,
  minStudentsPerClass: 15,
  classDuration: 60,
  breakDuration: 15,
  coreSubjects: ['Math'],
  electiveSubjects: ['Physics'],
  attendanceRequired: true,
  minimumAttendance: 75,
  onlineExamsEnabled: true,
  gradeModeration: true,
  parentPortalGrades: true,
  transcriptGeneration: true
};

describe('AcademicConfiguration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    (settingsService.getAcademicConfiguration as any).mockResolvedValue(mockAcademicConfiguration);
    (settingsService.updateAcademicConfiguration as any).mockResolvedValue({ success: true });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {ui}
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    (settingsService.getAcademicConfiguration as any).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AcademicConfiguration />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders tabs and initial data correctly', async () => {
    renderWithProviders(<AcademicConfiguration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Academic Year/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Grading System/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Assessment/i })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Academic Year/i, { selector: 'input' })).toHaveValue('2024/2025');
  });

  it('handles tab switching', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AcademicConfiguration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Academic Year/i })).toBeInTheDocument();
    });

    const gradingTab = screen.getByRole('tab', { name: /Grading System/i });
    await user.click(gradingTab);

    expect(screen.getByText('Grade Scale')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('handles assessment weight changes and validation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AcademicConfiguration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Assessment/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Assessment/i }));

    const examsWeightInput = screen.getByLabelText(/Exams/i);
    await user.clear(examsWeightInput);
    await user.type(examsWeightInput, '50');

    // Total weight is now 110% (40->50 + 20 + 15 + 15 + 10)
    // Try to save
    const saveButton = screen.getAllByText('Save Changes')[0];
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Validation Error',
        description: expect.stringContaining('110%')
      }));
      expect(settingsService.updateAcademicConfiguration).not.toHaveBeenCalled();
    });
  });

  it('handles grade editing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AcademicConfiguration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Grading System/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Grading System/i }));

    // Find the edit button for the first grade (id: '1')
    const editButton = screen.getByTestId('edit-grade-1');
    await user.click(editButton);

    // After clicking edit, an input should appear
    const gradeInput = screen.getByDisplayValue('A');
    await user.clear(gradeInput);
    await user.type(gradeInput, 'A+');

    const saveGradeButton = screen.getByTestId('save-grade-1');
    await user.click(saveGradeButton);

    expect(screen.getByText('A+')).toBeInTheDocument();
  });

  it('renders subjects management tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AcademicConfiguration />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Subjects/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /Subjects/i }));

    expect(screen.getByTestId('subjects-management')).toBeInTheDocument();
  });
});
