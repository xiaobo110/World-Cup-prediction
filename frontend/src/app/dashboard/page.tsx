'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { usePredictionStore } from '@/stores/predictionStore';
import { GlassCard } from '@/components/GlassCard';
import { formatPercent, formatDate, getStageName } from '@/lib/utils';
import type { MatchPrediction } from '@/types';
import { api } from '@/lib/api';
import {
  Trophy,
  BarChart3,
  Users,
  Zap,
  Globe2,
  Sparkles,
  Calendar,
  TrendingUp,
} from 'lucide-react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 h-16 w-16 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  );
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-2xl bg-white/5 ${className}`} />;
}

/* ------------------------------------------------------------------ */
/*  Champion Spotlight                                                 */
/* ------------------------------------------------------------------ */

function ChampionSpotlight() {
  const { championPrediction, teams } = usePredictionStore();
  if (!championPrediction.length) return null;

  const top = championPrediction[0];
  const team = top.team ?? teams.find(t => t.id === (top as any).team_id);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden"
    >
      <GlassCard className="p-8 md:p-10 border-primary/20 animated-border" glow="blue">
        {/* background decoration */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-secondary/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Trophy + Flag */}
          <div className="flex flex-col items-center gap-3">
            <motion.span
              className="text-7xl animate-trophy-glow"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              🏆
            </motion.span>
            <span className="text-6xl">{team?.flag_emoji ?? '🏳️'}</span>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <p className="text-sm text-slate-400 mb-1">AI 预测冠军</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
              {team?.name_zh ?? '未知'}
            </h2>
            <p className="text-slate-500 text-sm mb-4">{team?.name ?? ''}</p>

            {/* Probability */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <span className="text-5xl md:text-6xl font-black gradient-text">
                {formatPercent(top.probability)}
              </span>
              <span className="text-slate-400 ml-2 text-lg">夺冠概率</span>
            </motion.div>

            {/* Path preview */}
            {top.path && top.path.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {top.path.map((step, i) => (
                  <span
                    key={i}
                    className="text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-slate-400"
                  >
                    {step.round} → {step.opponent}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Top 5 Champion Bar Chart                                           */
/* ------------------------------------------------------------------ */

function TopChampionChart() {
  const { championPrediction } = usePredictionStore();
  if (!championPrediction.length) return null;

  const top5 = championPrediction.slice(0, 5);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10,10,26,0.9)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#f1f5f9' },
      formatter: (params: any) => {
        const d = params[0];
        return `${d.name}<br/>夺冠概率: ${(d.value * 100).toFixed(1)}%`;
      },
    },
    grid: { left: '3%', right: '10%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      max: (v: any) => (v.max * 1.2),
      axisLabel: {
        color: '#64748b',
        formatter: (v: number) => (v * 100).toFixed(0) + '%',
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      type: 'category',
      data: top5.map(p => p.team?.name_zh ?? '').reverse(),
      axisLabel: { color: '#e2e8f0', fontSize: 13 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: top5.map(p => p.probability).reverse(),
        barWidth: 24,
        itemStyle: {
          borderRadius: [0, 12, 12, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' },
            ],
          } as any,
        },
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          formatter: (p: any) => (p.value * 100).toFixed(1) + '%',
        },
      },
    ],
  };

  return (
    <ReactECharts option={option} style={{ height: 240 }} />
  );
}

/* ------------------------------------------------------------------ */
/*  Model Confidence Gauge                                             */
/* ------------------------------------------------------------------ */

function ConfidenceGauge() {
  const { modelConfidence } = usePredictionStore();

  const option = {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        radius: '90%',
        progress: {
          show: true,
          width: 14,
          roundCap: true,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#3b82f6' },
                { offset: 1, color: '#8b5cf6' },
              ],
            } as any,
          },
        },
        pointer: { show: false },
        axisLine: { lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.05)']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          fontSize: 28,
          fontWeight: 'bold',
          color: '#f1f5f9',
          offsetCenter: [0, 0],
          formatter: '{value}%',
        },
        title: {
          offsetCenter: [0, '30%'],
          fontSize: 13,
          color: '#64748b',
        },
        data: [{ value: Math.round(modelConfidence * 100), name: '模型综合置信度' }],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 200 }} />;
}

/* ------------------------------------------------------------------ */
/*  Match Card                                                         */
/* ------------------------------------------------------------------ */

function MatchCard({ match, index }: { match: any; index: number }) {
  const [pred, setPred] = useState<MatchPrediction | null>(null);

  useEffect(() => {
    api.predictMatch(match.id).then(setPred).catch(() => {});
  }, [match.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard hover className="p-4" glow="blue">
        <div className="flex items-center justify-between gap-2">
          {/* Home */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl">{match.home_team?.flag_emoji}</span>
            <span className="text-sm font-medium text-slate-200 truncate">
              {match.home_team?.name_zh}
            </span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 px-3">
            {pred ? (
              <>
                <span className="text-lg font-bold text-primary">
                  {pred.predicted_home_goals}
                </span>
                <span className="text-slate-500">:</span>
                <span className="text-lg font-bold text-secondary">
                  {pred.predicted_away_goals}
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-500">VS</span>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-sm font-medium text-slate-200 truncate">
              {match.away_team?.name_zh}
            </span>
            <span className="text-xl">{match.away_team?.flag_emoji}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{match.group ? `${match.group}组` : getStageName(match.stage)}</span>
          <span>{formatDate(match.datetime)}</span>
        </div>

        {/* Win prob bar */}
        {pred && (
          <div className="mt-3 flex h-1.5 rounded-full overflow-hidden">
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
        )}
      </GlassCard>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Stats                                                        */
/* ------------------------------------------------------------------ */

const quickStats = [
  { icon: Users, label: '48支', sub: '参赛队伍', color: 'text-blue-400' },
  { icon: Zap, label: '104场', sub: '精彩对决', color: 'text-violet-400' },
  { icon: BarChart3, label: '10000+', sub: '蒙特卡洛模拟', color: 'text-emerald-400' },
  { icon: Globe2, label: '6大', sub: 'AI模型融合', color: 'text-amber-400' },
];

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const {
    teams,
    matches,
    championPrediction,
    isLoading,
    fetchTeams,
    fetchGroups,
    fetchMatches,
    fetchChampionPrediction,
  } = usePredictionStore();

  useEffect(() => {
    fetchTeams();
    fetchGroups();
    fetchMatches();
    fetchChampionPrediction();
  }, []);

  const groupMatches = matches.filter(m => m.stage === 'group').slice(0, 6);

  if (isLoading && !teams.length) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard className="h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ---------- Hero ---------- */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center pt-4 pb-2"
      >
        <h1 className="text-3xl md:text-5xl font-black mb-3">
          <span className="gradient-text">2026 FIFA 世界杯</span>
          <br />
          <span className="text-slate-100">冠军预测</span>
          <span className="ml-2">🏆</span>
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          基于 AI 多模型融合技术，综合 Elo 评分、泊松分布、随机森林、XGBoost、LightGBM 及集成学习，为您提供最权威的世界杯预测分析
        </p>
      </motion.section>

      {/* ---------- Champion Spotlight ---------- */}
      <ChampionSpotlight />

      {/* ---------- Charts Row ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard padding="lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              夺冠概率 Top 5
            </h3>
            <TopChampionChart />
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard padding="lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              模型置信度
            </h3>
            <ConfidenceGauge />
          </GlassCard>
        </motion.div>
      </div>

      {/* ---------- Quick Stats ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <GlassCard hover className="text-center p-5" glow="blue">
              <s.icon className={`w-8 h-8 mx-auto mb-2 ${s.color}`} />
              <p className="text-2xl font-bold text-slate-100">{s.label}</p>
              <p className="text-sm text-slate-400">{s.sub}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* ---------- AI Summary ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard padding="lg" glow="violet">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-secondary/10 rounded-xl border border-secondary/20">
              <Sparkles className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">AI 分析摘要</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                基于 10,000 次蒙特卡洛模拟和 6 种机器学习模型的融合分析，
                {championPrediction?.[0]?.team?.name_zh ?? '领先球队'}
                以 {championPrediction?.[0] ? formatPercent(championPrediction[0].probability) : '--'}
                的夺冠概率领跑群雄。模型综合考量了各队的 Elo 评分、近期状态、进攻防守能力、
                球员身价及大赛经验等多维特征。小组赛阶段预计将出现多个死亡之组，
                淘汰赛阶段的变数将显著增加。
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ---------- Recent / Upcoming Matches ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-slate-200">小组赛预测</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupMatches.map((m, i) => (
            <MatchCard key={m.id} match={m} index={i} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
