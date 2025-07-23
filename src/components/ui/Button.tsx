// src/components/ui/Button.tsx
import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react'; 
import cn from 'classnames'; 

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // --- MODIFICATION 1: ADD 'link' to the list of available variants ---
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost' | 'black' | 'outline-danger' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const isDisabledEffective = isLoading || disabled;

  const variantClasses = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500',
    secondary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500',
    outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-purple-500 focus:bg-gray-100',
    black: 'bg-black text-white hover:bg-gray-800 focus:ring-gray-600',
    'outline-danger': 'bg-transparent border border-red-500 text-red-500 hover:bg-red-50 focus:ring-red-500',
    
    // --- MODIFICATION 2: ADD the new 'link' variant styles here ---
    'link': 'bg-transparent text-purple-600 hover:text-purple-800 hover:underline focus:ring-purple-500 underline-offset-4',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };

  // --- MODIFICATION 3: Make link variant have no padding by default ---
  // This allows it to look clean like a real link.
  let effectiveSizeClasses = variant === 'link' ? '' : sizeClasses[size];

  if (variant === 'ghost' && icon && !children) {
    switch (size) {
        case 'xs': effectiveSizeClasses = 'p-1 text-xs'; break;
        case 'sm': effectiveSizeClasses = 'p-1.5 text-sm'; break;
        case 'md': effectiveSizeClasses = 'p-2 text-base'; break;
        case 'lg': effectiveSizeClasses = 'p-2.5 text-lg'; break;
        default: effectiveSizeClasses = 'p-2 text-base';
    }
  }

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClasses = isDisabledEffective ? 'opacity-75 cursor-not-allowed' : '';

  const finalClassName = cn(
    baseClasses,
    variantClasses[variant],
    effectiveSizeClasses,
    widthClass,
    disabledClasses,
    className
  );

  return (
    <button
      className={finalClassName}
      disabled={isDisabledEffective}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin h-5 w-5", children ? "mr-2" : "")} />
      ) : (
        icon && <span className={cn(children ? "mr-2" : "")}>{icon}</span>
      )}
      {!isLoading && children}
    </button>
  );
};

export default Button;