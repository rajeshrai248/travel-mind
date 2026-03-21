import { cn } from '../utils/cn';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

import { ReactNode } from 'react';

export function Badge({ children, variant = 'primary', className }: BadgeProps) {
  const variants = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
