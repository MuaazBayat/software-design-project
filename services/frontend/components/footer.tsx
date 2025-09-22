interface FooterProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export default function Footer({ className = '', variant = 'default' }: FooterProps) {
  const isCompact = variant === 'compact';

  return (
    <footer className={`
      ${isCompact ? 'mt-8 py-6' : 'mt-16 py-8'} 
      bg-amber-900 text-amber-100 
      ${className}
    `}>
      <div className="max-w-6xl mx-auto px-4 text-center">
        <div className={`${isCompact ? 'text-3xl mb-3' : 'text-4xl mb-4'}`}>
          ✉️
        </div>
        <p className={`${isCompact ? 'text-base' : 'text-lg'} font-medium`}>
          Happy letter writing!
        </p>
        <p className={`text-amber-300 ${isCompact ? 'mt-1 text-sm' : 'mt-2'}`}>
          Connecting hearts across the world, one letter at a time
        </p>
      </div>
    </footer>
  );
}