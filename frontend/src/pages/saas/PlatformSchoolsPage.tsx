import React, { useEffect, useMemo, useState } from 'react'
import { Building2, RefreshCcw, ShieldCheck, Users } from 'lucide-react'
import type { AxiosError } from 'axios'

import { SaasShell, platformNav } from './SaasShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import saasService, { Pagination, PlatformKPIs, SaaSTenant } from '@/services/saasService'
import { PlatformTenantDrawer } from './PlatformTenantDrawer'

export default function PlatformSchoolsPage() {
  const { toast } = useToast()
  const [tenants, setTenants] = useState<SaaSTenant[] | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  async function load(nextPage?: number) {
    setLoading(true)
    try {
      const res = await saasService.platformListTenants({
        q: query.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        plan: planFilter === 'all' ? undefined : planFilter,
        country_code: countryFilter === 'all' ? undefined : countryFilter.trim() || undefined,
        page: nextPage || page,
        per_page: 25
      })
      setTenants(res.items)
      setPagination(res.pagination)
      setPage(res.pagination.current_page)
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Failed to load schools',
        description: e.response?.data?.message || e.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadKpis() {
    try {
      const res = await saasService.platformKpis()
      setKpis(res.kpis)
    } catch (e) {
      void e
    }
  }

  useEffect(() => {
    load(1)
    loadKpis()
  }, [])

  const filtered = useMemo(() => {
    return tenants || []
  }, [tenants])

  const countries = useMemo(() => {
    const set = new Set<string>()
    ;(kpis ? Object.keys(kpis.tenants_by_country) : []).forEach((c) => set.add(c))
    return Array.from(set).sort()
  }, [kpis])

  const onSearch = async () => {
    await load(1)
    await loadKpis()
  }

  return (
    <SaasShell title="Super Admin Console" nav={platformNav} showTenantSwitcher={false}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                Total Schools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{kpis ? kpis.tenants_total : '—'}</div>
              <div className="text-xs text-slate-500">New (30d): {kpis ? kpis.tenants_new_last_30d : '—'}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{kpis ? (kpis.tenants_by_status.active || 0) : '—'}</div>
              <div className="text-xs text-slate-500">Suspended: {kpis ? (kpis.tenants_by_status.suspended || 0) : '—'}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Invoiced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{kpis ? kpis.invoice_total.toFixed(2) : '—'}</div>
              <div className="text-xs text-slate-500">Invoices: {kpis ? kpis.invoices_count : '—'}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-900">{kpis ? kpis.outstanding_total.toFixed(2) : '—'}</div>
              <div className="text-xs text-slate-500">Paid: {kpis ? kpis.payment_total.toFixed(2) : '—'}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Schools
            </CardTitle>
            <Button variant="outline" className="bg-white" onClick={() => load()} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, slug, or domain" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="trial">trial</SelectItem>
                    <SelectItem value="suspended">suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="trial">trial</SelectItem>
                    <SelectItem value="basic">basic</SelectItem>
                    <SelectItem value="pro">pro</SelectItem>
                    <SelectItem value="enterprise">enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Showing {filtered.length} / {pagination?.total ?? '—'}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="bg-white" onClick={onSearch} disabled={loading}>
                  Apply filters
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTenantId(t.id)
                      setDrawerOpen(true)
                    }}
                  >
                    <TableCell className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{t.name}</div>
                      <div className="text-xs text-slate-500 truncate">{t.slug} • {t.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-200">{t.status || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-900 text-white hover:bg-slate-900">{t.plan || '—'}</Badge>
                    </TableCell>
                    <TableCell>{t.country_code}</TableCell>
                    <TableCell className="text-xs text-slate-600">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</TableCell>
                  </TableRow>
                ))}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-slate-600">No schools found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">Page {pagination?.current_page ?? page} / {pagination?.total_pages ?? '—'}</div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="bg-white"
                  disabled={loading || !(pagination && pagination.current_page > 1)}
                  onClick={() => load((pagination?.current_page || 1) - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  className="bg-white"
                  disabled={loading || !(pagination && pagination.current_page < pagination.total_pages)}
                  onClick={() => load((pagination?.current_page || 1) + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PlatformTenantDrawer
        open={drawerOpen}
        tenantId={selectedTenantId}
        onOpenChange={setDrawerOpen}
        onChanged={async () => {
          await load(page)
          await loadKpis()
        }}
      />
    </SaasShell>
  )
}
