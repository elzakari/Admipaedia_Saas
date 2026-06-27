export const SAAS_SCHOOL_DASHBOARD_ROUTE = '/app'
export const SAAS_SCHOOL_PROFILE_ROUTE = '/app/school'
export const SAAS_TEAM_ROUTE = '/app/team'
export const SAAS_BILLING_PLAN_ROUTE = '/app/billing/plan'
export const SAAS_BILLING_INVOICES_ROUTE = '/app/billing/invoices'
export const SAAS_BILLING_PAYMENTS_ROUTE = '/app/billing/payments'

export function normalizeSaasPathname(pathname: string): string {
  if (!pathname) {
    return SAAS_SCHOOL_DASHBOARD_ROUTE
  }

  if (/^\/app(\/|$)/i.test(pathname)) {
    return pathname.replace(/^\/app/i, '/app')
  }

  return pathname
}

export function buildSaasReturnUrl(path: string): string {
  return `${window.location.origin}${normalizeSaasPathname(path)}`
}
