'use client';

import { useTheme } from '@/lib/context/ThemeContext';

export function BackgroundWrapper() {
  // Safely use theme context with fallback
  let theme = 'light'; // default fallback
  
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch (error) {
    // ThemeProvider not available yet, use default
    console.warn('ThemeProvider not available in BackgroundWrapper, using default theme');
  }

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-0" style={{ backgroundAttachment: 'fixed' }}>
      {/* Light mode parchment texture */}
      <div 
        className="absolute inset-0 transition-opacity duration-300" 
        style={{
          opacity: isDark ? 0 : 1,
          background: 'linear-gradient(135deg,#faf8f4 0%,#f0e9d8 30%,#e4d8c4 70%,#d8cdb8 100%)',
          filter: 'blur(4.5px)'
        }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(139,115,85,0.2) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(160,130,100,0.15) 1px, transparent 1px),
            radial-gradient(circle at 60% 40%, rgba(120,90,60,0.18) 1px, transparent 1px),
            linear-gradient(45deg, transparent 40%, rgba(101,67,33,0.08) 41%, rgba(101,67,33,0.08) 59%, transparent 60%),
            linear-gradient(-45deg, transparent 40%, rgba(101,67,33,0.06) 41%, rgba(101,67,33,0.06) 59%, transparent 60%),
            linear-gradient(135deg, rgba(139,115,85,0.1) 0%, transparent 20%, transparent 80%, rgba(101,67,33,0.08) 100%)
          `,
          backgroundSize: '50px 50px, 70px 70px, 45px 45px, 30px 30px, 30px 30px, 100% 100%',
          filter: 'blur(1px)'
        }} />
      </div>

      {/* Dark mode parchment texture */}
      <div 
        className="absolute inset-0 transition-opacity duration-300" 
        style={{
          opacity: isDark ? 1 : 0,
          background: 'linear-gradient(135deg,#5a3d2a 0%,#4a3525 30%,#6a4a35 70%,#5a3d2a 100%)',
          filter: 'blur(0px)'
        }}
      >
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(200,180,150,0.4) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(220,200,170,0.35) 1px, transparent 1px),
            radial-gradient(circle at 60% 40%, rgba(180,160,130,0.4) 1px, transparent 1px),
            linear-gradient(45deg, transparent 40%, rgba(160,140,110,0.2) 41%, rgba(160,140,110,0.2) 59%, transparent 60%),
            linear-gradient(-45deg, transparent 40%, rgba(140,120,90,0.15) 41%, rgba(140,120,90,0.15) 59%, transparent 60%),
            linear-gradient(135deg, rgba(200,180,150,0.25) 0%, transparent 20%, transparent 80%, rgba(160,140,110,0.2) 100%)
          `,
          backgroundSize: '50px 50px, 70px 70px, 45px 45px, 30px 30px, 30px 30px, 100% 100%',
          filter: 'blur(2px)'
        }} />
      </div>
    </div>
  );
}


