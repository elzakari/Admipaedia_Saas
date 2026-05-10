import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'

import api from '../../lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'

type AdmissionSettingsPayload = {
  admission_form_price?: string
  admissions_online_submissions?: boolean
  admissions_auto_generate_ids?: boolean
}

function asBool(v: any, fallback: boolean) {
  if (v === undefined || v === null) return fallback
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase()
  if (s === 'true') return true
  if (s === 'false') return false
  return fallback
}

export default function AdmissionSettings() {
  const queryClient = useQueryClient()
  const [admissionPrice, setAdmissionPrice] = useState('')
  const [onlineSubmissions, setOnlineSubmissions] = useState(true)
  const [autoGenerateIds, setAutoGenerateIds] = useState(true)

  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({})
  const [savedKeys, setSavedKeys] = useState<Record<string, number>>({})

  const markSaved = (key: string) => {
    const now = Date.now()
    setSavedKeys((prev) => ({ ...prev, [key]: now }))
    window.setTimeout(() => {
      setSavedKeys((prev) => {
        if (prev[key] !== now) return prev
        const next = { ...prev }
        delete next[key]
        return next
      })
    }, 1500)
  }

  const isSaving = (key: string) => Boolean(savingKeys[key])
  const isSaved = (key: string) => Boolean(savedKeys[key])

  const { data: dataRaw, isLoading } = useQuery<AdmissionSettingsPayload>({
    queryKey: ['admission-settings'],
    queryFn: async () => {
      const response = await api.get('/settings/', {
        params: {
          keys: ['admission_form_price', 'admissions_online_submissions', 'admissions_auto_generate_ids']
        }
      })
      return response.data?.data as AdmissionSettingsPayload
    }
  } as any)

  const settings = useMemo(() => dataRaw || {}, [dataRaw])

  useEffect(() => {
    setAdmissionPrice(settings.admission_form_price ? String(settings.admission_form_price) : '')
    setOnlineSubmissions(asBool(settings.admissions_online_submissions, true))
    setAutoGenerateIds(asBool(settings.admissions_auto_generate_ids, true))
  }, [settings])

  const updateSettingMutation = useMutation({
    mutationFn: async (payload: { key: string; value: any; setting_type?: string }) => {
      const response = await api.post('/settings/update', payload)
      return response.data
    },
    onMutate: async (vars) => {
      setSavingKeys((prev) => ({ ...prev, [vars.key]: true }))
      return { key: vars.key }
    },
    onSuccess: (_data, vars) => {
      markSaved(vars.key)
      queryClient.invalidateQueries({ queryKey: ['admission-settings'] })
      queryClient.invalidateQueries({ queryKey: ['admission-price'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update admissions setting')
    },
    onSettled: (_data, _error, vars) => {
      setSavingKeys((prev) => {
        const next = { ...prev }
        delete next[vars.key]
        return next
      })
    }
  })

  const updateBooleanSetting = (key: string, value: boolean) => {
    updateSettingMutation.mutate({ key, value: value ? 'true' : 'false', setting_type: 'boolean' })
  }

  const handleUpdatePrice = () => {
    if (!admissionPrice || Number.isNaN(Number.parseFloat(admissionPrice))) {
      toast.error('Please enter a valid price')
      return
    }
    updateSettingMutation.mutate({ key: 'admission_form_price', value: admissionPrice, setting_type: 'float' })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <p className="mt-4 text-gray-500">Loading admissions settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admissions</h2>
        <p className="text-gray-500 dark:text-gray-400">Configure admission form purchase and submission defaults for this school</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Admission Configuration</CardTitle>
          <CardDescription>Set the cost and basic rules for student applications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md space-y-2">
            <Label htmlFor="admissionPrice">Admission Form Price</Label>
            <div className="flex gap-3">
              <Input
                id="admissionPrice"
                type="number"
                step="0.01"
                placeholder="100.00"
                value={admissionPrice}
                onChange={(e) => setAdmissionPrice(e.target.value)}
              />
              <Button
                onClick={handleUpdatePrice}
                disabled={updateSettingMutation.isPending || isSaving('admission_form_price')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                {isSaving('admission_form_price') ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} className="mr-2" />
                )}
                Save Price
              </Button>
            </div>
            {isSaved('admission_form_price') ? <div className="text-xs text-emerald-600">Saved</div> : null}
            <p className="text-[11px] text-gray-400 italic">
              This price is shown to parents when purchasing a new admission form.
            </p>
          </div>

          <div className="border-t pt-6">
            <h4 className="text-sm font-semibold mb-4">Other Admission Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Online Submissions</p>
                  <p className="text-xs text-gray-500">Allow parents to submit forms online</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('admissions_online_submissions') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('admissions_online_submissions') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                    checked={onlineSubmissions}
                    onCheckedChange={(checked) => {
                      setOnlineSubmissions(checked)
                      updateBooleanSetting('admissions_online_submissions', checked)
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div>
                  <p className="font-medium text-sm">Auto-generate IDs</p>
                  <p className="text-xs text-gray-500">Assign application IDs automatically</p>
                </div>
                <div className="flex items-center gap-3">
                  {isSaving('admissions_auto_generate_ids') ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                  {isSaved('admissions_auto_generate_ids') ? <span className="text-xs text-emerald-600">Saved</span> : null}
                  <Switch
                    checked={autoGenerateIds}
                    onCheckedChange={(checked) => {
                      setAutoGenerateIds(checked)
                      updateBooleanSetting('admissions_auto_generate_ids', checked)
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOnlineSubmissions(true)
                  setAutoGenerateIds(true)
                  updateBooleanSetting('admissions_online_submissions', true)
                  updateBooleanSetting('admissions_auto_generate_ids', true)
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset admissions defaults
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
