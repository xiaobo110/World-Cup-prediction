'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { usePredictionStore } from '@/stores/predictionStore';
import { GlassCard } from '@/components/GlassCard';
import { formatPercent } from '@/lib/utils';
import { api } from '@/lib/api';
import type { ChampionExplanation } from '@/types';
import {
  Trophy,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Top 10 Champion Bar Chart                                          */
/* ------------------------------------------------------------------ */

function Top10Chart() {
  const { championPrediction, teams } = usePredictionStore();
  if (!championPrediction.length) return null;

  const top10 = championPrediction.slice(0, 10);

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
    grid: { left: '3%', right: '12%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      max: (v: any) => v.max * 1.3,
      axisLabel: {
        color: '#64748b',
        formatter: (v: number) => (v * 100).toFixed(0) + '%',
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      type: 'category',
      data: top10.map(p => p.team?.name_zh ?? '').reverse(),
      axisLabel: { color: '#e2e8f0', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: top10.map((p, i) => ({
          value: p.probability,
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
            color: i === top10.length - 1
              ? {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#f59e0b' },
                    { offset: 1, color: '#fbbf24' },
                  ],
                }
              : i >= top10.length - 3
              ? {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#94a3b8' },
                    { offset: 1, color: '#cbd5e1' },
                  ],
                }
              : {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#b45309' },
                    { offset: 1, color: '#d97706' },
                  ],
                },
          },
        })).reverse(),
        barWidth: 20,
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          formatter: (p: any) => (p.value * 100).toFixed(1) + '%',
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 380 }} />;
}

/* ------------------------------------------------------------------ */
/*  Championship Path                                                  */
/* ------------------------------------------------------------------ */

function ChampionshipPath() {
  const { championPrediction } = usePredictionStore();
  if (!championPrediction.length || !championPrediction[0].path) return null;

  const top = championPrediction[0];
  const steps = ['小组赛', '32强', '16强', '8强', '半决赛', '决赛'];

  return (
    <div className="space-y-3">
      {top.path.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-4"
        >
          {/* Step number */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{i + 1}</span>
            </div>
            {i < top.path.length - 1 && (
              <div className="w-px h-6 bg-gradient-to-b from-primary/30 to-transparent" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">{step.round}</p>
                <p className="text-sm font-medium text-slate-200">
                  vs {step.opponent}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">
                  {formatPercent(step.win_prob)}
                </p>
                <p className="text-[10px] text-slate-500">胜率</p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dark Horse Cards                                                   */
/* ------------------------------------------------------------------ */

function DarkHorseCards() {
  const { darkHorses, teams } = usePredictionStore();
  if (!darkHorses.length) return null;

  const horseTeams = darkHorses
    .map(name => teams.find(t => t.name_zh === name || t.name === name))
    .filter(Boolean);

  const reasons = [
    '近期状态出色，进攻火力强劲',
    '防守稳固，大赛经验丰富',
    '核心球员状态正佳，团队默契度高',
    '战术体系成熟，擅长杯赛赛制',
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {horseTeams.slice(0, 4).map((team, i) => (
        <motion.div
          key={team!.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.1 }}
        >
          <GlassCard hover className="p-4 text-center" glow="amber">
            <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
            <span className="text-3xl block mb-2">{team!.flag_emoji}</span>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">
              {team!.name_zh}
            </h4>
            <p className="text-xs text-slate-500">{reasons[i] ?? '潜力无限'}</p>
            <div className="mt-2 flex items-center justify-center gap-2 text-xs">
              <span className="text-slate-500">Elo</span>
              <span className="font-bold text-amber-400">{team!.elo_rating}</span>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Confidence Gauge                                                   */
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

  return <ReactECharts option={option} style={{ height: 220 }} />;
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ChampionPage() {
  const {
    championPrediction,
    isLoading,
    fetchChampionPrediction,
    fetchTeams,
  } = usePredictionStore();

  useEffect(() => {
    if (!championPrediction.length) fetchChampionPrediction();
    fetchTeams();
  }, []);

  const top = championPrediction?.[0];

  if (isLoading && !championPrediction.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-slate-400">正在加载冠军预测...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ---------- Trophy Section ---------- */}
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center py-4"
      >
        <motion.span
          className="text-7xl block mb-4 animate-trophy-glow"
          animate={{ rotate: [0, -5, 5, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          🏆
        </motion.span>

        {top && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-5xl block mb-3">{top.team?.flag_emoji}</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-100 mb-2">
              {top.team?.name_zh}
            </h1>
            <p className="text-slate-400 text-sm mb-4">{top.team?.name}</p>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-5xl md:text-6xl font-black gradient-text-gold">
                {formatPercent(top.probability)}
              </span>
              <p className="text-slate-400 mt-1">预测夺冠概率</p>
            </motion.div>
          </motion.div>
        )}
      </motion.section>

      {/* ---------- Top 10 Chart ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard padding="lg">
          <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            夺冠概率 Top 10
          </h3>
          <Top10Chart />
        </GlassCard>
      </motion.div>

      {/* ---------- Championship Path + Confidence ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard padding="lg">
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              {top?.team?.name_zh ?? '冠军'}的夺冠之路
            </h3>
            <ChampionshipPath />
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
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

      {/* ---------- Dark Horses ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          黑马球队
        </h3>
        <DarkHorseCards />
      </motion.div>
    </div>
  );
}
