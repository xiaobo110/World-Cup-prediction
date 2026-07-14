'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { usePredictionStore } from '@/stores/predictionStore';
import { GlassCard } from '@/components/GlassCard';
import {
  formatPercent,
  getQualificationBgColor,
  getQualificationColor,
  formatDate,
} from '@/lib/utils';
import { api } from '@/lib/api';
import type { Group, MatchPrediction } from '@/types';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Standings Table for a group                                        */
/* ------------------------------------------------------------------ */

function StandingsTable({ group }: { group: Group }) {
  const sorted = [...group.standings].sort((a, b) => b.points - a.points);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500 border-b border-white/5">
            <th className="text-left py-2 pl-2">#</th>
            <th className="text-left py-2">球队</th>
            <th className="text-center py-2">赛</th>
            <th className="text-center py-2">胜</th>
            <th className="text-center py-2">平</th>
            <th className="text-center py-2">负</th>
            <th className="text-center py-2">进球</th>
            <th className="text-center py-2">失球</th>
            <th className="text-center py-2">积分</th>
            <th className="text-center py-2 pr-2">出线</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <motion.tr
              key={s.team.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="py-2 pl-2 text-slate-500">{i + 1}</td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{s.team.flag_emoji}</span>
                  <span className="text-slate-200 font-medium">{s.team.name_zh}</span>
                </div>
              </td>
              <td className="text-center py-2 text-slate-400">{s.played}</td>
              <td className="text-center py-2 text-emerald-400">{s.won}</td>
              <td className="text-center py-2 text-amber-400">{s.drawn}</td>
              <td className="text-center py-2 text-red-400">{s.lost}</td>
              <td className="text-center py-2 text-slate-300">{s.goals_for}</td>
              <td className="text-center py-2 text-slate-300">{s.goals_against}</td>
              <td className="text-center py-2 font-bold text-slate-100">{s.points}</td>
              <td className="text-center py-2 pr-2">
                <div className="flex items-center gap-1 justify-center">
                  <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.qualification_prob * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.05 }}
                      className={`h-full rounded-full ${getQualificationBgColor(s.qualification_prob)}`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${getQualificationColor(s.qualification_prob)}`}>
                    {formatPercent(s.qualification_prob, 0)}
                  </span>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group Match Card                                                   */
/* ------------------------------------------------------------------ */

function GroupMatchCard({ match, index }: { match: any; index: number }) {
  const [pred, setPred] = useState<MatchPrediction | null>(null);

  useEffect(() => {
    api.predictMatch(match.id).then(setPred).catch(() => {});
  }, [match.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white/[0.03] rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Home */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-lg">{match.home_team?.flag_emoji}</span>
          <span className="text-xs font-medium text-slate-200 truncate">
            {match.home_team?.name_zh}
          </span>
        </div>

        {/* Score */}
        <div className="px-2 shrink-0">
          {pred ? (
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-primary">
                {pred.predicted_home_goals}
              </span>
              <span className="text-slate-600 text-xs">:</span>
              <span className="text-sm font-bold text-secondary">
                {pred.predicted_away_goals}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-500">VS</span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-xs font-medium text-slate-200 truncate">
            {match.away_team?.name_zh}
          </span>
          <span className="text-lg">{match.away_team?.flag_emoji}</span>
        </div>
      </div>

      {/* Win probability bar */}
      {pred && (
        <div className="mt-2">
          <div className="flex h-1 rounded-full overflow-hidden">
            <div
              className="bg-primary transition-all"
              style={{ width: `${pred.home_win_prob * 100}%` }}
            />
            <div
              className="bg-slate-500 transition-all"
              style={{ width: `${pred.draw_prob * 100}%` }}
            />
            <div
              className="bg-secondary transition-all"
              style={{ width: `${pred.away_win_prob * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-slate-500">
            <span>{formatPercent(pred.home_win_prob, 0)}</span>
            <span>{formatPercent(pred.draw_prob, 0)}</span>
            <span>{formatPercent(pred.away_win_prob, 0)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group Card (collapsible)                                           */
/* ------------------------------------------------------------------ */

function GroupCard({ group, matches, index }: { group: Group; matches: any[]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const groupMatches = matches.filter(m => m.group === group.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard padding="lg" hover glow="blue">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full mb-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{group.name}</span>
            </div>
            <h3 className="text-base font-semibold text-slate-200">{group.name}组</h3>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {/* Standings */}
        <StandingsTable group={group} />

        {/* Expanded: Matches */}
        {expanded && groupMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-white/5"
          >
            <h4 className="text-xs font-semibold text-slate-400 mb-3">比赛预测</h4>
            <div className="grid grid-cols-1 gap-2">
              {groupMatches.map((m, i) => (
                <GroupMatchCard key={m.id} match={m} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function GroupsPage() {
  const { groups, matches, isLoading, fetchGroups, fetchMatches } = usePredictionStore();

  useEffect(() => {
    if (!groups.length) fetchGroups();
    if (!matches.length) fetchMatches();
  }, []);

  if (isLoading && !groups.length) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-10 w-48 rounded-xl bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-64 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-1">
          小组赛阶段
        </h1>
        <p className="text-slate-400 text-sm">
          12 个小组、48 支球队的积分排名与出线概率分析
        </p>
      </motion.div>

      {/* Group Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group, i) => (
          <GroupCard
            key={group.name}
            group={group}
            matches={matches}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
