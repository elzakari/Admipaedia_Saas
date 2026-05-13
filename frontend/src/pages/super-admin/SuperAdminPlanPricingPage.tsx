import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import billingService, { BillingPlan, PlanPricingTier } from '@/services/billingService'

type TierDraft = {
  id?: number
  country_code: string
  currency: string
  min_students: string
  max_students: string
  price_per_student_month: string
  is_active: boolean
}

export default function SuperAdminPlanPricingPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('none')
  const [tiers, setTiers] = useState<PlanPricingTier[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [minMonths, setMinMonths] = useState<string>('3')
  const [savingMinMonths, setSavingMinMonths] = useState(false)

  const [tierOpen, setTierOpen] = useState(false)
  const [tierDraft, setTierDraft] = useState<TierDraft>({
    country_code: '',
    currency: 'XOF',
    min_students: '0',
    max_students: '',
    price_per_student_month: '',
    is_active: true
  })
  const [tierSaving, setTierSaving] = useState(false)

  async function loadPlans() {
    setLoading(true)
    try {
      const res = await billingService.listPlatformPlans()
      setPlans(res.plans)
      if (res.plans?.length && selectedPlanId === 'none') {
        setSelectedPlanId(String(res.plans[0].id))
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Failed to load plans', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

  async function seedDefaults() {
    setLoading(true)
    try {
      const res = await billingService.seedDefaultPlans()
      setPlans(res.plans)
      if (res.plans?.length) {
        setSelectedPlanId(String(res.plans[0].id))
      }
      toast({ title: 'Default plans created' })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Seed failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

  async function loadTiers(planId: number) {
    setLoading(true)
    try {
      const res = await billingService.listPlanPricingTiers(planId)
      setTiers(res.tiers)
      const p = (plans || []).find((x) => x.id === planId)
      if (p) setMinMonths(String(p.billing_min_months || 3))
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Failed to load tiers', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    const pid = Number(selectedPlanId)
    if (Number.isFinite(pid) && pid > 0) {
      loadTiers(pid)
    }
  }, [selectedPlanId])

  const selectedPlan = useMemo(() => (plans || []).find((p) => String(p.id) === selectedPlanId) || null, [plans, selectedPlanId])

  const openCreateTier = () => {
    setTierDraft({
      country_code: '',
      currency: (selectedPlan?.currency || 'XOF').toUpperCase(),
      min_students: '0',
      max_students: '',
      price_per_student_month: '',
      is_active: true
    })
    setTierOpen(true)
  }

  const openEditTier = (t: PlanPricingTier) => {
    setTierDraft({
      id: t.id,
      country_code: t.country_code || '',
      currency: t.currency,
      min_students: String(t.min_students),
      max_students: t.max_students === null ? '' : String(t.max_students),
      price_per_student_month: String(t.price_per_student_month),
      is_active: !!t.is_active
    })
    setTierOpen(true)
  }

  async function saveBillingSettings() {
    const pid = Number(selectedPlanId)
    if (!selectedPlan || !Number.isFinite(pid) || pid <= 0) return
    const m = Number(minMonths)
    if (!Number.isFinite(m) || m < 1) {
      toast({ variant: 'destructive', title: 'Invalid minimum months', description: 'billing_min_months must be >= 1' })
      return
    }
    setSavingMinMonths(true)
    try {
      const res = await billingService.updatePlanBillingSettings(pid, { billing_min_months: m })
      setPlans((prev) => (prev || []).map((p) => (p.id === pid ? res.plan : p)))
      toast({ title: 'Saved', description: `Minimum months: ${m}` })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Save failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setSavingMinMonths(false)
    }
  }

  async function saveTier() {
    const pid = Number(selectedPlanId)
    if (!Number.isFinite(pid) || pid <= 0) return

    const payload = {
      country_code: tierDraft.country_code.trim() ? tierDraft.country_code.trim().toUpperCase() : null,
      currency: tierDraft.currency.trim().toUpperCase(),
      min_students: Number(tierDraft.min_students),
      max_students: tierDraft.max_students.trim() ? Number(tierDraft.max_students) : null,
      price_per_student_month: Number(tierDraft.price_per_student_month),
      is_active: tierDraft.is_active
    }

    setTierSaving(true)
    try {
      if (tierDraft.id) {
        const res = await billingService.updatePlanPricingTier(tierDraft.id, { plan_id: pid, ...payload })
        setTiers((prev) => (prev || []).map((t) => (t.id === res.tier.id ? res.tier : t)))
      } else {
        const res = await billingService.createPlanPricingTier(pid, payload as any)
        setTiers((prev) => [res.tier, ...(prev || [])])
      }
      setTierOpen(false)
      toast({ title: 'Saved tier' })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Save failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setTierSaving(false)
    }
  }

  async function deleteTier(t: PlanPricingTier) {
    setTierSaving(true)
    try {
      await billingService.deletePlanPricingTier(t.id)
      setTiers((prev) => (prev || []).filter((x) => x.id !== t.id))
      toast({ title: 'Deleted tier' })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: 'Delete failed', description: e.response?.data?.message || e.message || 'Please try again' })
    } finally {
      setTierSaving(false)
    }
  }

  const statusVariant = (active: boolean): 'success' | 'secondary' => (active ? 'success' : 'secondary')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan Pricing</h1>
        <p className="text-sm text-muted-foreground">Configure per-student per-month pricing tiers by student range, country and currency.</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Select plan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3 flex-wrap">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {(plans || []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPlan && (
            <div className="space-y-2">
              <Label>Min billing months</Label>
              <Input className="w-[160px]" value={minMonths} onChange={(e) => setMinMonths(e.target.value)} />
            </div>
          )}
          {(plans || []).length === 0 && (
            <Button variant="secondary" onClick={seedDefaults} disabled={loading}>
              Seed default plans
            </Button>
          )}
          <Button onClick={saveBillingSettings} disabled={!selectedPlan || savingMinMonths}>
            {savingMinMonths ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pricing tiers</CardTitle>
          <Button onClick={openCreateTier} disabled={!selectedPlan}>Add tier</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Max</TableHead>
                <TableHead className="text-right">Price / student / month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tiers || []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.country_code || 'Any'}</TableCell>
                  <TableCell>{t.currency}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.min_students}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.max_students ?? '∞'}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.price_per_student_month.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusVariant(t.is_active)}>{t.is_active ? 'active' : 'inactive'}</Badge></TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEditTier(t)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteTier(t)} disabled={tierSaving}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && (tiers || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">No tiers configured yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={tierOpen} onOpenChange={(v) => setTierOpen(v)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{tierDraft.id ? 'Edit tier' : 'Add tier'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country code (optional)</Label>
              <Input value={tierDraft.country_code} onChange={(e) => setTierDraft((p) => ({ ...p, country_code: e.target.value }))} placeholder="GH, TG, CI…" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={tierDraft.currency} onChange={(e) => setTierDraft((p) => ({ ...p, currency: e.target.value }))} placeholder="XOF" />
            </div>
            <div className="space-y-2">
              <Label>Min students</Label>
              <Input value={tierDraft.min_students} onChange={(e) => setTierDraft((p) => ({ ...p, min_students: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Max students (optional)</Label>
              <Input value={tierDraft.max_students} onChange={(e) => setTierDraft((p) => ({ ...p, max_students: e.target.value }))} placeholder="Leave blank for no limit" />
            </div>
            <div className="space-y-2">
              <Label>Price / student / month</Label>
              <Input value={tierDraft.price_per_student_month} onChange={(e) => setTierDraft((p) => ({ ...p, price_per_student_month: e.target.value }))} placeholder="125" />
            </div>
            <div className="flex items-center gap-3 pt-7">
              <Switch checked={tierDraft.is_active} onCheckedChange={(v) => setTierDraft((p) => ({ ...p, is_active: v }))} />
              <span className="text-sm">Active</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTierOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveTier} disabled={tierSaving}>{tierSaving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
