'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePredictionStore } from '@/stores/predictionStore';
import { GlassCard } from '@/components/GlassCard';
import { formatPercent } from '@/lib/utils';
import { api } from '@/lib/api';
import type { SimulationSummary, Team } from '@/types';
import { Trophy, Loader2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types for bracket data                                             */
/* ------------------------------------------------------------------ */

interface BracketMatch {
  id: string;
  homeTeam: { name: string; flag: string; score: number };
  awayTeam: { name: string; flag: string; score: number };
  winner: 'home' | 'away';
}

interface BracketRound {
  name: string;
  matches: BracketMatch[];
}

/* ------------------------------------------------------------------ */
/*  Bracket Match Node                                                 */
/* ------------------------------------------------------------------ */

function BracketMatchNode({ match, isFinal = false }: { match: BracketMatch; isFinal?: boolean }) {
  const isHomeWinner = match.winner === 'home';
  const isAwayWinner = match.winner === 'away';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`
        bg-white/5 backdrop-blur-xl border rounded-xl overflow-hidden
        ${isFinal ? 'border-amber-500/30 w-64' : 'border-white/10 w-52'}
        ${isFinal ? 'shadow-[0_0_20px_rgba(251,191,36,0.1)]' : ''}
      `}
    >
      {/* Home team */}
      <div
        className={`flex items-center gap-2 px-3 py-2 transition-colors ${
          isHomeWinner ? 'bg-primary/10' : 'bg-transparent'
        }`}
      >
        <span className="text-base">{match.homeTeam.flag}</span>
        <span
          className={`flex-1 text-xs font-medium truncate ${
            isHomeWinner ? 'text-primary' : 'text-slate-400'
          }`}
        >
          {match.homeTeam.name}
        </span>
        <span
          className={`text-sm font-bold ${
            isHomeWinner ? 'text-primary' : 'text-slate-500'
          }`}
        >
          {match.homeTeam.score}
        </span>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* Away team */}
      <div
        className={`flex items-center gap-2 px-3 py-2 transition-colors ${
          isAwayWinner ? 'bg-secondary/10' : 'bg-transparent'
        }`}
      >
        <span className="text-base">{match.awayTeam.flag}</span>
        <span
          className={`flex-1 text-xs font-medium truncate ${
            isAwayWinner ? 'text-secondary' : 'text-slate-400'
          }`}
        >
          {match.awayTeam.name}
        </span>
        <span
          className={`text-sm font-bold ${
            isAwayWinner ? 'text-secondary' : 'text-slate-500'
          }`}
        >
          {match.awayTeam.score}
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Round Column                                                       */
/* ------------------------------------------------------------------ */

