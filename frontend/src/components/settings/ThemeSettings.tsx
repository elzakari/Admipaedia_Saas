import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun, Monitor, Check } from 'lucide-react';

const ThemeSettings = () => {
  const { themeMode, setThemeMode } = useTheme();
  const { t } = useTranslation();
  const [fontSize, setFontSize] = useState('medium');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    document.documentElement.setAttribute('data-font-size', size);
  };

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    document.documentElement.setAttribute('data-high-contrast', enabled ? 'true' : 'false');
  };

  const handleAnimationsChange = (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    document.documentElement.setAttribute('data-reduce-motion', !enabled ? 'true' : 'false');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('parent_settings.theme.title', 'Theme & Appearance')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('parent_settings.theme.description', 'Customize the look and feel of your ADMIPAEDIA')}</p>
      </div>
      
      {/* Color Theme Selection */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
        <h3 className="text-lg font-medium">{t('parent_settings.theme.color_theme', 'Color Theme')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_settings.theme.color_desc', 'Choose your preferred color scheme')}</p>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <ThemeOption 
            title={t('parent_settings.theme.light', 'Light')} 
            icon={<Sun className="h-5 w-5" />}
            active={themeMode === 'light'}
            onClick={() => setThemeMode('light')}
          />
          
          <ThemeOption 
            title={t('parent_settings.theme.dark', 'Dark')} 
            icon={<Moon className="h-5 w-5" />}
            active={themeMode === 'dark'}
            onClick={() => setThemeMode('dark')}
          />
          
          <ThemeOption 
            title={t('parent_settings.theme.system', 'System')} 
            icon={<Monitor className="h-5 w-5" />}
            active={themeMode === 'system'}
            onClick={() => setThemeMode('system')}
          />
        </div>
      </div>

      {/* Accessibility Settings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-4">
        <h3 className="text-lg font-medium">{t('parent_settings.theme.accessibility', 'Accessibility')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_settings.theme.access_desc', 'Customize accessibility preferences')}</p>
        
        <div className="space-y-6 mt-4">
          {/* Font Size */}
          <div>
            <label className="text-sm font-medium">{t('parent_settings.theme.font_size', 'Font Size')}</label>
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => handleFontSizeChange('small')} 
                className={`px-3 py-1 rounded ${fontSize === 'small' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                {t('parent_settings.theme.small', 'Small')}
              </button>
              <button 
                onClick={() => handleFontSizeChange('medium')} 
                className={`px-3 py-1 rounded ${fontSize === 'medium' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                {t('parent_settings.theme.medium', 'Medium')}
              </button>
              <button 
                onClick={() => handleFontSizeChange('large')} 
                className={`px-3 py-1 rounded ${fontSize === 'large' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                {t('parent_settings.theme.large', 'Large')}
              </button>
            </div>
          </div>
          
          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">{t('parent_settings.theme.high_contrast', 'High Contrast')}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_settings.theme.contrast_desc', 'Increase contrast for better readability')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={highContrast}
                onChange={(e) => handleHighContrastChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          {/* Animations */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">{t('parent_settings.theme.animations', 'Animations')}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_settings.theme.anim_desc', 'Enable or disable UI animations')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={animationsEnabled}
                onChange={(e) => handleAnimationsChange(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ThemeOptionProps {
  title: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  gradient?: boolean;
}

const ThemeOption: React.FC<ThemeOptionProps> = ({ title, icon, active, onClick, gradient = false }) => {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
        active 
          ? gradient 
            ? 'border-gradient-primary bg-gradient-to-br from-gradient-light to-gradient-purple' 
            : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-500'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      } ${gradient && !active ? 'hover:bg-gradient-to-br hover:from-gradient-light/50 hover:to-gradient-purple/50' : ''}`}
    >
      <div className={`mb-2 ${gradient && active ? 'text-white' : ''}`}>{icon}</div>
      <span className={`text-sm font-medium ${gradient && active ? 'text-white' : ''}`}>{title}</span>
      {active && (
        <div className={`absolute top-2 right-2 ${gradient ? 'text-white' : 'text-primary-500'}`}>
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  );
};

export default ThemeSettings;