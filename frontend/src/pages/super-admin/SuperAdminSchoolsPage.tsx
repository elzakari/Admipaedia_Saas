import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { Building2, Copy, RefreshCcw, ShieldCheck, Users } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import saasService, { Pagination, PlatformKPIs, SaaSTenant } from '@/services/saasService'
import { PlatformTenantDrawer } from '@/pages/saas/PlatformTenantDrawer'
import { superAdminService } from '@/services/superAdminService'

export default function SuperAdminSchoolsPage() {
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

  const [linkOpen, setLinkOpen] = useState(false)
  const [regSchoolName, setRegSchoolName] = useState('')
  const [regSchoolSlug, setRegSchoolSlug] = useState('')
  const [regAdminEmail, setRegAdminEmail] = useState('')
  const [regCountryCode, setRegCountryCode] = useState('GH')
  const [regCurrency, setRegCurrency] = useState('GHS')
  const [regSubmitting, setRegSubmitting] = useState(false)
  const [regUrl, setRegUrl] = useState<string | null>(null)
  const [regExpiresAt, setRegExpiresAt] = useState<string | null>(null)

  const suggestedRegSlug = useMemo(() => {
    const s = regSchoolName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)
    return s
  }, [regSchoolName])

  const regEmailValid = useMemo(() => {
    const v = regAdminEmail.trim()
    if (!v) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }, [regAdminEmail])

  const regCountryValid = useMemo(() => regCountryCode.trim().length === 2, [regCountryCode])
  const regCurrencyValid = useMemo(() => regCurrency.trim().length === 3, [regCurrency])

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

  const filtered = useMemo(() => tenants || [], [tenants])

  const countries = useMemo(() => {
    const set = new Set<string>()
    ;(kpis ? Object.keys(kpis.tenants_by_country) : []).forEach((c) => set.add(c))
    return Array.from(set).sort()
  }, [kpis])

  const onApplyFilters = async () => {
    await load(1)
    await loadKpis()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Schools</h1>
          <p className="text-sm text-muted-foreground">Manage schools and platform access.</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={linkOpen}
            onOpenChange={(next) => {
              setLinkOpen(next)
              if (!next) {
                setRegSubmitting(false)
                setRegUrl(null)
                setRegExpiresAt(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>Generate registration link</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create a school registration link</DialogTitle>
                <DialogDescription>
                  Generates a single-use link that expires in 24 hours. The school admin uses it to set their password and create the school workspace.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">School name</Label>
                    <Input
                      id="schoolName"
                      value={regSchoolName}
                      onChange={(e) => setRegSchoolName(e.target.value)}
                      placeholder="ADMIPAEDIA School"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolSlug">School slug (optional)</Label>
                    <Input
                      id="schoolSlug"
                      value={regSchoolSlug}
                      onChange={(e) => setRegSchoolSlug(e.target.value)}
                      placeholder="admipaedia-school"
                    />
                    <div className="text-xs text-muted-foreground">
                      Leave blank to auto-generate from the school name{suggestedRegSlug ? ` (suggested: ${suggestedRegSlug})` : ''}.
                      {suggestedRegSlug && !regSchoolSlug.trim() && (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 ml-1 text-xs"
                          onClick={() => setRegSchoolSlug(suggestedRegSlug)}
                        >
                          Use
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">School admin email</Label>
                  <Input
                    id="adminEmail"
                    value={regAdminEmail}
                    onChange={(e) => setRegAdminEmail(e.target.value)}
                    placeholder="admin@school.com"
                  />
                  <div className="text-xs text-muted-foreground">
                    {regAdminEmail.trim().length === 0 ? 'This email will become the school admin login.' : (regEmailValid ? 'Looks good.' : 'Enter a valid email address.')}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="countryCode">Country code</Label>
                    <Input
                      id="countryCode"
                      value={regCountryCode}
                      onChange={(e) => setRegCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="GH"
                    />
                    {!regCountryValid && (
                      <div className="text-xs text-muted-foreground">Use a 2-letter ISO code (e.g. GH).</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={regCurrency}
                      onChange={(e) => setRegCurrency(e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="GHS"
                    />
                    {!regCurrencyValid && (
                      <div className="text-xs text-muted-foreground">Use a 3-letter currency (e.g. GHS).</div>
                    )}
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-3">
                  <div className="mr-auto text-xs text-muted-foreground">Expires in 24 hours • Single-use</div>
                  <Button
                    variant="outline"
                    onClick={() => setLinkOpen(false)}
                    disabled={regSubmitting}
                  >
                    Close
                  </Button>
                  <Button
                    disabled={
                      regSubmitting ||
                      regSchoolName.trim().length === 0 ||
                      !regEmailValid ||
                      !regCountryValid ||
                      !regCurrencyValid
                    }
                    onClick={async () => {
                      setRegSubmitting(true)
                      try {
                        const res = await superAdminService.createSchoolRegistrationLink({
                          school_name: regSchoolName.trim(),
                          school_slug: regSchoolSlug.trim() || undefined,
                          admin_email: regAdminEmail.trim(),
                          country_code: regCountryCode.trim(),
                          currency: regCurrency.trim()
                        })
                        setRegUrl(res.registration_url)
                        setRegExpiresAt(res.registration.expires_at || null)
                        toast({
                          title: 'Registration link generated',
                          description: 'This link expires in 24 hours and can be used once.'
                        })
                      } catch (err: unknown) {
                        const e = err as AxiosError<{ message?: string; error?: string }>
                        toast({
                          variant: 'destructive',
                          title: 'Failed to generate link',
                          description: e.response?.data?.message || e.response?.data?.error || e.message || 'Please try again'
                        })
                      } finally {
                        setRegSubmitting(false)
                      }
                    }}
                  >
                    {regSubmitting ? 'Generating...' : 'Generate'}
                  </Button>
                </DialogFooter>

                {regUrl && (
                  <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                    <div className="text-xs font-medium text-slate-900">Registration link</div>
                    <div className="text-xs text-muted-foreground">
                      {regExpiresAt ? `Expires: ${new Date(regExpiresAt).toLocaleString()}` : 'Expires in 24 hours'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={regUrl}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(regUrl)
                            toast({ title: 'Copied link' })
                          } catch {
                            toast({ variant: 'destructive', title: 'Copy failed', description: 'Please copy the link manually.' })
                          }
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(regUrl, '_blank', 'noopener,noreferrer')}
                      >
                        Open
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={async () => {
              await load(page)
              await loadKpis()
            }}
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Total Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{kpis ? kpis.tenants_total : '—'}</div>
            <div className="text-xs text-muted-foreground">New (30d): {kpis ? kpis.tenants_new_last_30d : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{kpis ? (kpis.tenants_by_status.active || 0) : '—'}</div>
            <div className="text-xs text-muted-foreground">Suspended: {kpis ? (kpis.tenants_by_status.suspended || 0) : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{kpis ? kpis.invoice_total.toFixed(2) : '—'}</div>
            <div className="text-xs text-muted-foreground">Invoices: {kpis ? kpis.invoices_count : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{kpis ? kpis.outstanding_total.toFixed(2) : '—'}</div>
            <div className="text-xs text-muted-foreground">Paid: {kpis ? kpis.payment_total.toFixed(2) : '—'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Schools
          </CardTitle>
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
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Showing {filtered.length} / {pagination?.total ?? '—'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onApplyFilters} disabled={loading}>
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
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.slug} • {t.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.status || '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{t.plan || '—'}</Badge>
                  </TableCell>
                  <TableCell>{t.country_code}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">No schools found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={!pagination || pagination.current_page <= 1 || loading}
              onClick={() => load(Math.max(1, (pagination?.current_page || 1) - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              disabled={!pagination || pagination.current_page >= pagination.total_pages || loading}
              onClick={() => load((pagination?.current_page || 1) + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <PlatformTenantDrawer
        open={drawerOpen}
        tenantId={selectedTenantId}
        onOpenChange={setDrawerOpen}
        onChanged={async () => {
          await load(page)
          await loadKpis()
        }}
      />
    </div>
  )
}
