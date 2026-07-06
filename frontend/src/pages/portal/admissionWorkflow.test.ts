import { describe, expect, it } from 'vitest';

import {
  formatAdmissionPriceLabel,
  hasMeaningfulAdmissionFormData,
  isDiscardableAdmissionStatus,
  isEditableAdmissionStatus,
} from './admissionWorkflow';

describe('admissionWorkflow', () => {
  it('treats draft, returned, and rejected applications as editable', () => {
    expect(isEditableAdmissionStatus('draft')).toBe(true);
    expect(isEditableAdmissionStatus('returned')).toBe(true);
    expect(isEditableAdmissionStatus('rejected')).toBe(false);
    expect(isEditableAdmissionStatus('submitted')).toBe(false);
  });

  it('allows parents to discard rejected shells without reopening them as editable', () => {
    expect(isDiscardableAdmissionStatus('draft')).toBe(true);
    expect(isDiscardableAdmissionStatus('returned')).toBe(true);
    expect(isDiscardableAdmissionStatus('rejected')).toBe(true);
    expect(isDiscardableAdmissionStatus('approved')).toBe(false);
  });

  it('ignores review metadata when detecting meaningful form content', () => {
    expect(hasMeaningfulAdmissionFormData({ _review: { notes: 'Fix the address' } })).toBe(false);
    expect(hasMeaningfulAdmissionFormData({ city: 'Lome', _review: { notes: 'Fix the address' } })).toBe(true);
  });

  it('formats the price with the configured currency code only', () => {
    expect(formatAdmissionPriceLabel(100, 'XOF')).toBe('XOF 100');
    expect(formatAdmissionPriceLabel(125.5, 'GHS')).toBe('GHS 125.50');
  });
});
