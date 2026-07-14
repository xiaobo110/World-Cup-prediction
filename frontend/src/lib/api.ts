import type {
  Team,
  TeamDetail,
  Group,
  Match,
  MatchPrediction,
  ChampionPrediction,
  SimulationResult,
  SimulationSummary,
  Explanation,
  ChampionExplanation,
  ChatResponse,
} from '@/types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  getTeams: (): Promise<Team[]> =>
    fetchJson(`${API_BASE}/teams`),

  getTeam: (id: string): Promise<TeamDetail> =>
    fetchJson(`${API_BASE}/teams/${id}`),

  getGroups: (): Promise<Group[]> =>
    fetchJson(`${API_BASE}/groups`),

  getMatches: (): Promise<Match[]> =>
    fetchJson(`${API_BASE}/matches`),

  predictMatch: (id: string): Promise<MatchPrediction> =>
    fetchJson(`${API_BASE}/matches/${id}/predict`),

  getChampionPrediction: (): Promise<{
    predictions: ChampionPrediction[];
    top_scorers: { team: string; player: string; goals: number }[];
    dark_horses: string[];
    model_confidence: number;
  }> =>
    fetchJson(`${API_BASE}/predictions/champion`),

  simulate: (n: number): Promise<SimulationResult> =>
    fetchJson(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_simulations: n }),
    }),

  getSimulationSummary: (): Promise<SimulationSummary> =>
    fetchJson(`${API_BASE}/simulate/summary`),

  explainMatch: (id: string): Promise<Explanation> =>
    fetchJson(`${API_BASE}/explain/match/${id}`),

  explainChampion: (): Promise<ChampionExplanation> =>
    fetchJson(`${API_BASE}/explain/champion`),

  chat: (message: string): Promise<ChatResponse> =>
    fetchJson(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }),

  health: (): Promise<{ status: string }> =>
    fetchJson(`${API_BASE}/health`),
};
