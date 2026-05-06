import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Button } from './button';
import { applyDocumentLanguage, markLanguageOverride, normalizeLanguage } from '@/lib/countryLanguage';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳' },
  { code: 'yo', name: 'Yorùbá', flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', flag: '🇳🇬' },
  { code: 'bm', name: 'Bamanankan', flag: '🇲🇱' },
  { code: 'ff', name: 'Fulfulde', flag: '🇬🇳' },
  { code: 'ak', name: 'Akan', flag: '🇬🇭' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const isCasaos = theme === 'casaos';

  const handleLanguageChange = (langCode: string) => {
    markLanguageOverride();
    i18n.changeLanguage(langCode);
    applyDocumentLanguage(langCode);
  };

  const currentCode = normalizeLanguage(i18n.language || 'en');
  const currentLang = languages.find(l => l.code === currentCode) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "flex items-center gap-2 h-10 px-3 rounded-xl transition-all border",
            isCasaos 
              ? "bg-white/5 border-white/5 text-slate-300 hover:text-white hover:bg-white/10" 
              : "bg-white/50 border-slate-200/50 text-slate-600 hover:text-indigo-600 hover:bg-white shadow-sm"
          )}
        >
          <span className="text-lg leading-none">{currentLang.flag}</span>
          <span className="text-xs font-medium uppercase tracking-wider hidden md:inline-block">{currentLang.code}</span>
          <ChevronDown className={cn("h-3 w-3 opacity-50", isCasaos ? "text-slate-500" : "text-slate-400")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className={cn(
          "w-56 mt-2 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden border-none",
          isCasaos ? "bg-[#1A1F26] text-white" : "bg-white"
        )}
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
              isCasaos 
                ? "text-slate-300 hover:bg-white/5 hover:text-white" 
                : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600",
              currentLang.code === lang.code && (isCasaos ? "bg-white/5 text-white" : "bg-indigo-50 text-indigo-600 font-medium")
            )}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="text-sm">{lang.name}</span>
            {currentLang.code === lang.code && (
              <span className={cn(
                "ml-auto text-xs",
                isCasaos ? "text-blue-400" : "text-indigo-600"
              )}>✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
