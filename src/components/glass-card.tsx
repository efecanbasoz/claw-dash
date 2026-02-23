'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

export function GlassCard({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2 }}
      className={cn(
        'rounded-xl border border-border bg-surface/50 backdrop-blur-xl p-4',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
