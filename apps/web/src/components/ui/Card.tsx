import React from 'react';
import { clsx } from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, glow = false, ...props }) => {
  return (
    <div
      className={clsx(
        'bg-[#0f172a]/80 backdrop-blur-md border border-slate-800 rounded-xl p-5 transition-all duration-200',
        glow && 'hover:border-primary-500/40 hover:shadow-glow-primary',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
