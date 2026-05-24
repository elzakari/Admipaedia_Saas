import React, { useEffect, useState, useMemo } from 'react';
import { Sparkles, Globe, Plus, Trash2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, Form, InputNumber, Button, Space, Radio, Tag, message, Switch } from 'antd';
import billingService, { BillingPlan, PlanPricingTier } from '@/services/billingService';

type RegionalConfig = {
  country_code: string;
  currency: string;
  tiers: {
    id?: number;
    min_students: number;
    max_students: number | null;
    price_per_student_month: number;
    is_active: boolean;
  }[];
};

export default function SuperAdminPlanPricingPage() {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  
  // Top-level hook declarations (Anti-Error #300 Rules: no early returns above these)
  const [plans, setPlans] = useState<BillingPlan[] | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('none');
  const [originalTiers, setOriginalTiers] = useState<PlanPricingTier[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [minMonths, setMinMonths] = useState<string>('3');
  const [savingMinMonths, setSavingMinMonths] = useState(false);

  // Regional pricing matrix state (GH, TG, GLOBAL)
  const [regionalConfigs, setRegionalConfigs] = useState<Record<string, RegionalConfig>>({
    GLOBAL: { country_code: 'GLOBAL', currency: 'USD', tiers: [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }] },
    GH: { country_code: 'GH', currency: 'GHS', tiers: [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }] },
    TG: { country_code: 'TG', currency: 'XOF', tiers: [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }] }
  });
  const [activeCountry, setActiveCountry] = useState<string>('GLOBAL');

  // Load plans on mount
  async function loadPlans() {
    setLoading(true);
    try {
      const res = await billingService.listPlatformPlans();
      setPlans(res.plans);
      if (res.plans?.length && selectedPlanId === 'none') {
        setSelectedPlanId(String(res.plans[0].id));
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }

  // Seed default plans
  async function seedDefaults() {
    setLoading(true);
    try {
      const res = await billingService.seedDefaultPlans();
      setPlans(res.plans);
      if (res.plans?.length) {
        setSelectedPlanId(String(res.plans[0].id));
      }
      message.success(t('super_admin.plan_pricing.toasts.defaults_created', 'Default plans created'));
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Failed to seed defaults');
    } finally {
      setLoading(false);
    }
  }

  // Normalization logic helper: Forces range continuity sequence across tiers
  const normalizeTiersArray = (arr: any[]) => {
    const normalized = [...arr];
    for (let i = 0; i < normalized.length; i++) {
      if (i === 0) {
        normalized[i].min_students = 0;
      } else {
        const prevMax = normalized[i - 1].max_students;
        normalized[i].min_students = prevMax !== null && prevMax !== undefined ? Number(prevMax) + 1 : 0;
      }
      
      // Ensure the last row's max upper bound is null (infinity)
      if (i === normalized.length - 1) {
        normalized[i].max_students = null;
      }
    }
    return normalized;
  };

  // Load tiers for a specific plan
  async function loadTiers(planId: number) {
    setLoading(true);
    try {
      const res = await billingService.listPlanPricingTiers(planId);
      setOriginalTiers(res.tiers);
      
      const p = (plans || []).find((x) => x.id === planId);
      if (p) setMinMonths(String(p.billing_min_months || 3));

      // Build local state matrix grouping tiers by country
      const matrix: Record<string, RegionalConfig> = {
        GLOBAL: { country_code: 'GLOBAL', currency: 'USD', tiers: [] },
        GH: { country_code: 'GH', currency: 'GHS', tiers: [] },
        TG: { country_code: 'TG', currency: 'XOF', tiers: [] }
      };

      res.tiers.forEach((t) => {
        const code = t.country_code || 'GLOBAL';
        if (!matrix[code]) {
          matrix[code] = { country_code: code, currency: t.currency || 'USD', tiers: [] };
        }
        matrix[code].tiers.push({
          id: t.id,
          min_students: t.min_students,
          max_students: t.max_students,
          price_per_student_month: t.price_per_student_month,
          is_active: !!t.is_active
        });
      });

      // Normalize lists and ensure at least one row exists
      Object.keys(matrix).forEach((code) => {
        matrix[code].tiers.sort((a, b) => a.min_students - b.min_students);
        if (matrix[code].tiers.length === 0) {
          matrix[code].tiers = [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }];
        } else {
          matrix[code].tiers = normalizeTiersArray(matrix[code].tiers);
        }
      });

      setRegionalConfigs(matrix);
      // Hydrate the form values for the active country view
      form.setFieldsValue({
        tiers: matrix[activeCountry]?.tiers || [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }]
      });
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Failed to load tiers');
    } finally {
      setLoading(false);
    }
  }

  // Load initial plans on mount
  useEffect(() => {
    loadPlans();
  }, []);

  // Reload tiers on selected plan change
  useEffect(() => {
    const pid = Number(selectedPlanId);
    if (Number.isFinite(pid) && pid > 0) {
      loadTiers(pid);
    }
  }, [selectedPlanId, plans]);

  const selectedPlan = useMemo(() => (plans || []).find((p) => String(p.id) === selectedPlanId) || null, [plans, selectedPlanId]);

  // Save billingsettings for min months
  async function saveBillingSettings() {
    const pid = Number(selectedPlanId);
    if (!selectedPlan || !Number.isFinite(pid) || pid <= 0) return;
    const m = Number(minMonths);
    if (!Number.isFinite(m) || m < 1) {
      message.error('Minimum months must be a valid number >= 1');
      return;
    }
    setSavingMinMonths(true);
    try {
      const res = await billingService.updatePlanBillingSettings(pid, { billing_min_months: m });
      setPlans((prev) => (prev || []).map((p) => (p.id === pid ? res.plan : p)));
      message.success('Billing configuration saved successfully');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Failed to save billing settings');
    } finally {
      setSavingMinMonths(false);
    }
  }

  // Swapping the country view saves current active form state and loads target region configuration
  const handleCountryChange = (country: string) => {
    const currentFormValues = form.getFieldsValue();
    const normalizedTiers = normalizeTiersArray(currentFormValues.tiers || []);
    
    setRegionalConfigs(prev => ({
      ...prev,
      [activeCountry]: {
        ...prev[activeCountry],
        tiers: normalizedTiers
      }
    }));

    // Update active country and set form values
    setActiveCountry(country);
    form.setFieldsValue({
      tiers: regionalConfigs[country]?.tiers || [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }]
    });
  };

  // Automatically update From Enrollment on row n+1 when Up To Enrollment on row n changes
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.tiers) {
      const tiers = [...allValues.tiers];
      let changed = false;

      for (let i = 0; i < tiers.length; i++) {
        // Row 1 min_students must be 0
        if (i === 0 && tiers[i].min_students !== 0) {
          tiers[i].min_students = 0;
          changed = true;
        }
        
        // n+1 From Enrollment must be equal to row n Up To Enrollment + 1
        if (i < tiers.length - 1) {
          const currentMax = tiers[i].max_students;
          if (currentMax !== undefined && currentMax !== null && currentMax !== '') {
            const nextMin = Number(currentMax) + 1;
            if (tiers[i + 1].min_students !== nextMin) {
              tiers[i + 1].min_students = nextMin;
              changed = true;
            }
          }
        }
      }

      if (changed) {
        form.setFieldsValue({ tiers });
      }
    }
  };

  // Add new infinite tier row and convert previous one to finite range synchronously
  const handleAddRow = (add: (defaultVal?: any) => void) => {
    const currentTiers = form.getFieldValue('tiers') || [];
    let nextMin = 0;
    
    if (currentTiers.length > 0) {
      const updatedTiers = [...currentTiers];
      const lastRowIndex = updatedTiers.length - 1;
      const lastRow = { ...updatedTiers[lastRowIndex] };
      
      // Convert the previous infinite tier to a finite limit if it was null/undefined
      if (lastRow.max_students === null || lastRow.max_students === undefined || lastRow.max_students === '') {
        const defaultIncrement = 100;
        lastRow.max_students = lastRow.min_students + defaultIncrement;
      }
      
      updatedTiers[lastRowIndex] = lastRow;
      nextMin = Number(lastRow.max_students) + 1;
      
      // Update form values with the capped previous row
      form.setFieldsValue({ tiers: updatedTiers });
    }
    
    // Add the new uncapped tier row synchronously using Form.List's add callback
    add({
      min_students: nextMin,
      max_students: null,
      price_per_student_month: 0,
      is_active: true
    });
  };

  // Repair sequential ranges instantly on delete row
  const handleDeleteRow = (index: number, remove: (index: number) => void) => {
    remove(index);
    // Form.List state needs a brief microtask tick to register the array splice correctly before normalization
    setTimeout(() => {
      const remainingTiers = form.getFieldValue('tiers') || [];
      if (remainingTiers.length === 0) {
        form.setFieldsValue({
          tiers: [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }]
        });
      } else {
        const normalized = normalizeTiersArray(remainingTiers);
        form.setFieldsValue({ tiers: normalized });
      }
    }, 0);
  };

  // Submit full pricing matrix to backend
  const onFinish = async (values: { tiers: any[] }) => {
    const pid = Number(selectedPlanId);
    if (!selectedPlan || !Number.isFinite(pid) || pid <= 0) return;

    // Normalizing the tiers payload to commit
    const activeTiers = normalizeTiersArray(values.tiers || []);
    const updatedConfigs = {
      ...regionalConfigs,
      [activeCountry]: {
        ...regionalConfigs[activeCountry],
        tiers: activeTiers
      }
    };

    setLoading(true);
    try {
      // Gather flat list of all tiers across all country segments
      const originalIds = (originalTiers || []).map(x => x.id);
      const currentTiersList: any[] = [];
      
      Object.entries(updatedConfigs).forEach(([code, cfg]) => {
        cfg.tiers.forEach((t) => {
          currentTiersList.push({
            ...t,
            country_code: code === 'GLOBAL' ? null : code,
            currency: cfg.currency
          });
        });
      });

      const currentIds = currentTiersList.map(x => x.id).filter((id): id is number => id !== undefined);
      const deletedIds = originalIds.filter(id => !currentIds.includes(id));

      // 1. Delete removed brackets
      for (const id of deletedIds) {
        await billingService.deletePlanPricingTier(id);
      }

      // 2. Update/Save existing and newly created tiers
      for (const tier of currentTiersList) {
        const payload = {
          plan_id: pid,
          country_code: tier.country_code ? tier.country_code.toUpperCase() : null,
          currency: tier.currency.toUpperCase(),
          min_students: Number(tier.min_students),
          max_students: tier.max_students !== null && tier.max_students !== '' ? Number(tier.max_students) : null,
          price_per_student_month: Number(tier.price_per_student_month),
          is_active: !!tier.is_active
        };

        if (tier.id !== undefined) {
          await billingService.updatePlanPricingTier(tier.id, payload);
        } else {
          await billingService.createPlanPricingTier(pid, payload as any);
        }
      }

      message.success('Regional plan pricing matrix updated successfully');
      // Reload plans and tiers from backend
      await loadTiers(pid);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Failed to save regional pricing configurations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-500" />
            {t('super_admin.plan_pricing.title', 'Plan Pricing Configurations')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('super_admin.plan_pricing.subtitle', 'Configure segmented, non-overlapping pricing tiers structured dynamically by country and currency.')}
          </p>
        </div>
      </div>

      {/* Card 1: Global Plan Settings */}
      <Card
        title={
          <div className="flex items-center gap-2 font-semibold text-slate-800 text-base">
            <Info className="h-5 w-5 text-indigo-500" />
            {t('super_admin.plan_pricing.select_plan.title', 'Global Plan Configurations')}
          </div>
        }
        bordered={true}
        style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', tracking: '0.05em' }}>
              {t('super_admin.plan_pricing.select_plan.plan', 'Active Plan')}
            </span>
            <Radio.Group
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              {(plans || []).map((p) => (
                <Radio.Button key={p.id} value={String(p.id)} style={{ borderRadius: '8px', margin: '2px' }}>
                  {p.name}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>

          {selectedPlan && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', tracking: '0.05em' }}>
                {t('super_admin.plan_pricing.select_plan.min_billing_months', 'Min Billing Months')}
              </span>
              <InputNumber
                min={1}
                value={Number(minMonths)}
                onChange={(val) => setMinMonths(String(val || 3))}
                style={{ width: '160px', borderRadius: '8px' }}
              />
            </div>
          )}

          {plans?.length === 0 && (
            <Button type="dashed" onClick={seedDefaults} loading={loading} style={{ borderRadius: '8px' }}>
              {t('super_admin.plan_pricing.select_plan.seed_defaults', 'Seed Default Plans')}
            </Button>
          )}

          <Button
            type="primary"
            onClick={saveBillingSettings}
            disabled={!selectedPlan || savingMinMonths}
            loading={savingMinMonths}
            style={{
              backgroundColor: '#4f46e5',
              borderColor: '#4f46e5',
              borderRadius: '8px',
              fontWeight: 500
            }}
          >
            {t('common.save', 'Save Configuration')}
          </Button>
        </div>
      </Card>

      {/* Card 2: Tiered Matrix Settings */}
      {selectedPlan && (
        <Card
          title={
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-base">
              <Globe className="h-5 w-5 text-indigo-500" />
              {t('super_admin.plan_pricing.tiers.title', 'Regional Pricing Tiers Matrix')}
            </div>
          }
          bordered={true}
          style={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {/* Antigravity high-level routing buttons array */}
          <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.keys(regionalConfigs).map((code) => (
              <Button
                key={code}
                type={activeCountry === code ? 'primary' : 'default'}
                onClick={() => handleCountryChange(code)}
                style={{
                  borderRadius: '8px',
                  backgroundColor: activeCountry === code ? '#4f46e5' : undefined,
                  borderColor: activeCountry === code ? '#4f46e5' : undefined
                }}
              >
                {code === 'GLOBAL' ? 'Global Plan' : `${code} Region`}
              </Button>
            ))}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: '#eef2f6',
            border: '1px solid #cbd5e1',
            color: '#334155',
            fontSize: '14px'
          }}>
            <Info className="h-4 w-4 text-indigo-500" />
            <span>
              Pricing for <strong>{activeCountry === 'GLOBAL' ? 'Global Region' : `${activeCountry} Region`}</strong> is managed in <strong>{regionalConfigs[activeCountry]?.currency}</strong>.
            </span>
          </div>

          <Form
            form={form}
            name="pricing_tiers_form"
            onFinish={onFinish}
            onValuesChange={handleFormValuesChange}
            layout="vertical"
            initialValues={{
              tiers: regionalConfigs[activeCountry]?.tiers || [{ min_students: 0, max_students: null, price_per_student_month: 0, is_active: true }]
            }}
          >
            <Form.List name="tiers">
              {(fields, { add, remove }) => (
                <div>
                  {fields.map((field, idx) => (
                    <Space
                      key={field.key}
                      align="baseline"
                      style={{
                        display: 'flex',
                        marginBottom: 16,
                        padding: '16px 24px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}
                    >
                      {/* From Enrollment: strictly disabled and bound to 0 on Row 1 */}
                      <Form.Item
                        {...field}
                        label="From Enrollment"
                        name={[field.name, 'min_students']}
                        fieldKey={[field.fieldKey, 'min_students'] as any}
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          disabled={true}
                          min={0}
                          style={{ width: '130px', borderRadius: '8px', color: '#475569', fontWeight: 'bold' }}
                        />
                      </Form.Item>

                      {/* Up To Enrollment: editable, except last row which is uncapped */}
                      <Form.Item
                        {...field}
                        label="Up To Enrollment"
                        name={[field.name, 'max_students']}
                        fieldKey={[field.fieldKey, 'max_students'] as any}
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (idx === fields.length - 1) {
                                if (value === null || value === undefined || value === '') {
                                  return Promise.resolve();
                                }
                              }
                              const minVal = getFieldValue(['tiers', idx, 'min_students']);
                              if (value !== null && value !== undefined && value !== '') {
                                if (Number(value) <= Number(minVal)) {
                                  return Promise.reject(new Error('Must be higher than From Enrollment'));
                                }
                              } else {
                                if (idx < fields.length - 1) {
                                  return Promise.reject(new Error('Required range limit'));
                                }
                              }
                              return Promise.resolve();
                            }
                          })
                        ]}
                      >
                        {idx === fields.length - 1 ? (
                          <InputNumber
                            placeholder="∞ Uncapped"
                            disabled={true}
                            style={{ width: '140px', borderRadius: '8px', color: '#94a3b8', fontStyle: 'italic' }}
                          />
                        ) : (
                          <InputNumber
                            min={0}
                            style={{ width: '140px', borderRadius: '8px' }}
                          />
                        )}
                      </Form.Item>

                      {/* Price / Student / Month */}
                      <Form.Item
                        {...field}
                        label={`Price / Student / Month (${regionalConfigs[activeCountry]?.currency})`}
                        name={[field.name, 'price_per_student_month']}
                        fieldKey={[field.fieldKey, 'price_per_student_month'] as any}
                        rules={[
                          { required: true, message: 'Price is required' },
                          {
                            validator(_, value) {
                              if (value !== null && value !== undefined && value !== '') {
                                if (Number(value) < 0) {
                                  return Promise.reject(new Error('Must be >= 0'));
                                }
                              }
                              return Promise.resolve();
                            }
                          }
                        ]}
                      >
                        <InputNumber
                          min={0}
                          precision={2}
                          step={0.01}
                          style={{ width: '190px', borderRadius: '8px' }}
                        />
                      </Form.Item>

                      {/* Status switch */}
                      <Form.Item
                        {...field}
                        label="Status (Active)"
                        name={[field.name, 'is_active']}
                        fieldKey={[field.fieldKey, 'is_active'] as any}
                        valuePropName="checked"
                      >
                        <Switch />
                      </Form.Item>

                      {/* Action buttons (Delete tier row) */}
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          onClick={() => handleDeleteRow(idx, remove)}
                          icon={<Trash2 className="h-4 w-4" />}
                          style={{ marginTop: '30px' }}
                        />
                      )}
                    </Space>
                  ))}

                  <Form.Item>
                    <Button
                      type="dashed"
                      onClick={() => handleAddRow(add)}
                      icon={<Plus className="h-4 w-4" />}
                      style={{ width: '100%', borderRadius: '8px', height: '40px' }}
                    >
                      Add Bracket Pricing Tier
                    </Button>
                  </Form.Item>
                </div>
              )}
            </Form.List>

            <Form.Item style={{ marginTop: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  backgroundColor: '#4f46e5',
                  borderColor: '#4f46e5',
                  borderRadius: '8px',
                  fontWeight: 500,
                  height: '42px',
                  padding: '0 24px'
                }}
              >
                Submit Plan Pricing Matrix
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
