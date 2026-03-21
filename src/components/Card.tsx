import { cn } from '../utils/cn';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-3xl shadow-[0_8px_32px_rgba(21,28,39,0.06)] border border-outline-variant/10 overflow-hidden',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
