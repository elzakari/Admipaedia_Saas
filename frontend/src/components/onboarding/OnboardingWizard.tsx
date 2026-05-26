import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Building2, BookOpen, CalendarDays, ArrowRight, ArrowLeft, Check, Languages } from 'lucide-react';
import { api } from '@/lib/api';
import { useSaasTenant } from '@/hooks/useSaasTenant';
import { useToast } from '@/components/ui/use-toast';

// Local i18n support for EN, FR, and EWE
const translations: Record<string, any> = {
  en: {
    wizardTitle: "School Activation Wizard",
    wizardDesc: "Welcome to ADMIPAEDIA. Let's establish your foundational school setup in 3 simple steps.",
    step1Title: "School Profile",
    step1Desc: "Confirm the core contact information and default billing currency for your school.",
    step2Title: "Educational Framework",
    step2Desc: "Align your classes with an official educational curriculum standard.",
    step3Title: "Academic Calendar",
    step3Desc: "Establish your first active academic year and term boundary blocks.",
    schoolName: "School Name",
    schoolNamePlaceholder: "e.g., College Germinos",
    address: "Physical Address",
    addressPlaceholder: "e.g., 12 Pine Avenue, Accra",
    contact: "Contact Phone / Email",
    contactPlaceholder: "e.g., admin@germinos.edu.gh",
    currency: "Default Currency Code",
    educationSystem: "Education Curriculum System",
    educationSystemDesc: "Select the framework that structures your classes and assessment policies.",
    academicYear: "Academic Year String",
    academicYearPlaceholder: "e.g., 2026/2027",
    termName: "First Term Name",
    termNamePlaceholder: "e.g., Term 1 or First Semester",
    termStart: "Term 1 Start Date",
    termEnd: "Term 1 End Date",
    back: "Back",
    next: "Next Step",
    complete: "Activate School Workspace",
    submitting: "Provisioning environment...",
    required: "This field is required",
    validationError: "Please fill in all required fields accurately."
  },
  fr: {
    wizardTitle: "Assistant d'Intégration de l'École",
    wizardDesc: "Bienvenue sur ADMIPAEDIA. Configurons les bases de votre école en 3 étapes simples.",
    step1Title: "Profil de l'École",
    step1Desc: "Confirmez les informations de contact de base et la devise par défaut de votre école.",
    step2Title: "Cadre Éducatif",
    step2Desc: "Alignez vos classes avec une norme officielle de programme éducatif.",
    step3Title: "Calendrier Académique",
    step3Desc: "Établissez votre première année académique active et les limites du trimestre.",
    schoolName: "Nom de l'École",
    schoolNamePlaceholder: "ex: Collège Germinos",
    address: "Adresse Physique",
    addressPlaceholder: "ex: 12 Avenue Pine, Lomé",
    contact: "Téléphone / E-mail de Contact",
    contactPlaceholder: "ex: admin@germinos.edu.tg",
    currency: "Code de Devise par Défaut",
    educationSystem: "Système de Programme Scolaire",
    educationSystemDesc: "Sélectionnez le cadre qui structure vos classes et vos politiques d'évaluation.",
    academicYear: "Libellé de l'Année Académique",
    academicYearPlaceholder: "ex: 2026/2027",
    termName: "Nom du Premier Trimestre",
    termNamePlaceholder: "ex: Trimestre 1 ou Premier Semestre",
    termStart: "Date de Début du Trimestre 1",
    termEnd: "Date de Fin du Trimestre 1",
    back: "Retour",
    next: "Étape Suivante",
    complete: "Activer l'Espace École",
    submitting: "Provisionnement de l'environnement...",
    required: "Ce champ est requis",
    validationError: "Veuillez remplir tous les champs obligatoires avec précision."
  },
  ewe: {
    wizardTitle: "Suku Dɔwɔƒe Dzraɖo Mɔfiame",
    wizardDesc: "Woezɔ̃ va ADMIPAEDIA. Mina míawɔ suku gɔmeɖoanyi kaba le afɔɖeɖe 3 kpleme.",
    step1Title: "Suku Ƒe Ŋutinya",
    step1Desc: "Tia suku ƒe kadodomɔwo kple suku gakpɔ gbãtɔ kaba.",
    step2Title: "Hehenyawo Dzraɖo",
    step2Desc: "Tia nusrɔ̃na kple hehenyawo ƒe dzraɖo suku lɔ.",
    step3Title: "Suku Ɣeyiɣiwo",
    step3Desc: "De suku ƒe dzraɖo suku ɣeyiɣi gbãtɔ kple trimestre 1 nuwuwu.",
    schoolName: "Suku Ƒe Ŋkɔ",
    schoolNamePlaceholder: "ex: Suku Germinos",
    address: "Suku Ƒe Nɔƒe",
    addressPlaceholder: "ex: 12 Pine Mɔ, Kpalimé",
    contact: "Kaƒodome / Suku Email",
    contactPlaceholder: "ex: admin@germinos.edu.ewe",
    currency: "Gakpɔ Ƒe Dzesi",
    educationSystem: "Nusrɔ̃na Ƒe Dzraɖo Mɔnu",
    educationSystemDesc: "Tia hehenya mɔnu si zã suku tsatsa nusrɔ̃awo.",
    academicYear: "Suku Ƒe Ƒe Dzesi",
    academicYearPlaceholder: "ex: 2026/2027",
    termName: "Trimestre Gbãtɔ Ƒe Ŋkɔ",
    termNamePlaceholder: "ex: Trimestre 1 mɔnu",
    termStart: "Trimestre 1 Gɔmedzegbe",
    termEnd: "Trimestre 1 Nuwuwugbe",
    back: "Gbugbɔ",
    next: "Yi Ŋgɔ",
    complete: "Wuwu Suku Dzraɖo Nu",
    submitting: "Suku mɔnu dzraɖo...",
    required: "Ele be nàŋlɔ nu ɖe afii",
    validationError: "Taflatse, de nu kpekpewo katã kaba."
  }
};

