export type MatrixTierRow = {
  id?: number;
  min_students: number;
  max_students: number | null | '';
  price_per_student_month: number | null | '';
  is_active: boolean;
};

export type RegionalMatrixConfig = {
  country_code: string;
  currency: string;
  tiers: MatrixTierRow[];
};

export type MatrixTierPayload = {
  id?: number;
  country_code: string | null;
  currency: string;
  min_students: number;
  max_students: number | null;
  price_per_student_month: number;
  is_active: boolean;
};

export const regionLabel = (code: string) => (code === 'GLOBAL' ? 'Global Plan' : `${code} Region`);

const isBlank = (v: unknown) => v === null || v === undefined || v === '';

// A region whose rows were never saved and never priced is the page's
// placeholder, not a configured matrix. Regional tiers are optional — billing
// falls back to the Global tiers — so such a region is left out of the save.
export const isUnconfiguredRegion = (cfg: RegionalMatrixConfig) =>
  cfg.tiers.every((t) => t.id === undefined && (isBlank(t.price_per_student_month) || Number(t.price_per_student_month) === 0));

export function buildPricingMatrixPayload(
  configs: Record<string, RegionalMatrixConfig>
): { tiers: MatrixTierPayload[]; error: null } | { tiers: null; error: { region: string; message: string } } {
  const tiers: MatrixTierPayload[] = [];
  for (const [code, cfg] of Object.entries(configs)) {
    if (isUnconfiguredRegion(cfg)) continue;
    for (const [i, t] of cfg.tiers.entries()) {
      const price = Number(t.price_per_student_month);
      if (isBlank(t.price_per_student_month) || !Number.isFinite(price) || price <= 0) {
        return { tiers: null, error: { region: code, message: `${regionLabel(code)}: bracket ${i + 1} price per student must be greater than 0` } };
      }
      const isLast = i === cfg.tiers.length - 1;
      if (!isLast && (isBlank(t.max_students) || Number(t.max_students) < Number(t.min_students))) {
        return { tiers: null, error: { region: code, message: `${regionLabel(code)}: bracket ${i + 1} needs an Up To Enrollment above From Enrollment` } };
      }
      tiers.push({
        ...(t.id !== undefined ? { id: t.id } : {}),
        country_code: code === 'GLOBAL' ? null : code.toUpperCase(),
        currency: cfg.currency.toUpperCase(),
        min_students: Number(t.min_students),
        max_students: isBlank(t.max_students) ? null : Number(t.max_students),
        price_per_student_month: price,
        is_active: !!t.is_active,
      });
    }
  }
  return { tiers, error: null };
}
