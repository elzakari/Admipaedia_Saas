import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/use-toast';
import { settingsService } from '../../services/settingsService';
import { Zap, Brain, Bot, MessageSquare, Sparkles, AlertTriangle } from 'lucide-react';

const AISettings = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for form fields
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiModel, setAiModel] = useState('gpt-4');
  const [creativityLevel, setCreativityLevel] = useState([0.7]);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [smartInsights, setSmartInsights] = useState(true);
  const [aiAssistant, setAiAssistant] = useState(true);
  const [smartReplies, setSmartReplies] = useState(true);
  const [contentGeneration, setContentGeneration] = useState(true);
  const [dataRetention, setDataRetention] = useState('30');
  const [useDataForTraining, setUseDataForTraining] = useState(true);
  const [studentDataProtection, setStudentDataProtection] = useState(true);
  const [maxTokens, setMaxTokens] = useState('2048');
  const [temperature, setTemperature] = useState('0.7');
  const [contextWindow, setContextWindow] = useState('medium');

  // Fetch AI settings
  const { data: aiSettings, isLoading, error } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => settingsService.getAISettings(),
  });

  // Update AI settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (updatedSettings: any) => settingsService.updateAISettings(updatedSettings),
    onSuccess: () => {
      toast({
        title: t('admin_settings.settings_updated', 'Settings Updated'),
        description: t('admin_settings.ai_settings_updated_desc', 'AI settings have been updated successfully.'),
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    },
    onError: (error) => {
      toast({
        title: t('admin_settings.update_failed', 'Update Failed'),
        description: error instanceof Error ? error.message : t('admin_settings.ai_settings_update_failed', 'Failed to update AI settings. Please try again.'),
        variant: "destructive"
      });
    }
  });

  // Load settings into local state when data is fetched
  useEffect(() => {
    if (aiSettings) {
      setAiEnabled(aiSettings.aiEnabled ?? true);
      setAiModel(aiSettings.aiModel ?? 'gpt-4');
      setCreativityLevel([aiSettings.creativityLevel ?? 0.7]);
      setApiKey(aiSettings.apiKey ?? '');
      setSmartInsights(aiSettings.smartInsights ?? true);
      setAiAssistant(aiSettings.aiAssistant ?? true);
      setSmartReplies(aiSettings.smartReplies ?? true);
      setContentGeneration(aiSettings.contentGeneration ?? true);
      setDataRetention(aiSettings.dataRetention ?? '30');
      setUseDataForTraining(aiSettings.useDataForTraining ?? true);
      setStudentDataProtection(aiSettings.studentDataProtection ?? true);
      setMaxTokens(aiSettings.maxTokens ?? '2048');
      setTemperature(aiSettings.temperature ?? '0.7');
      setContextWindow(aiSettings.contextWindow ?? 'medium');
    }
  }, [aiSettings]);

  const handleSaveChanges = () => {
    const settings = {
      aiEnabled,
      aiModel,
      creativityLevel: creativityLevel[0],
      apiKey,
      smartInsights,
      aiAssistant,
      smartReplies,
      contentGeneration,
      dataRetention,
      useDataForTraining,
      studentDataProtection,
      maxTokens,
      temperature,
      contextWindow
    };
    
    updateSettingsMutation.mutate(settings);
  };

  const handleResetToDefaults = () => {
    setAiEnabled(true);
    setAiModel('gpt-4');
    setCreativityLevel([0.7]);
    setApiKey('');
    setSmartInsights(true);
    setAiAssistant(true);
    setSmartReplies(true);
    setContentGeneration(true);
    setDataRetention('30');
    setUseDataForTraining(true);
    setStudentDataProtection(true);
    setMaxTokens('2048');
    setTemperature('0.7');
    setContextWindow('medium');
    toast({
      title: t('admin_settings.settings_reset', 'Settings Reset'),
      description: t('admin_settings.ai_settings_reset_desc', 'AI settings have been reset to defaults.'),
      variant: "default"
    });
  };

  const creativityValue = creativityLevel[0] ?? 0.7;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.ai_settings', 'AI Settings')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.ai_settings_desc', 'Configure AI features and behavior')}</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.ai_settings', 'AI Settings')}</h2>
          <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.ai_settings_desc', 'Configure AI features and behavior')}</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600 dark:text-red-400">
              <p>{t('admin_settings.ai_settings_load_failed', 'Failed to load AI settings. Please try again later.')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('admin_settings.ai_settings', 'AI Settings')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('admin_settings.ai_settings_desc', 'Configure AI features and behavior')}</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">{t('admin_settings.general', 'General')}</TabsTrigger>
          <TabsTrigger value="model">{t('admin_settings.model', 'Model')}</TabsTrigger>
          <TabsTrigger value="privacy">{t('admin_settings.privacy', 'Privacy')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_settings.features', 'Features')}</CardTitle>
              <CardDescription>{t('admin_settings.features_desc', 'Enable or disable AI-powered features')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai-enabled" className="flex items-center gap-2"><Zap className="h-4 w-4" /> {t('admin_settings.enable_ai', 'Enable AI')}</Label>
                  <p className="text-sm text-muted-foreground">{t('admin_settings.enable_ai_desc', 'Turn AI features on or off globally')}</p>
                </div>
                <Switch id="ai-enabled" checked={aiEnabled} onCheckedChange={setAiEnabled} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="api-key" className="flex items-center gap-2"><Bot className="h-4 w-4" /> {t('admin_settings.api_key', 'API Key')}</Label>
                  <div className="flex gap-2">
                    <Input id="api-key" type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t('admin_settings.enter_api_key', 'Enter provider API key')} />
                    <Button type="button" variant="outline" onClick={() => setShowApiKey((v) => !v)}>
                      {showApiKey ? t('common.hide', 'Hide') : t('common.show', 'Show')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> {t('admin_settings.creativity', 'Creativity')}</Label>
                  <Slider value={creativityLevel} onValueChange={setCreativityLevel} min={0} max={1} step={0.05} />
                  <p className="text-xs text-muted-foreground">{t('admin_settings.creativity_current', 'Current: ')}{creativityValue.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2"><Brain className="h-4 w-4" /> {t('admin_settings.smart_insights', 'Smart Insights')}</Label>
                    <p className="text-sm text-muted-foreground">{t('admin_settings.smart_insights_desc', 'Enable analytics-driven suggestions')}</p>
                  </div>
                  <Switch checked={smartInsights} onCheckedChange={setSmartInsights} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> {t('admin_settings.smart_replies', 'Smart Replies')}</Label>
                    <p className="text-sm text-muted-foreground">{t('admin_settings.smart_replies_desc', 'Suggest responses in messaging')}</p>
                  </div>
                  <Switch checked={smartReplies} onCheckedChange={setSmartReplies} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_settings.model_config', 'Model Configuration')}</CardTitle>
              <CardDescription>{t('admin_settings.model_config_desc', 'Choose model and runtime parameters')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('admin_settings.model', 'Model')}</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_settings.select_model', 'Select model')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4">{t('admin_settings.openai_gpt4', 'OpenAI GPT-4')}</SelectItem>
                      <SelectItem value="gpt-4o">{t('admin_settings.openai_gpt4o', 'OpenAI GPT-4o')}</SelectItem>
                      <SelectItem value="claude-3-5">{t('admin_settings.anthropic_claude35', 'Anthropic Claude 3.5')}</SelectItem>
                      <SelectItem value="gemini-1.5">{t('admin_settings.google_gemini15', 'Google Gemini 1.5')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_settings.max_tokens', 'Max Tokens')}</Label>
                  <Input value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} placeholder="2048" />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_settings.temperature', 'Temperature')}</Label>
                  <Input value={temperature} onChange={(e) => setTemperature(e.target.value)} placeholder="0.7" />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin_settings.context_window', 'Context Window')}</Label>
                  <Select value={contextWindow} onValueChange={setContextWindow}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin_settings.select_window', 'Select window')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">{t('admin_settings.window_small', 'Small')}</SelectItem>
                      <SelectItem value="medium">{t('admin_settings.window_medium', 'Medium')}</SelectItem>
                      <SelectItem value="large">{t('admin_settings.window_large', 'Large')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_settings.privacy_data', 'Privacy & Data')}</CardTitle>
              <CardDescription>{t('admin_settings.privacy_data_desc', 'Control data handling and retention')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('admin_settings.data_retention', 'Data Retention (days)')}</Label>
                  <Input value={dataRetention} onChange={(e) => setDataRetention(e.target.value)} placeholder="30" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t('admin_settings.use_data_training', 'Use Data for Training')}</Label>
                    <p className="text-sm text-muted-foreground">{t('admin_settings.use_data_training_desc', 'Allow anonymized usage for model improvement')}</p>
                  </div>
                  <Switch checked={useDataForTraining} onCheckedChange={setUseDataForTraining} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('admin_settings.protect_student_data', 'Protect Student Data')}</Label>
                    <p className="text-sm text-muted-foreground">{t('admin_settings.protect_student_data_desc', 'Mask sensitive fields in prompts')}</p>
                  </div>
                  <Switch checked={studentDataProtection} onCheckedChange={setStudentDataProtection} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('admin_settings.ai_assistant', 'AI Assistant')}</Label>
                    <p className="text-sm text-muted-foreground">{t('admin_settings.ai_assistant_desc', 'Enable in-app assistant')}</p>
                  </div>
                  <Switch checked={aiAssistant} onCheckedChange={setAiAssistant} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={handleResetToDefaults}>{t('admin_settings.reset_defaults', 'Reset to Defaults')}</Button>
        <Button type="button" onClick={handleSaveChanges}>{t('school_settings.save_changes', 'Save Changes')}</Button>
      </div>
    </div>
  );
};

export default AISettings;
