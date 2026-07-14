import { create } from 'zustand';
import type {
  Team,
  Group,
  Match,
  ChampionPrediction,
  SimulationResult,
} from '@/types';
import { api } from '@/lib/api';

interface PredictionState {
  teams: Team[];
  groups: Group[];
  matches: Match[];
  championPrediction: ChampionPrediction[];
  simulationResult: SimulationResult | null;
  selectedTeam: Team | null;
  selectedMatch: Match | null;
  isLoading: boolean;
  error: string | null;
  modelConfidence: number;
  darkHorses: string[];
  topScorers: { team: string; player: string; goals: number }[];

  fetchTeams: () => Promise<void>;
  fetchGroups: () => Promise<void>;
  fetchMatches: () => Promise<void>;
  fetchChampionPrediction: () => Promise<void>;
  runSimulation: (n: number) => Promise<void>;
  setSelectedTeam: (team: Team | null) => void;
  setSelectedMatch: (match: Match | null) => void;
  clearError: () => void;
}

export const usePredictionStore = create<PredictionState>((set, get) => ({
  teams: [],
  groups: [],
  matches: [],
  championPrediction: [],
  simulationResult: null,
  selectedTeam: null,
  selectedMatch: null,
  isLoading: false,
  error: null,
  modelConfidence: 0,
  darkHorses: [],
  topScorers: [],

  fetchTeams: async () => {
    try {
      set({ isLoading: true, error: null });
      const teams = await api.getTeams();
      set({ teams, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchGroups: async () => {
    try {
      set({ isLoading: true, error: null });
      const groups = await api.getGroups();
      set({ groups, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchMatches: async () => {
    try {
      set({ isLoading: true, error: null });
      const matches = await api.getMatches();
      set({ matches, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchChampionPrediction: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await api.getChampionPrediction();
      set({
        championPrediction: data.predictions,
        modelConfidence: data.model_confidence,
        darkHorses: data.dark_horses,
        topScorers: data.top_scorers,
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  runSimulation: async (n: number) => {
    try {
      set({ isLoading: true, error: null });
      const result = await api.simulate(n);
      set({ simulationResult: result, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setSelectedTeam: (team: Team | null) => {
    set({ selectedTeam: team });
  },

  setSelectedMatch: (match: Match | null) => {
    set({ selectedMatch: match });
  },

  clearError: () => {
    set({ error: null });
  },
}));
