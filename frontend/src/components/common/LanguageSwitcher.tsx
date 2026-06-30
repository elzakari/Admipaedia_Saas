import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
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

type LanguageCode = 'en' | 'fr';

const FlagIcon: React.FC<{ code: LanguageCode; className?: string }> = ({ code, className }) => {
  if (code === 'fr') {
    return (
      <svg
        viewBox="0 0 24 16"
        aria-hidden="true"
        className={cn('h-4 w-6 overflow-hidden rounded-sm border border-black/10 shadow-sm', className)}
      >
        <rect width="8" height="16" fill="#1f49c7" />
        <rect x="8" width="8" height="16" fill="#ffffff" />
        <rect x="16" width="8" height="16" fill="#e53b35" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden="true"
      className={cn('h-4 w-6 overflow-hidden rounded-sm border border-black/10 shadow-sm', className)}
    >
      <rect width="24" height="16" fill="#0a36a8" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#ffffff" strokeWidth="4.2" />
      <path d="M0 0L24 16M24 0L0 16" stroke="#cf142b" strokeWidth="2.2" />
      <path d="M12 0V16M0 8H24" stroke="#ffffff" strokeWidth="6.2" />
      <path d="M12 0V16M0 8H24" stroke="#cf142b" strokeWidth="3.6" />
    </svg>
  );
};

const languages = [
  { code: 'en' as const, name: 'English' },
  { code: 'fr' as const, name: 'Français' },
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
          <FlagIcon code={currentLang.code} />
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
            <FlagIcon code={lang.code} className="shrink-0" />
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
