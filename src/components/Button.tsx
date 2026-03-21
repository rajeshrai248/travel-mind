import { cn } from '../utils/cn';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:opacity-90',
    secondary: 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20 hover:opacity-90',
    outline: 'border-2 border-primary text-primary hover:bg-primary/5',
    ghost: 'text-primary hover:bg-primary/5',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={cn(
        'rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
