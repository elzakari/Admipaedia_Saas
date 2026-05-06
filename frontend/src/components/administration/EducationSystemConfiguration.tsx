import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import i18n from '@/i18n'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useSaasTenant } from '@/hooks/useSaasTenant'
import educationalSystemService, { type EducationalSystemTemplate, type TenantConfig } from '@/services/educationalSystemService'
import { Loader2 } from 'lucide-react'
import { applyDocumentLanguage, hasLanguageOverride } from '@/lib/countryLanguage'

type CountryOption = { code: 'GH' | 'TG' | 'BJ'; label: string; defaultLanguage: 'en' | 'fr' }

const COUNTRIES: CountryOption[] = [
  { code: 'GH', label: 'Ghana', defaultLanguage: 'en' },
  { code: 'TG', label: 'Togo', defaultLanguage: 'fr' },
  { code: 'BJ', label: 'Benin', defaultLanguage: 'fr' }
]

export default function EducationSystemConfiguration() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { current, currentTenantId } = useSaasTenant()

  const defaultCountry = useMemo(() => {
    const cc = (current?.tenant.country_code || 'GH') as CountryOption['code']
    return COUNTRIES.some((c) => c.code === cc) ? cc : 'GH'
  }, [current])

  const [countryCode, setCountryCode] = useState<CountryOption['code']>(defaultCountry)
  const [templateKey, setTemplateKey] = useState<string>('')

  useEffect(() => {
    setCountryCode(defaultCountry)
  }, [defaultCountry])

  useEffect(() => {
    const nextLang = COUNTRIES.find((c) => c.code === countryCode)?.defaultLanguage || 'en'
    if (hasLanguageOverride()) return
    if (i18n.language !== nextLang) {
      void i18n.changeLanguage(nextLang)
      applyDocumentLanguage(nextLang)
    }
  }, [countryCode])

  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useQuery({
    queryKey: ['edu-system-templates', countryCode],
    queryFn: () => educationalSystemService.listTemplates(countryCode),
  })

  const { data: tenantConfig, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['edu-system-tenant-config', currentTenantId || 'no-tenant'],
    queryFn: async (): Promise<TenantConfig | null> => {
      try {
        return await educationalSystemService.getTenantConfig()
      } catch (err: unknown) {
        const e = err as AxiosError<{ message?: string }>
        if (e.response?.status === 404) return null
        throw err
      }
    },
    enabled: Boolean(currentTenantId),
  })

  const applyMutation = useMutation({
    mutationFn: (nextTemplateKey: string) => educationalSystemService.applyTemplate(nextTemplateKey),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['edu-system-tenant-config'] })
      toast({ title: 'Applied', description: `Education system updated to ${res.name}.` })
    },
    onError: (err: unknown) => {
      const e = err as AxiosError<{ message?: string }>
      toast({
        variant: 'destructive',
        title: 'Apply failed',
        description: e.response?.data?.message || e.message || 'Please try again',
      })
    },
  })

  const selectedTemplate: EducationalSystemTemplate | null = useMemo(() => {
    if (!templateKey) return null
    return templates.find((t) => t.system_key === templateKey) || null
  }, [templateKey, templates])

  const phases = useMemo(() => {
    const cfg = tenantConfig?.config
    const list = cfg?.phases
    return Array.isArray(list) ? list : []
  }, [tenantConfig])

  const grading = useMemo(() => {
    const g = tenantConfig?.config?.grading
    return g && typeof g === 'object' ? g : null
  }, [tenantConfig])

  return (
    <div className="space-y-6">
      <div className="px-6 py-4 bg-indigo-50/50 dark:bg-indigo-900/10 border-b border-indigo-100 dark:border-indigo-900/20">
        <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-300">Education System</h2>
        <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80">
          Select and apply a country education framework per school tenant.
        </p>
      </div>

      <div className="px-6 pb-6 space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Framework selection</CardTitle>
            <CardDescription>Choose a country template and apply it to this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={countryCode} onValueChange={(v) => setCountryCode(v as CountryOption['code'])}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Template</Label>
                <Select value={templateKey} onValueChange={setTemplateKey} disabled={templatesLoading || templates.length === 0}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder={templatesLoading ? 'Loading templates…' : 'Select template'} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.system_key} value={t.system_key}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate?.description && (
                  <div className="text-xs text-slate-600 dark:text-slate-300">{selectedTemplate.description}</div>
                )}
                {templatesError && (
                  <div className="text-xs text-red-600">Failed to load templates.</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => templateKey && applyMutation.mutate(templateKey)}
                disabled={!templateKey || applyMutation.isPending}
              >
                {applyMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Apply to tenant
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Active configuration</CardTitle>
            <CardDescription>Current education system applied to this tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : tenantConfig ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{tenantConfig.name}</div>
                  {tenantConfig.template_key ? <Badge variant="secondary">{tenantConfig.template_key}</Badge> : null}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Structure</div>
                    {phases.length === 0 ? (
                      <div className="text-sm text-slate-600">No grade structure defined in this template.</div>
                    ) : (
                      <div className="space-y-2">
                        {phases.map((p: any, idx: number) => (
                          <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
                            <div className="text-sm font-semibold">{String(p?.name || `Phase ${idx + 1}`)}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                              {Array.isArray(p?.levels) ? p.levels.join(' • ') : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Grading</div>
                    {!grading ? (
                      <div className="text-sm text-slate-600">No grading scheme defined in this template.</div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 space-y-2">
                        <div className="text-sm">
                          <span className="font-semibold">Type:</span> {String((grading as any).type || 'n/a')}
                        </div>
                        {(grading as any).scale ? (
                          <div className="text-sm">
                            <span className="font-semibold">Scale:</span> {String((grading as any).scale)}
                          </div>
                        ) : null}
                        {typeof (grading as any).pass_mark === 'number' ? (
                          <div className="text-sm">
                            <span className="font-semibold">Pass mark:</span> {(grading as any).pass_mark}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">
                No education system configured for this tenant yet. Select a template above and apply it.
              </div>
            )}
            {configError && (
              <div className="text-xs text-red-600">Failed to load tenant configuration.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
