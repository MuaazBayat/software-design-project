'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/context/ThemeContext';

export function ThemeToggle() {
  // Safely use theme context with fallback
  let theme = 'light'; // default fallback
  let toggleTheme = () => {}; // default no-op function
  
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
    toggleTheme = themeContext.toggleTheme;
  } catch (error) {
    // ThemeProvider not available yet, use defaults
    console.warn('ThemeProvider not available in ThemeToggle, using defaults');
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`transition-all duration-300 hover:scale-110 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 ${
        theme === 'dark'
          ? 'text-amber-100 hover:bg-amber-900/40 hover:shadow-amber-100/40 hover:text-amber-50'
          : 'text-amber-900 hover:bg-amber-100/40 hover:shadow-amber-900/40 hover:text-amber-800'
      }`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        textShadow: theme === 'dark'
          ? '0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(184,134,11,0.3)'
          : '0 1px 2px rgba(255,255,255,0.8), 0 0 4px rgba(139,115,85,0.2)'
      }}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 transition-all duration-300 hover:rotate-12 hover:scale-110" />
      ) : (
        <Sun className="h-5 w-5 transition-all duration-300 hover:rotate-45 hover:scale-110" />
      )}
    </Button>
  );
}