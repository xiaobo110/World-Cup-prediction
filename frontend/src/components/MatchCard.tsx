'use client';

import { motion } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import type { Match, MatchPrediction } from '@/types';

interface MatchCardProps {
  match: Match;
  prediction?: MatchPrediction;
  onClick?: () => void;
}

export function MatchCard({ match, prediction, onClick }: MatchCardProps) {
  const hasPrediction = !!prediction;
  const homeProb = prediction?.home_win_prob ?? 0;
  const drawProb = prediction?.draw_prob ?? 0;
  const awayProb = prediction?.away_win_prob ?? 0;
  const totalProb = homeProb + drawProb + awayProb;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 cursor-pointer',
        'transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]'
      )}
    >
      {/* Top: venue + datetime */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500">{match.venue}</span>
        <span className="text-xs text-slate-500">{formatDate(match.datetime)}</span>
      </div>

      {/* Middle: teams + score */}
      <div className="flex items-center justify-between gap-3 mb-4">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-3xl">{match.home_team.flag_emoji}</span>
          <span className="text-sm font-medium text-slate-200 text-center truncate max-w-full">
            {match.home_team.name_zh}
          </span>
        </div>

        {/* Score / VS */}
        <div className="flex-shrink-0 px-4">
          {hasPrediction ? (
            <div className="text-center">
              <span className="text-2xl font-bold text-white">
                {Math.round(prediction.predicted_home_goals)}
              </span>
              <span className="text-lg text-slate-500 mx-2">:</span>
              <span className="text-2xl font-bold text-white">
                {Math.round(prediction.predicted_away_goals)}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-slate-500">VS</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-3xl">{match.away_team.flag_emoji}</span>
          <span className="text-sm font-medium text-slate-200 text-center truncate max-w-full">
            {match.away_team.name_zh}
          </span>
        </div>
      </div>

      {/* Bottom: probability bar */}
      {hasPrediction && totalProb > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(homeProb / totalProb) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="h-full bg-blue-500"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(drawProb / totalProb) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full bg-slate-500"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(awayProb / totalProb) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full bg-violet-500"
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>主胜 {(homeProb * 100).toFixed(1)}%</span>
            <span>平局 {(drawProb * 100).toFixed(1)}%</span>
            <span>客胜 {(awayProb * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
