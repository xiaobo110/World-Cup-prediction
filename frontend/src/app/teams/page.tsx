'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { usePredictionStore } from '@/stores/predictionStore';
import { GlassCard } from '@/components/GlassCard';
import {
  formatCurrency,
  getPositionName,
  getPositionColor,
} from '@/lib/utils';
import type { Team } from '@/types';
import { Search, Filter, ChevronDown, X } from 'lucide-react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Radar Chart for team detail                                        */
/* ------------------------------------------------------------------ */

function TeamRadarChart({ team }: { team: Team }) {
  const formAvg = team.form.length
    ? team.form.reduce((a, b) => a + b, 0) / team.form.length
    : 0.5;

  const marketValueNorm = Math.min(team.market_value_eur / 1_500_000_000, 1);

  const option = {
    backgroundColor: 'transparent',
    radar: {
      indicator: [
        { name: '进攻', max: 2 },
        { name: '防守', max: 2 },
        { name: '状态', max: 1 },
        { name: '经验', max: 2200 },
        { name: '身价', max: 1 },
        { name: '控球', max: 2 },
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: '#94a3b8', fontSize: 12 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [
              team.attack_strength,
              team.defense_strength,
              formAvg,
              team.elo_rating,
              marketValueNorm,
              team.attack_strength * 0.9 + team.defense_strength * 0.1,
            ],
            name: team.name_zh,
            areaStyle: {
              color: 'rgba(59,130,246,0.15)',
            },
            lineStyle: { color: '#3b82f6', width: 2 },
            itemStyle: { color: '#3b82f6' },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 280 }} />;
}

/* ------------------------------------------------------------------ */
/*  Form Circles                                                       */
/* ------------------------------------------------------------------ */

function FormCircles({ form }: { form: number[] }) {
  const last10 = form.slice(-10);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-slate-500 mr-1">近况:</span>
      {last10.map((v, i) => {
        let color = 'bg-red-500';
        if (v > 0.5) color = 'bg-emerald-500';
        else if (v === 0.5) color = 'bg-amber-500';
        return (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`w-4 h-4 rounded-full ${color}`}
            title={v > 0.5 ? '胜' : v === 0.5 ? '平' : '负'}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Team Detail Section                                                */
/* ------------------------------------------------------------------ */

function TeamDetail({ team, onClose }: { team: Team; onClose: () => void }) {
  const topPlayers = [...team.squad]
    .sort((a, b) => b.market_value_eur - a.market_value_eur)
    .slice(0, 8);

  const statBars = [
    { label: '进攻能力', value: team.attack_strength, max: 2, color: 'from-red-500 to-orange-400' },
    { label: '防守能力', value: team.defense_strength, max: 2, color: 'from-blue-500 to-cyan-400' },
    { label: '场均进球', value: team.avg_goals_scored, max: 4, color: 'from-emerald-500 to-teal-400' },
    { label: '场均失球', value: team.avg_goals_conceded, max: 4, color: 'from-rose-500 to-pink-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden"
    >
      <GlassCard className="p-6 border-primary/20" glow="blue">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{team.flag_emoji}</span>
            <div>
              <h3 className="text-xl font-bold text-slate-100">{team.name_zh}</h3>
              <p className="text-sm text-slate-500">{team.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Radar + Form */}
          <div>
            <h4 className="text-sm font-semibold text-slate-400 mb-3">能力雷达图</h4>
            <TeamRadarChart team={team} />
            <div className="mt-4">
              <FormCircles form={team.form} />
            </div>
          </div>

          {/* Right: Stats + Players */}
          <div className="space-y-6">
            {/* Stat Bars */}
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3">核心数据</h4>
              <div className="space-y-3">
                {statBars.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{s.label}</span>
                      <span className="text-slate-200 font-medium">{s.value.toFixed(2)}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.value / s.max) * 100}%` }}
                        transition={{ duration: 0.8 }}
                        className={`h-full bg-gradient-to-r ${s.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Players */}
            <div>
              <h4 className="text-sm font-semibold text-slate-400 mb-3">
                核心球员
                <span className="ml-2 text-xs text-slate-500">
                  身价 {formatCurrency(team.market_value_eur)}
                </span>
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {topPlayers.map((p, i) => (
                  <motion.div
                    key={p.number}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2"
                  >
                    <span className="text-xs font-bold text-slate-500 w-6">#{p.number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.club}</p>
                    </div>
                    <span className={`text-xs font-medium ${getPositionColor(p.position)}`}>
                      {getPositionName(p.position)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatCurrency(p.market_value_eur)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Group filter options                                               */
/* ------------------------------------------------------------------ */

const GROUPS = 'ABCDEFGHIJKLMNOPQR'.split('');

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function TeamsPage() {
  const { teams, isLoading, fetchTeams } = usePredictionStore();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!teams.length) fetchTeams();
  }, []);

  const filtered = useMemo(() => {
    let list = teams;
    if (groupFilter) {
      list = list.filter(t => t.group === groupFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        t =>
          t.name_zh.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q)
      );
    }
    return list;
  }, [teams, groupFilter, search]);

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(prev => (prev?.id === team.id ? null : team));
  };

  if (isLoading && !teams.length) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-12 rounded-2xl bg-white/5" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="shimmer h-40 rounded-2xl bg-white/5" />
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
          球队分析
        </h1>
        <p className="text-slate-400 text-sm">48 支参赛球队深度数据分析</p>
      </motion.div>

      {/* Search / Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索球队名称 / 代码..."
            className="glass-input w-full pl-10 text-sm"
          />
        </div>

        {/* Group filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          <button
            onClick={() => setGroupFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !groupFilter
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            全部
          </button>
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setGroupFilter(groupFilter === g ? null : g)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                groupFilter === g
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {g}组
            </button>
          ))}
        </div>
      </motion.div>

      {/* Results count */}
      <p className="text-xs text-slate-500">
        共 {filtered.length} 支球队
      </p>

      {/* Team Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {filtered.map((team, i) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.02 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => handleTeamClick(team)}
            className={`glass-card-hover p-4 cursor-pointer group ${
              selectedTeam?.id === team.id ? 'border-primary/50 bg-primary/5' : ''
            }`}
          >
            {/* Flag + Name */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-4xl">{team.flag_emoji}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-primary transition-colors">
                  {team.name_zh}
                </h3>
                <p className="text-xs text-slate-500 truncate">{team.code}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/5 rounded-lg px-2 py-1.5 text-center">
                <span className="text-slate-500 block text-[10px]">FIFA排名</span>
                <span className="font-bold text-slate-200">#{team.fifa_rank}</span>
              </div>
              <div className="bg-white/5 rounded-lg px-2 py-1.5 text-center">
                <span className="text-slate-500 block text-[10px]">Elo评分</span>
                <span className="font-bold text-primary">{team.elo_rating}</span>
              </div>
            </div>

            {/* Group badge */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] bg-primary/10 text-primary/80 px-2 py-0.5 rounded-full border border-primary/20">
                {team.group}组
              </span>
              <span className="text-[10px] text-slate-500">
                {formatCurrency(team.market_value_eur)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Team Detail */}
      <AnimatePresence>
        {selectedTeam && (
          <TeamDetail team={selectedTeam} onClose={() => setSelectedTeam(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
