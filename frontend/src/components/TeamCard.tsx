'use client';

import { motion } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import type { Team } from '@/types';

interface TeamCardProps {
  team: Team;
  onClick?: (team: Team) => void;
  className?: string;
  index?: number;
  showGroup?: boolean;
}

export function TeamCard({ team, onClick, className, index = 0, showGroup = true }: TeamCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick?.(team)}
      className={cn(
        'glass-card-hover p-4 cursor-pointer group relative overflow-hidden',
        className
      )}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        {/* Flag and name */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{team.flag_emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-primary transition-colors">
              {team.name_zh}
            </h3>
            <p className="text-xs text-slate-500 truncate">{team.name}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/5 rounded-lg px-2 py-1.5">
            <span className="text-slate-500 block">FIFA排名</span>
            <span className="font-bold text-slate-200">#{team.fifa_rank}</span>
          </div>
          <div className="bg-white/5 rounded-lg px-2 py-1.5">
            <span className="text-slate-500 block">Elo评分</span>
            <span className="font-bold text-primary">{team.elo_rating}</span>
          </div>
        </div>

        {/* Group badge */}
        {showGroup && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs bg-primary/10 text-primary/80 px-2 py-0.5 rounded-full border border-primary/20">
              {team.group}组
            </span>
            <span className="text-[10px] text-slate-500">
              {formatCurrency(team.market_value_eur)}
            </span>
          </div>
        )}

        {/* Attack/Defense mini bars */}
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-6">攻击</span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(team.attack_strength / 2) * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.03 + 0.3 }}
                className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-6">防守</span>
            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(team.defense_strength / 2) * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.03 + 0.4 }}
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
