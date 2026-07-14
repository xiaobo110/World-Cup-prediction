'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Team } from '@/types';

interface BracketNodeProps {
  homeTeam?: Team;
  awayTeam?: Team;
  homeScore?: number;
  awayScore?: number;
  homeWinProb?: number;
  awayWinProb?: number;
  winner?: 'home' | 'away' | null;
  onClick?: () => void;
}

export function BracketNode({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeWinProb,
  awayWinProb,
  winner,
  onClick,
}: BracketNodeProps) {
  const hasScore = homeScore !== undefined && awayScore !== undefined;
  const hasTeams = homeTeam || awayTeam;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={cn(
        'w-[200px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden',
        'cursor-pointer transition-all duration-200 hover:border-blue-500/30',
        'hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]'
      )}
    >
      {/* Home team row */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b border-white/5',
          winner === 'home' && 'border-l-2 border-l-emerald-400 bg-emerald-500/5'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {homeTeam ? (
            <>
              <span className="text-base flex-shrink-0">{homeTeam.flag_emoji}</span>
              <span className="text-xs font-medium text-slate-200 truncate">
                {homeTeam.name_zh}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-600 italic">待定</span>
          )}
        </div>
        {hasScore && (
          <span
            className={cn(
              'text-xs font-bold flex-shrink-0 ml-2',
              winner === 'home' ? 'text-emerald-400' : 'text-slate-400'
            )}
          >
            {homeScore}
          </span>
        )}
      </div>

      {/* Away team row */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          winner === 'away' && 'border-l-2 border-l-emerald-400 bg-emerald-500/5'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {awayTeam ? (
            <>
              <span className="text-base flex-shrink-0">{awayTeam.flag_emoji}</span>
              <span className="text-xs font-medium text-slate-200 truncate">
                {awayTeam.name_zh}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-600 italic">待定</span>
          )}
        </div>
        {hasScore && (
          <span
            className={cn(
              'text-xs font-bold flex-shrink-0 ml-2',
              winner === 'away' ? 'text-emerald-400' : 'text-slate-400'
            )}
          >
            {awayScore}
          </span>
        )}
      </div>

      {/* Win probability bar */}
      {hasTeams && homeWinProb !== undefined && awayWinProb !== undefined && (
        <div className="flex h-1">
          <div
            className="bg-blue-500 transition-all duration-500"
            style={{ width: `${homeWinProb * 100}%` }}
          />
          <div
            className="bg-violet-500 transition-all duration-500"
            style={{ width: `${awayWinProb * 100}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
