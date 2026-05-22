import React, { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { Sparkles, Globe, Plus, Trash2, Check, X, Edit2, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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

type EditingTierRow = {
  id?: number
  plan_id: number
  country_code: string | null
  currency: string
  min_students: number
  max_students: number | null
  price_per_student_month: string | number
  is_active: boolean
}

type GroupedTiers = {
  key: string
  country_code: string | null
  currency: string
  tiers: PlanPricingTier[]
  isNew?: boolean
}

export default function SuperAdminPlanPricingPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string>('none')
  const [tiers, setTiers] = useState<PlanPricingTier[] | null>(null)
  const [loading, setLoading] = useState(false)

  const [minMonths, setMinMonths] = useState<string>('3')
  const [savingMinMonths, setSavingMinMonths] = useState(false)

  // Edit states
  const [editingCountryKey, setEditingCountryKey] = useState<string | null>(null)
  const [editingTiersDraft, setEditingTiersDraft] = useState<EditingTierRow[] | null>(null)
  const [tierSaving, setTierSaving] = useState(false)

  // Add country/currency dialog states
  const [addCountryOpen, setAddCountryOpen] = useState(false)
  const [newCountryDraft, setNewCountryDraft] = useState({
    country_code: '',
    currency: ''
  })

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
      toast({ variant: 'destructive', title: t('super_admin.plan_pricing.errors.load_plans_failed', 'Failed to load plans'), description: e.response?.data?.message || e.message || t('super_admin.plan_pricing.errors.try_again', 'Please try again') })
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
      toast({ title: t('super_admin.plan_pricing.toasts.defaults_created', 'Default plans created') })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.plan_pricing.errors.seed_failed', 'Seed failed'), description: e.response?.data?.message || e.message || t('super_admin.plan_pricing.errors.try_again', 'Please try again') })
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
      toast({ variant: 'destructive', title: t('super_admin.plan_pricing.errors.load_tiers_failed', 'Failed to load tiers'), description: e.response?.data?.message || e.message || t('super_admin.plan_pricing.errors.try_again', 'Please try again') })
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
      cancelCountryGroupEdits()
    }
  }, [selectedPlanId])

  const selectedPlan = useMemo(() => (plans || []).find((p) => String(p.id) === selectedPlanId) || null, [plans, selectedPlanId])

  async function saveBillingSettings() {
    const pid = Number(selectedPlanId)
    if (!selectedPlan || !Number.isFinite(pid) || pid <= 0) return
    const m = Number(minMonths)
    if (!Number.isFinite(m) || m < 1) {
      toast({ variant: 'destructive', title: t('super_admin.plan_pricing.errors.invalid_min_months', 'Invalid minimum months'), description: t('super_admin.plan_pricing.errors.min_months_gte_1', 'billing_min_months must be >= 1') })
      return
    }
    setSavingMinMonths(true)
    try {
      const res = await billingService.updatePlanBillingSettings(pid, { billing_min_months: m })
      setPlans((prev) => (prev || []).map((p) => (p.id === pid ? res.plan : p)))
      toast({ title: t('common.saved', 'Saved'), description: t('super_admin.plan_pricing.toasts.minimum_months', 'Minimum months: {{m}}', { m }) })
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({ variant: 'destructive', title: t('super_admin.plan_pricing.errors.save_failed', 'Save failed'), description: e.response?.data?.message || e.message || t('super_admin.plan_pricing.errors.try_again', 'Please try again') })
    } finally {
      setSavingMinMonths(false)
    }
  }

  // --- RANGE CONTINUITY & EDIT ENGINE ---

  // Organizes raw flat tiers into distinct country + currency groups
  const groupedTiers = useMemo(() => {
    const groups: Record<string, { country_code: string | null; currency: string; tiers: PlanPricingTier[] }> = {}
    
    if (tiers) {
      tiers.forEach((t) => {
        const key = `${t.country_code || 'GLOBAL'}-${t.currency}`.toUpperCase()
        if (!groups[key]) {
          groups[key] = {
            country_code: t.country_code,
            currency: t.currency,
            tiers: []
          }
        }
        groups[key].tiers.push(t)
      })
    }
    
    // Sort tiers in each group by min_students ascending
    Object.keys(groups).forEach((key) => {
      groups[key].tiers.sort((a, b) => a.min_students - b.min_students)
    })
    
    return groups
  }, [tiers])

  // Merges saved groups with any new unsaved country config card currently under initialization
  const groupsList = useMemo(() => {
    const list: GroupedTiers[] = Object.entries(groupedTiers).map(([key, value]) => ({
      key,
      country_code: value.country_code,
      currency: value.currency,
      tiers: value.tiers,
      isNew: false
    }))
    
    // If editing a new country group, inject it into the list so it renders
    if (editingCountryKey && editingCountryKey.startsWith('new-country-') && editingTiersDraft && editingTiersDraft.length > 0) {
      const first = editingTiersDraft[0]
      list.push({
        key: editingCountryKey,
        country_code: first.country_code,
        currency: first.currency,
        tiers: [],
        isNew: true
      })
    }
    
    // Sort country cards so Global is always first or last, rest are alphabetical
    list.sort((a, b) => {
      if (!a.country_code) return 1
      if (!b.country_code) return -1
      return a.country_code.localeCompare(b.country_code)
    })

    return list
  }, [groupedTiers, editingCountryKey, editingTiersDraft])

  // Recalculates all sequential rows dynamically ensuring absolute range continuity ("Anti-Gravity")
  const recalculateRanges = (rows: EditingTierRow[]): EditingTierRow[] => {
    const updated = [...rows]
    for (let i = 0; i < updated.length; i++) {
      if (i === 0) {
        updated[i].min_students = 0
      } else {
        const prevMax = Number(updated[i - 1].max_students) || 0
        updated[i].min_students = prevMax + 1
      }

      if (i === updated.length - 1) {
        updated[i].max_students = null
      }
    }
    return updated
  }

  const startCountryGroupEdits = (group: GroupedTiers) => {
    const initialDrafts = group.tiers.map((t) => ({
      id: t.id,
      plan_id: t.plan_id,
      country_code: t.country_code,
      currency: t.currency,
      min_students: t.min_students,
      max_students: t.max_students,
      price_per_student_month: String(t.price_per_student_month),
      is_active: !!t.is_active
    }))
    setEditingCountryKey(group.key)
    setEditingTiersDraft(recalculateRanges(initialDrafts))
  }

  const cancelCountryGroupEdits = () => {
    setEditingCountryKey(null)
    setEditingTiersDraft(null)
  }

  const handleMaxChange = (idx: number, val: string) => {
    if (!editingTiersDraft) return
    const updated = [...editingTiersDraft]
    updated[idx].max_students = val === '' ? 0 : Number(val)
    setEditingTiersDraft(recalculateRanges(updated))
  }

  const handlePriceChange = (idx: number, val: string) => {
    if (!editingTiersDraft) return
    const updated = [...editingTiersDraft]
    updated[idx].price_per_student_month = val
    setEditingTiersDraft(updated)
  }

  // Appends a new infinite bracket and shifts prior one to a finite range
  const addTierRow = () => {
    if (!editingTiersDraft || editingTiersDraft.length === 0) return
    
    const updated = [...editingTiersDraft]
    const lastIndex = updated.length - 1
    const lastRow = updated[lastIndex]
    
    // Give the previous infinite row a finite upper limit
    const defaultIncrement = 100
    const oldInfiniteMax = lastRow.min_students + defaultIncrement
    lastRow.max_students = oldInfiniteMax
    
    // Append the new infinite row
    const newRow: EditingTierRow = {
      plan_id: Number(selectedPlanId),
      country_code: lastRow.country_code,
      currency: lastRow.currency,
      min_students: oldInfiniteMax + 1,
      max_students: null,
      price_per_student_month: '0.00',
      is_active: true
    }
    
    updated.push(newRow)
    setEditingTiersDraft(recalculateRanges(updated))
  }

  // Row deletion: removes targeted index and dynamic enforcer automatically recalculates/seals any gaps
  const deleteTierRow = (index: number) => {
    if (!editingTiersDraft || editingTiersDraft.length <= 1) return
    const updated = editingTiersDraft.filter((_, idx) => idx !== index)
    setEditingTiersDraft(recalculateRanges(updated))
  }

  // Saves modifications sequentially to avoid overlap constraint violations in db (Deletes -> Updates -> Creates)
  const saveCountryGroupEdits = async (group: GroupedTiers) => {
    if (!editingTiersDraft || editingTiersDraft.length === 0) return

    // 1. Frontend validation
    for (let i = 0; i < editingTiersDraft.length; i++) {
      const row = editingTiersDraft[i]
      const priceNum = Number(row.price_per_student_month)
      
      if (isNaN(priceNum) || priceNum < 0) {
        toast({
          variant: 'destructive',
          title: t('super_admin.plan_pricing.errors.invalid_price', 'Invalid Price'),
          description: t('super_admin.plan_pricing.errors.price_positive', 'Price must be a valid number greater than or equal to 0')
        })
        return
      }

      if (i < editingTiersDraft.length - 1) {
        const maxVal = row.max_students
        if (maxVal === null || isNaN(Number(maxVal)) || Number(maxVal) <= row.min_students) {
          toast({
            variant: 'destructive',
            title: t('super_admin.plan_pricing.errors.invalid_range', 'Invalid Range'),
            description: t('super_admin.plan_pricing.errors.max_gt_min', 'Max students must be greater than Min students')
          })
          return
        }
      }
    }

    // 2. Classify tier actions
    const originalIds = group.tiers.map((t) => t.id)
    const draftIds = editingTiersDraft.map((t) => t.id).filter((id): id is number => id !== undefined)
    const deletedIds = originalIds.filter((id) => !draftIds.includes(id))
    
    const updates = editingTiersDraft.filter((t) => t.id !== undefined)
    const creates = editingTiersDraft.filter((t) => t.id === undefined)

    setTierSaving(true)
    try {
      // Step A: Remove deleted brackets first to clear any indices
      for (const id of deletedIds) {
        await billingService.deletePlanPricingTier(id)
      }

      // Step B: Update modified brackets
      for (const row of updates) {
        const payload = {
          plan_id: row.plan_id,
          country_code: row.country_code ? row.country_code.toUpperCase() : null,
          currency: row.currency.toUpperCase(),
          min_students: row.min_students,
          max_students: row.max_students !== null ? Number(row.max_students) : null,
          price_per_student_month: Number(row.price_per_student_month),
          is_active: row.is_active
        }
        await billingService.updatePlanPricingTier(row.id!, payload)
      }

      // Step C: Create newly added brackets
      for (const row of creates) {
        const payload = {
          country_code: row.country_code ? row.country_code.toUpperCase() : null,
          currency: row.currency.toUpperCase(),
          min_students: row.min_students,
          max_students: row.max_students !== null ? Number(row.max_students) : null,
          price_per_student_month: Number(row.price_per_student_month),
          is_active: row.is_active
        }
        await billingService.createPlanPricingTier(row.plan_id, payload as any)
      }

      toast({
        title: t('super_admin.plan_pricing.toasts.saved_tier', 'Pricing tiers saved successfully')
      })
      setEditingCountryKey(null)
      setEditingTiersDraft(null)

      // Reload global plans and specific tiers to update state representation
      const pid = Number(selectedPlanId)
      if (Number.isFinite(pid) && pid > 0) {
        await loadTiers(pid)
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: t('super_admin.plan_pricing.errors.save_failed', 'Save failed'),
        description: e.response?.data?.message || e.message || t('super_admin.plan_pricing.errors.try_again', 'Please try again')
      })
    } finally {
      setTierSaving(false)
    }
  }

  // Dialogue handler for launching a pricing configuration for a new Country and Currency
  const handleAddCountryConfig = () => {
    const code = newCountryDraft.country_code.trim().toUpperCase()
    const curr = newCountryDraft.currency.trim().toUpperCase()
    
    if (!curr) {
      toast({
        variant: 'destructive',
        title: t('super_admin.plan_pricing.errors.invalid_input', 'Invalid Input'),
        description: t('super_admin.plan_pricing.errors.currency_required', 'Settlement currency is required')
      })
      return
    }

    const key = `${code || 'GLOBAL'}-${curr}`
    const exists = groupsList.some((g) => g.key === key)
    if (exists) {
      toast({
        variant: 'destructive',
        title: t('super_admin.plan_pricing.errors.duplicate_config', 'Duplicate Configuration'),
        description: t('super_admin.plan_pricing.errors.config_exists', 'Pricing configuration for {{code}} in {{curr}} already exists.', { code: code || 'Global', curr })
      })
      return
    }

    // Set state immediately to the new group inline edit mode
    setEditingCountryKey(`new-country-${code || 'GLOBAL'}-${curr}`)
    setEditingTiersDraft([
      {
        plan_id: Number(selectedPlanId),
        country_code: code || null,
        currency: curr,
        min_students: 0,
        max_students: null,
        price_per_student_month: '0.00',
        is_active: true
      }
    ])
    
    setAddCountryOpen(false)
    setNewCountryDraft({ country_code: '', currency: '' })
    
    toast({
      title: t('super_admin.plan_pricing.toasts.config_initialized', 'Region initialized'),
      description: t('super_admin.plan_pricing.toasts.config_initialized_desc', 'Region {{code}} initialized. Please configure pricing and click Save.', { code: code || 'Global' })
    })
  }

  const statusVariant = (active: boolean): 'success' | 'secondary' => (active ? 'success' : 'secondary')

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('super_admin.plan_pricing.title', 'Plan Pricing Matrix')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('super_admin.plan_pricing.subtitle', 'Configure segmented, non-overlapping student bracket tiers structured explicitly by Country and Currency.')}</p>
        </div>
      </div>

      {/* Global Plan Configuration Settings */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            {t('super_admin.plan_pricing.select_plan.title', 'Global Plan Options')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('super_admin.plan_pricing.select_plan.plan', 'Active Plan')}</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={editingCountryKey !== null}>
              <SelectTrigger className="w-[280px] rounded-xl border-slate-200">
                <SelectValue placeholder={t('super_admin.plan_pricing.select_plan.select_plan', 'Select plan')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {(plans || []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="rounded-lg">{p.name} ({p.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPlan && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{t('super_admin.plan_pricing.select_plan.min_billing_months', 'Min billing months')}</Label>
              <Input className="w-[180px] rounded-xl border-slate-200 font-mono" value={minMonths} onChange={(e) => setMinMonths(e.target.value)} disabled={editingCountryKey !== null} />
            </div>
          )}
          {(plans || []).length === 0 && (
            <Button variant="secondary" onClick={seedDefaults} disabled={loading} className="rounded-xl">
              {t('super_admin.plan_pricing.select_plan.seed_defaults', 'Seed default plans')}
            </Button>
          )}
          <Button onClick={saveBillingSettings} disabled={!selectedPlan || savingMinMonths || editingCountryKey !== null} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium px-5">
            {savingMinMonths ? t('super_admin.plan_pricing.select_plan.saving', 'Saving...') : t('common.save', 'Save Configuration')}
          </Button>
        </CardContent>
      </Card>

      {/* Segmented Pricing Tiers Container */}
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{t('super_admin.plan_pricing.tiers.title', 'Pricing Regions & Tiers')}</h2>
          <Button
            onClick={() => setAddCountryOpen(true)}
            disabled={!selectedPlan || editingCountryKey !== null}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 rounded-xl px-4 py-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            {t('super_admin.plan_pricing.tiers.add_region', 'Add Region')}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {groupsList.map((group) => {
            const isEditing = editingCountryKey === group.key
            return (
              <Card key={group.key} className="border border-slate-200/80 shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex flex-row items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 text-lg">
                          {group.country_code ? `${group.country_code} Region` : 'Global Region'}
                        </span>
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-mono text-xs uppercase px-2.5 py-0.5 border border-indigo-100">
                          {group.currency}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {t('super_admin.plan_pricing.tiers.currency_pricing', 'Settlement pricing in {{currency}}', { currency: group.currency })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions inside individual card header */}
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={addTierRow}
                          className="flex items-center gap-1.5 text-xs font-medium border-slate-200 hover:bg-slate-100 rounded-xl"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t('super_admin.plan_pricing.tiers.add_tier', 'Add Tier')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveCountryGroupEdits(group)}
                          disabled={tierSaving}
                          className="flex items-center gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {tierSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelCountryGroupEdits}
                          disabled={tierSaving}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-xl"
                        >
                          <X className="h-3.5 w-3.5" />
                          {t('common.cancel', 'Cancel')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startCountryGroupEdits(group)}
                        disabled={editingCountryKey !== null}
                        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 border-indigo-200 hover:bg-indigo-50/50 rounded-xl"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        {t('common.edit', 'Edit Grid')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {isEditing ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                          <TableRow>
                            <TableHead className="w-[140px] font-semibold text-slate-500 pl-6 py-3">{t('super_admin.plan_pricing.tiers.table.min', 'Min Students')}</TableHead>
                            <TableHead className="w-[160px] font-semibold text-slate-500 py-3">{t('super_admin.plan_pricing.tiers.table.max', 'Max Students')}</TableHead>
                            <TableHead className="font-semibold text-slate-500 text-right py-3">{t('super_admin.plan_pricing.tiers.table.price', 'Price / Student / Month')}</TableHead>
                            <TableHead className="w-[100px] font-semibold text-slate-500 text-center py-3">{t('super_admin.plan_pricing.tiers.table.status', 'Status')}</TableHead>
                            <TableHead className="w-[80px] font-semibold text-slate-500 text-center pr-6 py-3">{t('common.actions', 'Actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingTiersDraft?.map((row, idx) => (
                            <TableRow key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/20">
                              {/* Min Students: Read-only */}
                              <TableCell className="pl-6 font-mono text-slate-500 py-3">
                                <Input
                                  value={row.min_students}
                                  disabled
                                  className="w-24 bg-slate-50 text-slate-500 border-slate-200/60 font-mono rounded-lg h-9"
                                />
                              </TableCell>
                              
                              {/* Max Students: Editable except for the last row */}
                              <TableCell className="font-mono py-3">
                                {row.max_students === null ? (
                                  <Input
                                    value="∞"
                                    disabled
                                    className="w-28 bg-slate-50 text-slate-400 italic border-slate-200/60 font-sans rounded-lg h-9"
                                  />
                                ) : (
                                  <Input
                                    type="number"
                                    min={row.min_students + 1}
                                    value={row.max_students === 0 ? '' : row.max_students}
                                    onChange={(e) => handleMaxChange(idx, e.target.value)}
                                    className="w-28 font-mono border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg h-9"
                                  />
                                )}
                              </TableCell>
                              
                              {/* Price: Editable */}
                              <TableCell className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className="text-slate-400 font-mono text-xs uppercase">{group.currency}</span>
                                  <Input
                                    type="text"
                                    value={row.price_per_student_month}
                                    onChange={(e) => handlePriceChange(idx, e.target.value)}
                                    placeholder="0.00"
                                    className="w-28 text-right font-mono border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg h-9"
                                  />
                                </div>
                              </TableCell>

                              {/* Status: Switch */}
                              <TableCell className="py-3 text-center">
                                <div className="flex justify-center items-center">
                                  <Switch
                                    checked={row.is_active}
                                    onCheckedChange={(val) => {
                                      if (!editingTiersDraft) return
                                      const updated = [...editingTiersDraft]
                                      updated[idx].is_active = val
                                      setEditingTiersDraft(updated)
                                    }}
                                  />
                                </div>
                              </TableCell>
                              
                              {/* Actions: Delete row */}
                              <TableCell className="text-center pr-6 py-3">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteTierRow(idx)}
                                  disabled={editingTiersDraft.length <= 1}
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30 rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                          <TableRow>
                            <TableHead className="w-[180px] font-semibold text-slate-500 pl-6 py-3">{t('super_admin.plan_pricing.tiers.table.min', 'Min Students')}</TableHead>
                            <TableHead className="w-[180px] font-semibold text-slate-500 py-3">{t('super_admin.plan_pricing.tiers.table.max', 'Max Students')}</TableHead>
                            <TableHead className="font-semibold text-slate-500 text-right py-3">{t('super_admin.plan_pricing.tiers.table.price', 'Price / Student / Month')}</TableHead>
                            <TableHead className="w-[140px] font-semibold text-slate-500 pr-6 py-3">{t('super_admin.plan_pricing.tiers.table.status', 'Status')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.tiers.map((tier) => (
                            <TableRow key={tier.id} className="hover:bg-slate-50/30 border-b border-slate-100 last:border-0">
                              <TableCell className="pl-6 font-mono text-slate-700 py-3.5">{tier.min_students}</TableCell>
                              <TableCell className="font-mono text-slate-700 py-3.5">
                                {tier.max_students === null ? (
                                  <span className="text-slate-400 font-sans italic">∞ (No Limit)</span>
                                ) : (
                                  tier.max_students
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono text-indigo-600 font-bold py-3.5">
                                {group.currency} {tier.price_per_student_month.toFixed(2)}
                              </TableCell>
                              <TableCell className="pr-6 py-3.5">
                                <Badge variant={statusVariant(tier.is_active)}>
                                  {tier.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          
          {!loading && groupsList.length === 0 && (
            <Card className="rounded-2xl border border-dashed border-slate-200 p-10 text-center bg-slate-50/50">
              <div className="max-w-md mx-auto space-y-4">
                <div className="p-3 bg-slate-100 text-slate-400 rounded-full inline-block">
                  <Globe className="h-6 w-6" />
                </div>
                <h3 className="text-slate-800 font-bold text-base">{t('super_admin.plan_pricing.tiers.empty_title', 'No pricing configurations')}</h3>
                <p className="text-sm text-slate-500">{t('super_admin.plan_pricing.tiers.empty_desc', 'Pricing configurations segment pricing ranges by region and currency. Start by adding a configuration.')}</p>
                <Button
                  onClick={() => setAddCountryOpen(true)}
                  disabled={!selectedPlan}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold px-4 py-2"
                >
                  {t('super_admin.plan_pricing.tiers.add_region_now', 'Add Region Now')}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Global Dialog for adding pricing configuration to a new Country and Currency */}
      <Dialog open={addCountryOpen} onOpenChange={setAddCountryOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-500" />
              {t('super_admin.plan_pricing.add_country_dialog.title', 'Add Country Configuration')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">{t('super_admin.plan_pricing.add_country_dialog.country_code', 'Country Code')}</Label>
              <Input
                value={newCountryDraft.country_code}
                onChange={(e) => setNewCountryDraft((p) => ({ ...p, country_code: e.target.value }))}
                placeholder={t('super_admin.plan_pricing.add_country_dialog.country_code_placeholder', 'e.g. GH, TG, CI (Leave blank for Global)')}
                className="rounded-xl border-slate-200 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">{t('super_admin.plan_pricing.add_country_dialog.currency', 'Settlement Currency')}</Label>
              <Input
                value={newCountryDraft.currency}
                onChange={(e) => setNewCountryDraft((p) => ({ ...p, currency: e.target.value }))}
                placeholder={t('super_admin.plan_pricing.add_country_dialog.currency_placeholder', 'e.g. GHS, XOF, USD')}
                className="rounded-xl border-slate-200 uppercase"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setAddCountryOpen(false)} className="rounded-xl border-slate-200">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="button" onClick={handleAddCountryConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              {t('super_admin.plan_pricing.add_country_dialog.add', 'Initialize Configuration')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
