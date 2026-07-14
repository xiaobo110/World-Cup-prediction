'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { GlassCard } from '@/components/GlassCard';
import { usePredictionStore } from '@/stores/predictionStore';
import { api } from '@/lib/api';
import type { ChampionExplanation, Explanation, Match } from '@/types';
import {
  Database,
  Filter,
  Cpu,
  GitMerge,
  BarChart3,
  Target,
  ArrowRight,
  Loader2,
  ChevronDown,
} from 'lucide-react';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Pipeline Steps                                                     */
/* ------------------------------------------------------------------ */

const pipelineSteps = [
  {
    icon: Database,
    name: '数据采集',
    desc: '收集 FIFA 排名、Elo 评分、球员身价、历史交锋等多源数据',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
  },
  {
    icon: Filter,
    name: '数据清洗',
    desc: '处理缺失值、异常值，标准化特征尺度',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/20',
  },
  {
    icon: Cpu,
    name: '特征工程',
    desc: '构建进攻/防守能力、状态趋势、大赛经验等衍生特征',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10 border-violet-400/20',
  },
  {
    icon: GitMerge,
    name: '模型计算',
    desc: 'Elo、泊松分布、随机森林、XGBoost、LightGBM 并行推理',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/20',
  },
  {
    icon: BarChart3,
    name: '概率融合',
    desc: '基于 Stacking 集成策略加权融合多模型输出',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/20',
  },
  {
    icon: Target,
    name: '最终预测',
    desc: '输出比赛比分、胜率概率、冠军概率及置信区间',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10 border-rose-400/20',
  },
];

function PipelineVisualization() {
  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-2 overflow-x-auto hide-scrollbar pb-2">
      {pipelineSteps.map((step, i) => (
        <motion.div
          key={step.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <GlassCard hover className="p-4 flex-1 min-w-[140px]" glow="blue">
            <div className={`w-10 h-10 rounded-xl ${step.bg} border flex items-center justify-center mb-3`}>
              <step.icon className={`w-5 h-5 ${step.color}`} />
            </div>
            <h4 className="text-sm font-semibold text-slate-200 mb-1">{step.name}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
          </GlassCard>

          {i < pipelineSteps.length - 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.15 }}
              className="hidden lg:flex items-center shrink-0"
            >
              <ArrowRight className="w-4 h-4 text-slate-600" />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature Importance Chart                                           */
/* ------------------------------------------------------------------ */

function FeatureImportanceChart({ shapValues }: { shapValues: Record<string, number> }) {
  const entries = Object.entries(shapValues)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 10);

  const featureNameMap: Record<string, string> = {
    elo_diff: 'Elo评分差',
    fifa_rank_diff: 'FIFA排名差',
    attack_diff: '进攻能力差',
    defense_diff: '防守能力差',
    form: '近期状态',
    h2h: '历史交锋',
    value_ratio: '身价比',
    possession: '控球率',
    shooting_eff: '射门效率',
    experience: '大赛经验',
  };

  const names = entries.map(([k]) => featureNameMap[k] ?? k);
  const values = entries.map(([, v]) => v);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10,10,26,0.9)',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#f1f5f9' },
    },
    grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      type: 'category',
      data: names.reverse(),
      axisLabel: { color: '#e2e8f0', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: values.reverse().map(v => ({
          value: v,
          itemStyle: {
            borderRadius: v >= 0 ? [0, 8, 8, 0] : [8, 0, 0, 8],
            color: v >= 0
              ? {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#3b82f6' },
                    { offset: 1, color: '#60a5fa' },
                  ],
                }
              : {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#ef4444' },
                    { offset: 1, color: '#f87171' },
                  ],
                },
          },
        })),
        barWidth: 18,
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          formatter: (p: any) => p.value.toFixed(3),
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 360 }} />;
}

/* ------------------------------------------------------------------ */
/*  Reasoning Chain                                                    */
/* ------------------------------------------------------------------ */

