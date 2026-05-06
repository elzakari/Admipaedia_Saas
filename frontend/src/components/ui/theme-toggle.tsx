import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "./button";
import { useTheme } from "../../contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setThemeMode('light')}
        className={`${themeMode === 'light' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
        aria-label="Light mode"
        title="Light mode"
      >
        <Sun className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setThemeMode('dark')}
        className={`${themeMode === 'dark' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
        aria-label="Dark mode"
        title="Dark mode"
      >
        <Moon className="h-5 w-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setThemeMode('system')}
        className={`${themeMode === 'system' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
        aria-label="System theme"
        title="Use system theme"
      >
        <Monitor className="h-5 w-5" />
      </Button>
    </div>
  );
}