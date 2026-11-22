/**
 * Logo do Papa Bolotas (ficheiro webapp/public/logo.png).
 * Se o ficheiro não existir, mostra só o nome.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** Mostrar o nome ao lado do logo */
  showName?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function BrandLogo({ showName = true, size = 'md', className }: BrandLogoProps) {
  const [missing, setMissing] = useState(false);

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      {!missing && (
        <img
          src="/logo.png"
          alt={showName ? '' : 'Papa Bolotas'}
          onError={() => setMissing(true)}
          className={cn('shrink-0 object-contain', size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')}
        />
      )}
      {showName && (
        <span className={cn('font-bold text-orange-600 truncate', size === 'sm' ? 'text-base' : 'text-lg')}>
          Papa Bolotas
        </span>
      )}
    </div>
  );
}