const frameworks = [
  { key: 'gh_ges_standard', name: 'Ghana Education Service (GES)' },
  { key: 'tg_standard', name: 'Togo National Curriculum' },
  { key: 'uk_cambridge', name: 'British Cambridge (IGCSE / A-Levels)' },
  { key: 'us_common_core', name: 'US Common Core Curriculum' },
  { key: 'bj_standard', name: 'Benin National Curriculum' },
  { key: 'ng_nerdc_standard', name: 'Nigeria NERDC (9-3-4)' },
  { key: 'ke_cbc_standard', name: 'Kenya Competency Based Curriculum (CBC)' },
  { key: 'za_caps_standard', name: 'South Africa CAPS' }
];

export default function OnboardingWizard({ tenant, onComplete }: { tenant: any; onComplete: () => void }) {
  const { toast } = useToast();
  const [lang, setLang] = useState<'en' | 'fr' | 'ewe'>('en');
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = translations[lang];

  // State values mapping steps
  const [schoolName, setSchoolName] = useState(tenant?.name || '');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [currency, setCurrency] = useState(tenant?.currency || 'GHS');

  const [educationSystem, setEducationSystem] = useState('');

  const [academicYearName, setAcademicYearName] = useState('2026/2027');
  const [termName, setTermName] = useState('Term 1');
  const [termStartDate, setTermStartDate] = useState('2026-09-01');
  const [termEndDate, setTermEndDate] = useState('2026-12-15');

  const [errors, setErrors] = useState<Record<string, boolean>>({});

  function validateStep(currentStep: number): boolean {
    const stepErrors: Record<string, boolean> = {};

    if (currentStep === 1) {
      if (!schoolName.trim()) stepErrors.schoolName = true;
      if (!currency.trim()) stepErrors.currency = true;
    } else if (currentStep === 2) {
      if (!educationSystem) stepErrors.educationSystem = true;
    } else if (currentStep === 3) {
      if (!academicYearName.trim()) stepErrors.academicYearName = true;
      if (!termName.trim()) stepErrors.termName = true;
      if (!termStartDate) stepErrors.termStartDate = true;
      if (!termEndDate) stepErrors.termEndDate = true;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    } else {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: t.validationError
      });
    }
  }

  function handleBack() {
    setStep((prev) => prev - 1);
  }

  async function handleComplete() {
    if (isSubmitting) return;
    if (!validateStep(3)) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: t.validationError
      });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = {
        tenant_id: tenant?.id,
        school_name: schoolName,
        address,
        contact,
        currency,
        education_system: educationSystem,
        educational_system: educationSystem,
        main_branch_name: "Main Campus",
        academic_year: new Date().getFullYear().toString(),
        academic_year_name: academicYearName,
        term_name: termName,
        term_start_date: termStartDate,
        term_end_date: termEndDate
      };

      const res = await api.post('/tenant/complete-setup', payload, {
        timeout: 30000 // 30-second fault-tolerance threshold
      });
      
      if (res.data.success) {
        toast({
          title: 'School activated!',
          description: `Successfully onboarded ${schoolName}`
        });
        
        // Notify parent layout wrapper to refresh tenant metadata
        onComplete();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || "Setup failed due to temporary network loss.";
      setErrorMessage(msg);
      toast({
        variant: 'destructive',
        title: 'Setup failed',
        description: msg
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Top Bar with Language Selector */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/10">
            A
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
            ADMIPAEDIA
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 shadow-sm">
          <Languages size={14} className="text-slate-400 shrink-0" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-1"
          >
            <option value="en">English (EN)</option>
            <option value="fr">Français (FR)</option>
            <option value="ewe">Ewegbe (EWE)</option>
          </select>
        </div>
      </div>

      {/* Main Wizard Card */}
      <Card className="max-w-3xl mx-auto w-full border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden bg-white dark:bg-slate-900 flex-1 flex flex-col justify-between p-8 sm:p-10 relative">
        
        {/* Horizontal Progress Ring / Indicators */}
        <div className="w-full shrink-0 mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            
            {[1, 2, 3].map((stepIdx) => {
              const active = step >= stepIdx;
              const completed = step > stepIdx;
              return (
                <div key={stepIdx} className="flex flex-col items-center z-10">
                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    completed 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : active 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}>
                    {completed ? <Check size={14} strokeWidth={3} /> : stepIdx}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors ${
                    active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}>
                    {stepIdx === 1 ? t.step1Title : stepIdx === 2 ? t.step2Title : t.step3Title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Wizard Steps */}
        <div className="flex-1 flex flex-col justify-center">
          {isSubmitting ? (
            /* Loading skeletons during submission */
            <div className="space-y-6 py-6 animate-pulse">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3 mx-auto"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-md w-2/3 mx-auto"></div>
              <div className="space-y-3 max-w-md mx-auto pt-6">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
              </div>
              <p className="text-sm font-semibold text-slate-500 text-center pt-4">{t.submitting}</p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Building2 className="h-6 w-6 text-indigo-600" />
                      {t.step1Title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-normal">{t.step1Desc}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName" className="font-bold text-slate-700 dark:text-slate-300">
                        {t.schoolName} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="schoolName"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder={t.schoolNamePlaceholder}
                        className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500/20 ${
                          errors.schoolName ? 'border-red-500 focus:ring-red-500/20' : ''
                        }`}
                      />
                      {errors.schoolName && <p className="text-xs font-semibold text-red-500 mt-1">{t.required}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact" className="font-bold text-slate-700 dark:text-slate-300">{t.contact}</Label>
                        <Input
                          id="contact"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder={t.contactPlaceholder}
                          className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency" className="font-bold text-slate-700 dark:text-slate-300">
                          {t.currency} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="currency"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                          placeholder="e.g., GHS, USD, EUR, XOF"
                          className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 ${
                            errors.currency ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.currency && <p className="text-xs font-semibold text-red-500 mt-1">{t.required}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="font-bold text-slate-700 dark:text-slate-300">{t.address}</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t.addressPlaceholder}
                        className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <BookOpen className="h-6 w-6 text-indigo-600" />
                      {t.step2Title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-normal">{t.step2Desc}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-bold text-slate-700 dark:text-slate-300">
                        {t.educationSystem} <span className="text-red-500">*</span>
                      </Label>
                      <div className="text-xs text-slate-400 mb-2 leading-relaxed">{t.educationSystemDesc}</div>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {frameworks.map((f) => {
                          const isSelected = educationSystem === f.key;
                          return (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setEducationSystem(f.key)}
                              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all group ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md shadow-indigo-600/5'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <span className={`text-sm font-bold block ${
                                  isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                                }`}>
                                  {f.name}
                                </span>
                                <span className="text-[11px] text-slate-400 block group-hover:text-slate-500">
                                  System code: {f.key}
                                </span>
                              </div>

                              <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected 
                                  ? 'bg-indigo-600 border-indigo-600 text-white' 
                                  : 'border-slate-300 bg-white dark:bg-slate-900'
                              }`}>
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {errors.educationSystem && <p className="text-xs font-semibold text-red-500 mt-1">{t.required}</p>}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <CalendarDays className="h-6 w-6 text-indigo-600" />
                      {t.step3Title}
                    </h3>
                    <p className="text-sm text-slate-500 leading-normal">{t.step3Desc}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="yearName" className="font-bold text-slate-700 dark:text-slate-300">
                          {t.academicYear} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="yearName"
                          value={academicYearName}
                          onChange={(e) => setAcademicYearName(e.target.value)}
                          placeholder={t.academicYearPlaceholder}
                          className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 ${
                            errors.academicYearName ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.academicYearName && <p className="text-xs font-semibold text-red-500 mt-1">{t.required}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="termName" className="font-bold text-slate-700 dark:text-slate-300">
                          {t.termName} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="termName"
                          value={termName}
                          onChange={(e) => setTermName(e.target.value)}
                          placeholder={t.termNamePlaceholder}
                          className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 ${
                            errors.termName ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.termName && <p className="text-xs font-semibold text-red-500 mt-1">{t.required}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="termStart" className="font-bold text-slate-700 dark:text-slate-300">
                          {t.termStart} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="termStart"
                          type="date"
                          value={termStartDate}
                          onChange={(e) => setTermStartDate(e.target.value)}
                          className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 ${
                            errors.termStartDate ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.termStartDate && <p className="text-xs font-semibold text-red-500 mt-1">{t.required}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="termEnd" className="font-bold text-slate-700 dark:text-slate-300">
                          {t.termEnd} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="termEnd"
                          type="date"
                          value={termEndDate}
                          onChange={(e) => setTermEndDate(e.target.value)}
                          className={`h-11 rounded-xl bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 ${
                            errors.termEndDate ? 'border-red-500' : ''
                          }`}
                        />
                        {errors.termEndDate && <p className="text-xs font-semibold text-red-500 mt-1">{t.required}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Wizard Footer Controls */}
        {!isSubmitting && (
          <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800 shrink-0 mt-8">
            <Button
              type="button"
              variant="outline"
              disabled={step === 1}
              onClick={handleBack}
              className="h-11 px-5 border-slate-200 dark:border-slate-700 rounded-xl font-bold bg-white text-slate-700"
            >
              <ArrowLeft size={16} className="mr-2" />
              {t.back}
            </Button>

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center"
              >
                {t.next}
                <ArrowRight size={16} className="ml-2 animate-bounce-horizontal" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleComplete}
                className="h-11 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 group transition-all"
              >
                <Sparkles size={16} className="animate-pulse" />
                {t.complete}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Footer Branding */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-8 shrink-0">
        © {new Date().getFullYear()} ADMIPAEDIA Educational SaaS Platform. All rights reserved.
      </div>
    </div>
  );
}
