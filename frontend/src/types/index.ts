export interface Player {
  name: string;
  position: string;
  number: number;
  club: string;
  market_value_eur: number;
}

export interface Team {
  id: string;
  name: string;
  name_zh: string;
  code: string;
  fifa_rank: number;
  elo_rating: number;
  flag_emoji: string;
  group: string;
  attack_strength: number;
  defense_strength: number;
  avg_goals_scored: number;
  avg_goals_conceded: number;
  form: number[];
  market_value_eur: number;
  squad: Player[];
}

export interface GroupStanding {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
  qualification_prob: number;
}

export interface Group {
  name: string;
  teams: Team[];
  standings: GroupStanding[];
}

export interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team: Team;
  away_team: Team;
  datetime: string;
  stage: string;
  group: string | null;
  venue: string;
}

export interface MatchPrediction {
  match_id: string;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  predicted_home_goals: number;
  predicted_away_goals: number;
  confidence: number;
  model_breakdown: {
    elo: Record<string, unknown>;
    poisson: Record<string, unknown>;
    random_forest: Record<string, unknown>;
    xgboost: Record<string, unknown>;
    lightgbm: Record<string, unknown>;
    ensemble: Record<string, unknown>;
  };
  key_factors: KeyFactor[];
}

export interface KeyFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface ChampionPrediction {
  team: Team;
  probability: number;
  path: { round: string; opponent: string; win_prob: number }[];
}

export interface SimulationResult {
  champion_prob: Record<string, number>;
  qualification_prob: Record<string, Record<string, number>>;
  avg_goals: Record<string, number>;
  total_simulations: number;
}

export interface SimulationSummary {
  total_simulations: number;
  top_champion: string;
  top_champion_prob: number;
  dark_horses: string[];
  top_scorers: { team: string; player: string; goals: number }[];
  model_confidence: number;
}

export interface ChampionExplanation {
  prediction_summary: string;
  key_factors: KeyFactor[];
  shap_values: Record<string, number>;
  reasoning_chain: string[];
  natural_language: string;
}

export interface Explanation {
  match_id: string;
  prediction_summary: string;
  key_factors: KeyFactor[];
  shap_values: Record<string, number>;
  reasoning_chain: string[];
  natural_language: string;
}

export interface ChatResponse {
  response: string;
  data_context: unknown;
}

export interface TeamDetail extends Team {
  recent_matches: {
    opponent: string;
    goals_for: number;
    goals_against: number;
    result: string;
    date: string;
  }[];
}
