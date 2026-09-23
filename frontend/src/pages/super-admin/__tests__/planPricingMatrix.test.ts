import { describe, it, expect } from 'vitest';
import { buildPricingMatrixPayload, RegionalMatrixConfig } from '../planPricingMatrix';

const placeholder = (code: string, currency: string): RegionalMatrixConfig => ({
  country_code: code,
  currency,
  tiers: [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }],
});

describe('buildPricingMatrixPayload', () => {
  it('saves a Global-only matrix and skips never-configured GH/TG placeholders', () => {
    const res = buildPricingMatrixPayload({
      GLOBAL: { country_code: 'GLOBAL', currency: 'USD', tiers: [
        { id: 11, min_students: 0, max_students: 100, price_per_student_month: 2.5, is_active: true },
        { min_students: 101, max_students: null, price_per_student_month: 2, is_active: false },
      ] },
      GH: placeholder('GH', 'GHS'),
      TG: placeholder('TG', 'XOF'),
    });
    expect(res.error).toBeNull();
    expect(res.tiers).toEqual([
      { id: 11, country_code: null, currency: 'USD', min_students: 0, max_students: 100, price_per_student_month: 2.5, is_active: true },
      { country_code: null, currency: 'USD', min_students: 101, max_students: null, price_per_student_month: 2, is_active: false },
    ]);
  });

  it('maps regional rows to their country code and currency', () => {
    const res = buildPricingMatrixPayload({
      GLOBAL: placeholder('GLOBAL', 'USD'),
      GH: { country_code: 'GH', currency: 'ghs', tiers: [{ min_students: 0, max_students: '', price_per_student_month: 30, is_active: true }] },
    });
    expect(res.tiers).toEqual([
      { country_code: 'GH', currency: 'GHS', min_students: 0, max_students: null, price_per_student_month: 30, is_active: true },
    ]);
  });

  it('reports the offending region when a configured region has an unpriced bracket', () => {
    const res = buildPricingMatrixPayload({
      GLOBAL: { country_code: 'GLOBAL', currency: 'USD', tiers: [{ id: 1, min_students: 0, max_students: null, price_per_student_month: 3, is_active: true }] },
      TG: { country_code: 'TG', currency: 'XOF', tiers: [
        { min_students: 0, max_students: 50, price_per_student_month: 500, is_active: true },
        { min_students: 51, max_students: null, price_per_student_month: 0, is_active: true },
      ] },
    });
    expect(res.tiers).toBeNull();
    expect(res.error).toEqual({ region: 'TG', message: 'TG Region: bracket 2 price per student must be greater than 0' });
  });

  it('treats a saved region whose price was cleared as an error, not as unconfigured', () => {
    const res = buildPricingMatrixPayload({
      GH: { country_code: 'GH', currency: 'GHS', tiers: [{ id: 5, min_students: 0, max_students: null, price_per_student_month: '', is_active: true }] },
    });
    expect(res.error?.region).toBe('GH');
  });

  it('rejects a non-final bracket without a valid upper bound', () => {
    const res = buildPricingMatrixPayload({
      GLOBAL: { country_code: 'GLOBAL', currency: 'USD', tiers: [
        { min_students: 0, max_students: null, price_per_student_month: 1, is_active: true },
        { min_students: 1, max_students: null, price_per_student_month: 1, is_active: true },
      ] },
    });
    expect(res.error?.message).toMatch(/bracket 1 needs an Up To Enrollment/);
  });
});
