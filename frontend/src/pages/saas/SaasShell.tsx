import React, { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Building2, Users, Receipt, CreditCard, Shield, BarChart3, Settings2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
}

export function SaasShell({ title, nav, children, showTenantSwitcher }: { title: string; nav: NavItem[]; children: React.ReactNode; showTenantSwitcher: boolean }) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { tenants, currentTenantId, setCurrentTenant, isLoading } = useSaasTenant()

  const activeHref = useMemo(() => {
    const found = nav.find((i) => location.pathname === i.href)
    return found?.href || ''
  }, [location.pathname, nav])

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">{title}</h1>
              {user?.role === 'super_admin' && (
                <Badge variant="secondary">Super Admin</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">Manage schools, teams, and platform billing</p>
          </div>

          <div className="flex items-center gap-3">
            {showTenantSwitcher && (
              <div className="hidden sm:block">
                <Select value={currentTenantId || ''} onValueChange={setCurrentTenant} disabled={isLoading || tenants.length === 0}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder={tenants.length ? 'Select school' : 'No schools'} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{t.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button variant="outline" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="bg-card border border-border rounded-2xl p-3">
            <div className="px-2 py-2 flex items-center gap-2 text-foreground">
              {user?.role === 'super_admin' ? <Shield className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              <span className="text-sm font-semibold">Navigation</span>
            </div>

            <nav className="mt-2 space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors',
                    item.href === activeHref ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className={cn('shrink-0', item.href === activeHref ? 'text-primary-foreground' : 'text-muted-foreground')}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </nav>

            {user?.role !== 'super_admin' && (
              <div className="mt-4 px-2">
                <div className="rounded-xl bg-muted/40 border border-border p-3">
                  <div className="text-xs text-foreground">Need another school workspace?</div>
                  <div className="text-xs text-muted-foreground mt-1">Ask a Super Admin to generate a secure registration link.</div>
                </div>
              </div>
            )}
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}

export const schoolNav: NavItem[] = [
  { label: 'Dashboard', href: '/app', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'School Profile', href: '/app/school', icon: <Settings2 className="h-4 w-4" /> },
  { label: 'Team & Roles', href: '/app/team', icon: <Users className="h-4 w-4" /> },
  { label: 'Invoices', href: '/app/billing/invoices', icon: <Receipt className="h-4 w-4" /> },
  { label: 'Payments', href: '/app/billing/payments', icon: <CreditCard className="h-4 w-4" /> }
]

export const platformNav: NavItem[] = [
  { label: 'Schools', href: '/platform', icon: <Building2 className="h-4 w-4" /> },
  { label: 'Financial Oversight', href: '/platform/financial', icon: <BarChart3 className="h-4 w-4" /> }
]
