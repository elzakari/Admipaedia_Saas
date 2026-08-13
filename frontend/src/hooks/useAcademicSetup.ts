import { useQuery } from '@tanstack/react-query';
import academicService, { CanonicalAcademicSetup } from '../services/academicService';

export function useAcademicSetup(options?: { enabled?: boolean }) {
  return useQuery<CanonicalAcademicSetup, Error>({
    queryKey: ['academic-setup'],
    queryFn: academicService.getAcademicSetup,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
    retry: 1,
    enabled: options?.enabled !== false,
  });
}

export function getDefaultAcademicYear(setup?: CanonicalAcademicSetup | null, fallback?: string): string {
  return setup?.academicYear?.name
    ?? setup?.settings?.academicYear
    ?? (setup?.settings as any)?.academic_year
    ?? (fallback ?? `${new Date().getFullYear()}/${String((new Date().getFullYear() + 1) % 100).padStart(2, '0')}`);
}

export function getDefaultTermName(setup?: CanonicalAcademicSetup | null, fallback?: string): string {
  return setup?.currentTerm?.name
    ?? setup?.settings?.currentTerm
    ?? (setup?.settings as any)?.current_term
    ?? (fallback ?? 'First Term');
}

export function getDefaultTermDates(setup?: CanonicalAcademicSetup | null): { startDate?: string; endDate?: string } {
  return {
    startDate: setup?.currentTerm?.start_date ?? setup?.settings?.termStartDate ?? (setup?.settings as any)?.term_start_date,
    endDate: setup?.currentTerm?.end_date ?? setup?.settings?.termEndDate ?? (setup?.settings as any)?.term_end_date,
  };
}