function ReasoningChain({ chain }: { chain: string[] }) {
  return (
    <div className="space-y-0">
      {chain.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-4"
        >
          {/* Number circle + connector */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">{i + 1}</span>
            </div>
            {i < chain.length - 1 && (
              <div className="w-px h-8 bg-gradient-to-b from-primary/30 to-transparent" />
            )}
          </div>

          {/* Text */}
          <div className="pt-1 pb-4">
            <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Match Selector                                                     */
/* ------------------------------------------------------------------ */

function MatchSelector({
  matches,
  onSelect,
  selectedId,
}: {
  matches: Match[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const selected = matches.find(m => m.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="glass-input w-full flex items-center justify-between text-sm"
      >
        <span className="text-slate-300">
          {selected
            ? `${selected.home_team.name_zh} vs ${selected.away_team.name_zh}`
            : '选择一场比赛...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 top-full mt-1 w-full bg-[#12122a] border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-2xl"
        >
          {matches.slice(0, 30).map(m => (
            <button
              key={m.id}
              onClick={() => {
                onSelect(m.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center gap-2 ${
                m.id === selectedId ? 'bg-primary/10 text-primary' : 'text-slate-300'
              }`}
            >
              <span>{m.home_team.flag_emoji}</span>
              <span className="truncate">{m.home_team.name_zh}</span>
              <span className="text-slate-600">vs</span>
              <span>{m.away_team.flag_emoji}</span>
              <span className="truncate">{m.away_team.name_zh}</span>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ExplainPage() {
  const { matches, fetchMatches } = usePredictionStore();
  const [championExplain, setChampionExplain] = useState<ChampionExplanation | null>(null);
  const [matchExplain, setMatchExplain] = useState<Explanation | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [loadingChampion, setLoadingChampion] = useState(true);
  const [loadingMatch, setLoadingMatch] = useState(false);

  useEffect(() => {
    if (!matches.length) fetchMatches();
    api
      .explainChampion()
      .then(setChampionExplain)
      .catch(() => {})
      .finally(() => setLoadingChampion(false));
  }, []);

  useEffect(() => {
    if (!selectedMatchId) return;
    setLoadingMatch(true);
    api
      .explainMatch(selectedMatchId)
      .then(setMatchExplain)
      .catch(() => {})
      .finally(() => setLoadingMatch(false));
  }, [selectedMatchId]);

  const shapValues = championExplain?.shap_values ?? {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-1">
          可解释 AI
        </h1>
        <p className="text-slate-400 text-sm">
          了解 AI 预测背后的推理过程、特征重要度和模型管线
        </p>
      </motion.div>

      {/* ---------- Pipeline ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-slate-200 mb-4">预测管线</h3>
        <PipelineVisualization />
      </motion.div>

      {/* ---------- Feature Importance ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard padding="lg">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            特征重要性 (SHAP)
          </h3>
          {Object.keys(shapValues).length > 0 ? (
            <FeatureImportanceChart shapValues={shapValues} />
          ) : loadingChampion ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">暂无 SHAP 数据</p>
          )}
        </GlassCard>
      </motion.div>

      {/* ---------- Reasoning Chain (Champion) ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard padding="lg">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            冠军预测推理链
          </h3>
          {championExplain?.reasoning_chain ? (
            <ReasoningChain chain={championExplain.reasoning_chain} />
          ) : loadingChampion ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">暂无推理链数据</p>
          )}

          {championExplain?.natural_language && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
              <p className="text-sm text-slate-400 leading-relaxed">
                {championExplain.natural_language}
              </p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* ---------- Match Selector ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard padding="lg">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            单场比赛解析
          </h3>

          <MatchSelector
            matches={matches}
            onSelect={setSelectedMatchId}
            selectedId={selectedMatchId}
          />

          {loadingMatch && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <span className="ml-3 text-slate-400 text-sm">正在分析比赛...</span>
            </div>
          )}

          {matchExplain && !loadingMatch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 space-y-6"
            >
              {/* Summary */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {matchExplain.prediction_summary}
                </p>
              </div>

              {/* Match reasoning chain */}
              {matchExplain.reasoning_chain && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 mb-3">推理过程</h4>
                  <ReasoningChain chain={matchExplain.reasoning_chain} />
                </div>
              )}

              {/* Match SHAP */}
              {matchExplain.shap_values && Object.keys(matchExplain.shap_values).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 mb-3">特征贡献</h4>
                  <FeatureImportanceChart shapValues={matchExplain.shap_values} />
                </div>
              )}

              {/* Natural language */}
              {matchExplain.natural_language && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {matchExplain.natural_language}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
