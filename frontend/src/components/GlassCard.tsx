'use client';

import { cn } from '@/lib/utils';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'blue' | 'violet' | 'emerald' | 'amber' | 'none';
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

const glowMap = {
  blue: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  violet: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',
  emerald: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  amber: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  none: '',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hover = false, glow = 'blue', padding = 'md', onClick, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl',
          paddingMap[padding],
          hover && [
            'transition-all duration-300 cursor-pointer',
            'hover:bg-white/[0.08] hover:border-white/20',
            glowMap[glow],
          ],
          className
        )}
        onClick={onClick}
        whileHover={hover ? { scale: 1.02 } : undefined}
        whileTap={onClick ? { scale: 0.98 } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
