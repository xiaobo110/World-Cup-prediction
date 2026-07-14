'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { BracketNode } from './BracketNode';
import type { Team } from '@/types';

interface TournamentMatch {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  homeWinProb: number;
  awayWinProb: number;
}

interface TournamentBracketProps {
  rounds: {
    name: string;
    matches: TournamentMatch[];
  }[];
  onMatchClick?: (roundIdx: number, matchIdx: number) => void;
}

export function TournamentBracket({ rounds, onMatchClick }: TournamentBracketProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex items-stretch gap-2 min-w-max px-4">
        {rounds.map((round, roundIdx) => {
          const matchCount = round.matches.length;
          // Calculate vertical spacing: more matches = less spacing
          // The final match should be centered vertically
          const isFinal = roundIdx === rounds.length - 1;

          return (
            <div key={round.name} className="flex items-center">
              {/* Round column */}
              <div className="flex flex-col items-center">
                {/* Round name */}
                <motion.h3
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: roundIdx * 0.1 }}
                  className="text-xs font-semibold text-slate-400 mb-4 whitespace-nowrap text-center px-2"
                >
                  {round.name}
                </motion.h3>

                {/* Matches */}
                <div
                  className="flex flex-col justify-center"
                  style={{
                    gap: `${Math.max(8, 48 - matchCount * 4)}px`,
                  }}
                >
                  {round.matches.map((match, matchIdx) => {
                    const homeWon = match.homeScore > match.awayScore ? 'home' as const : null;
                    const awayWon = match.awayScore > match.homeScore ? 'away' as const : null;
                    const winner = homeWon || awayWon;

                    return (
                      <motion.div
                        key={`${roundIdx}-${matchIdx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.3,
                          delay: roundIdx * 0.1 + matchIdx * 0.05,
                        }}
                        className={isFinal ? '' : ''}
                      >
                        <BracketNode
                          homeTeam={match.homeTeam}
                          awayTeam={match.awayTeam}
                          homeScore={match.homeScore}
                          awayScore={match.awayScore}
                          homeWinProb={match.homeWinProb}
                          awayWinProb={match.awayWinProb}
                          winner={winner}
                          onClick={() => onMatchClick?.(roundIdx, matchIdx)}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Arrow connector between rounds */}
              {roundIdx < rounds.length - 1 && (
                <div className="flex items-center px-1">
                  <ChevronRight size={16} className="text-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