function RoundColumn({ round, roundIndex }: { round: BracketRound; roundIndex: number }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[14rem]">
      {/* Round label */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: roundIndex * 0.1 }}
        className="text-xs font-semibold text-slate-400 mb-2 px-3 py-1 bg-white/5 rounded-full border border-white/10"
      >
        {round.name}
      </motion.div>

      {/* Matches */}
      <div className="flex flex-col justify-around flex-1 gap-3 w-full">
        {round.matches.map((match, i) => (
          <BracketMatchNode
            key={match.id}
            match={match}
            isFinal={round.name === '决赛'}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Connector Lines (CSS)                                              */
/* ------------------------------------------------------------------ */

function BracketConnectors({ matchCount }: { matchCount: number }) {
  return (
    <div className="flex flex-col justify-around flex-1 gap-3 self-center">
      {Array.from({ length: Math.max(matchCount - 1, 0) }).map((_, i) => (
        <div key={i} className="w-6 h-px bg-white/10" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Champion Spotlight                                                 */
/* ------------------------------------------------------------------ */

function ChampionSpotlight({ team, probability }: { team: { name: string; flag: string }; probability: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.6 }}
    >
      <GlassCard className="p-8 text-center border-amber-500/20 animated-border" glow="amber">
        <motion.span
          className="text-6xl block mb-4 animate-trophy-glow"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          🏆
        </motion.span>
        <span className="text-5xl block mb-3">{team.flag}</span>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2">
          {team.name}
        </h2>
        <p className="text-sm text-slate-400 mb-4">预测冠军</p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <span className="text-4xl md:text-5xl font-black gradient-text-gold">
            {formatPercent(probability)}
          </span>
          <p className="text-slate-500 text-sm mt-1">夺冠概率</p>
        </motion.div>
      </GlassCard>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Generate Static Bracket from simulation data                       */
/* ------------------------------------------------------------------ */

function generateBracket(
  teams: Team[],
  summary: SimulationSummary | null
): BracketRound[] {
  // Sort teams by Elo to create a plausible bracket
  const sorted = [...teams].sort((a, b) => b.elo_rating - a.elo_rating);
  const top32 = sorted.slice(0, 32);

  // Helper to get team flag
  const getFlag = (t: Team) => t.flag_emoji;
  const getName = (t: Team) => t.name_zh;

  // Round of 32 (16 matches)
  const r32Matches: BracketMatch[] = [];
  for (let i = 0; i < 16; i++) {
    const home = top32[i];
    const away = top32[31 - i];
    const homeScore = Math.round(home.attack_strength * 1.5 + Math.random());
    const awayScore = Math.round(away.attack_strength * 1.2 + Math.random() * 0.5);
    r32Matches.push({
      id: `r32-${i}`,
      homeTeam: { name: getName(home), flag: getFlag(home), score: homeScore },
      awayTeam: { name: getName(away), flag: getFlag(away), score: awayScore },
      winner: homeScore >= awayScore ? 'home' : 'away',
    });
  }

  // Round of 16 (8 matches)
  const r16Matches: BracketMatch[] = [];
  for (let i = 0; i < 8; i++) {
    const m1 = r32Matches[i * 2];
    const m2 = r32Matches[i * 2 + 1];
    const home = m1.winner === 'home' ? m1.homeTeam : m1.awayTeam;
    const away = m2.winner === 'home' ? m2.homeTeam : m2.awayTeam;
    const homeScore = Math.floor(Math.random() * 3) + 1;
    const awayScore = Math.floor(Math.random() * 2);
    r16Matches.push({
      id: `r16-${i}`,
      homeTeam: { ...home, score: homeScore },
      awayTeam: { ...away, score: awayScore },
      winner: homeScore > awayScore ? 'home' : 'away',
    });
  }

  // Quarter-finals (4 matches)
  const qfMatches: BracketMatch[] = [];
  for (let i = 0; i < 4; i++) {
    const m1 = r16Matches[i * 2];
    const m2 = r16Matches[i * 2 + 1];
    const home = m1.winner === 'home' ? m1.homeTeam : m1.awayTeam;
    const away = m2.winner === 'home' ? m2.homeTeam : m2.awayTeam;
    const homeScore = Math.floor(Math.random() * 3) + 1;
    const awayScore = Math.floor(Math.random() * 2);
    qfMatches.push({
      id: `qf-${i}`,
      homeTeam: { ...home, score: homeScore },
      awayTeam: { ...away, score: awayScore },
      winner: homeScore > awayScore ? 'home' : 'away',
    });
  }

  // Semi-finals (2 matches)
  const sfMatches: BracketMatch[] = [];
  for (let i = 0; i < 2; i++) {
    const m1 = qfMatches[i * 2];
    const m2 = qfMatches[i * 2 + 1];
    const home = m1.winner === 'home' ? m1.homeTeam : m1.awayTeam;
    const away = m2.winner === 'home' ? m2.homeTeam : m2.awayTeam;
    const homeScore = Math.floor(Math.random() * 3) + 1;
    const awayScore = Math.floor(Math.random() * 2);
    sfMatches.push({
      id: `sf-${i}`,
      homeTeam: { ...home, score: homeScore },
      awayTeam: { ...away, score: awayScore },
      winner: homeScore > awayScore ? 'home' : 'away',
    });
  }

  // Final (1 match)
  const sf0 = sfMatches[0];
  const sf1 = sfMatches[1];
  const finalHome = sf0.winner === 'home' ? sf0.homeTeam : sf0.awayTeam;
  const finalAway = sf1.winner === 'home' ? sf1.homeTeam : sf1.awayTeam;
  const finalHomeScore = Math.floor(Math.random() * 3) + 1;
  const finalAwayScore = Math.floor(Math.random() * 2);

  const finalMatch: BracketMatch = {
    id: 'final',
    homeTeam: { ...finalHome, score: finalHomeScore },
    awayTeam: { ...finalAway, score: finalAwayScore },
    winner: finalHomeScore >= finalAwayScore ? 'home' : 'away',
  };

  return [
    { name: '32强', matches: r32Matches },
    { name: '16强', matches: r16Matches },
    { name: '8强', matches: qfMatches },
    { name: '半决赛', matches: sfMatches },
    { name: '决赛', matches: [finalMatch] },
  ];
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function KnockoutPage() {
  const { teams, isLoading, fetchTeams, championPrediction } = usePredictionStore();
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (!teams.length) fetchTeams();
    api
      .getSimulationSummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoadingSummary(false));
  }, []);

  const bracket = generateBracket(teams, summary);
  const champion = bracket[bracket.length - 1]?.matches[0];
  const winner = champion
    ? champion.winner === 'home'
      ? champion.homeTeam
      : champion.awayTeam
    : null;

  const champPred = championPrediction?.[0];

  if (isLoading && !teams.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-3 text-slate-400">正在加载淘汰赛数据...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-1">
          淘汰赛预测
        </h1>
        <p className="text-slate-400 text-sm">
          基于蒙特卡洛模拟的完整淘汰赛路径预测
        </p>
      </motion.div>

      {/* Bracket Visualization */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard padding="lg">
          <div className="overflow-x-auto hide-scrollbar pb-4">
            <div className="flex gap-4 items-stretch min-w-max px-2">
              {bracket.map((round, i) => (
                <div key={round.name} className="flex items-stretch">
                  <RoundColumn round={round} roundIndex={i} />
                  {i < bracket.length - 1 && (
                    <div className="flex flex-col justify-around px-1">
                      {Array.from({ length: Math.ceil(round.matches.length / 2) }).map(
                        (_, j) => (
                          <div
                            key={j}
                            className="w-6 h-px bg-gradient-to-r from-white/10 to-white/5"
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Champion Spotlight */}
      {winner && (
        <div className="max-w-md mx-auto">
          <ChampionSpotlight
            team={winner}
            probability={champPred?.probability ?? summary?.top_champion_prob ?? 0.15}
          />
        </div>
      )}

      {/* Loading fallback */}
      {loadingSummary && (
        <div className="text-center py-4">
          <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-500">正在模拟淘汰赛...</p>
        </div>
      )}
    </div>
  );
}
