export type AdmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'discarded';

const EDITABLE_STATUSES = new Set<AdmissionStatus>(['draft', 'returned']);
const DISCARDABLE_STATUSES = new Set<AdmissionStatus>(['draft', 'returned', 'rejected']);

function hasMeaningfulValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(hasMeaningfulValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== '_review')
      .some(([, nestedValue]) => hasMeaningfulValue(nestedValue));
  }

  return value !== null && value !== undefined && value !== false;
}

export function isEditableAdmissionStatus(status?: string | null): status is AdmissionStatus {
  return EDITABLE_STATUSES.has((status || '') as AdmissionStatus);
}

export function isDiscardableAdmissionStatus(status?: string | null): status is AdmissionStatus {
  return DISCARDABLE_STATUSES.has((status || '') as AdmissionStatus);
}

export function hasMeaningfulAdmissionFormData(formData: unknown): boolean {
  return hasMeaningfulValue(formData);
}

export function formatAdmissionPriceLabel(amount: number, currency?: string | null): string {
  const resolvedCurrency = (currency || 'GHS').trim().toUpperCase();
  const normalizedAmount = Number(amount || 0);

  const formattedAmount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: Number.isInteger(normalizedAmount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(normalizedAmount);

  return `${resolvedCurrency} ${formattedAmount}`;
}
