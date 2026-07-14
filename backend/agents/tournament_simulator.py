"""Tournament simulation agent - runs Monte Carlo simulations."""
import logging
from typing import Dict, List, Any, Optional

from services.data_fetcher import DataFetcher
from models.monte_carlo import MonteCarloSimulator
from models.ensemble import EnsembleModel
from models.schemas import SimulationResult, ChampionPrediction, ChampionPredictionResponse
from config import settings

logger = logging.getLogger(__name__)


class TournamentSimulatorAgent:
    """Agent for running tournament simulations and generating predictions."""

    def __init__(self, data_fetcher: DataFetcher, ensemble: EnsembleModel):
        self.fetcher = data_fetcher
        self.ensemble = ensemble
        self._last_result: Optional[SimulationResult] = None

    def _get_predictor_fn(self):
        """Get a prediction function for the Monte Carlo simulator."""
        def predictor(home_team, away_team):
            pred = self.ensemble.predict(home_team, away_team)
            return {
                "home_win_prob": pred.home_win_prob,
                "draw_prob": pred.draw_prob,
                "away_win_prob": pred.away_win_prob,
                "expected_home_goals": pred.predicted_home_goals,
                "expected_away_goals": pred.predicted_away_goals,
            }
        return predictor

    def _build_pred_cache(self, teams_data: List[Dict]) -> Dict:
        """Pre-compute predictions for all team pairs using fast models only.

        Uses Elo + Poisson for speed. Full ML ensemble is used for
        individual match predictions on demand.
        """
        cache = {}
        for i, home in enumerate(teams_data):
            for j, away in enumerate(teams_data):
                if i != j:
                    key = (home["id"], away["id"])
                    # Fast prediction: weighted average of Elo and Poisson
                    elo_pred = self.ensemble.elo_model.predict_match(home, away)
                    poisson_pred = self.ensemble.poisson_model.fast_predict(home, away)
                    cache[key] = {
                        "home_win_prob": 0.4 * elo_pred["home_win_prob"] + 0.6 * poisson_pred["home_win_prob"],
                        "draw_prob": 0.4 * elo_pred["draw_prob"] + 0.6 * poisson_pred["draw_prob"],
                        "away_win_prob": 0.4 * elo_pred["away_win_prob"] + 0.6 * poisson_pred["away_win_prob"],
                        "expected_home_goals": 0.5 * elo_pred.get("expected_home_goals", 1.3) + 0.5 * poisson_pred["expected_home_goals"],
                        "expected_away_goals": 0.5 * elo_pred.get("expected_away_goals", 1.0) + 0.5 * poisson_pred["expected_away_goals"],
                    }
        logger.info(f"Pre-computed prediction cache: {len(cache)} team pairs (Elo+Poisson)")
        return cache

    def simulate_full_tournament(self, num_simulations: int = None) -> SimulationResult:
        """Run full tournament simulation.

        Args:
            num_simulations: Number of simulations to run (default from config)

        Returns:
            SimulationResult with champion probabilities and qualification stats
        """
        if num_simulations is None:
            num_simulations = settings.MONTE_CARLO_SIMULATIONS

        teams = self.fetcher.fetch_teams()
        matches = self.fetcher.fetch_matches()

        teams_data = [t.model_dump() for t in teams]
        matches_data = [m.model_dump() for m in matches]

        # Pre-compute prediction cache for all team pairs
        pred_cache = self._build_pred_cache(teams_data)

        simulator = MonteCarloSimulator(
            teams=teams_data,
            matches=matches_data,
            match_predictor=self._get_predictor_fn(),
            pred_cache=pred_cache,
        )

        result = simulator.simulate_tournament(num_simulations)
        self._last_result = SimulationResult(**result)

        logger.info(f"Tournament simulation complete: {num_simulations} iterations")
        return self._last_result

    def get_champion_probabilities(self, top_n: int = 10) -> ChampionPredictionResponse:
        """Get champion prediction with paths.

        Returns:
            ChampionPredictionResponse with top teams, scorers, and dark horses
        """
        if not self._last_result:
            self.simulate_full_tournament()

        result = self._last_result
        teams_dict = {t.id: t for t in self.fetcher.fetch_teams()}

        # Sort teams by champion probability
        sorted_champs = sorted(
            result.champion_prob.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_n]

        predictions = []
        for team_id, prob in sorted_champs:
            team = teams_dict.get(team_id)
            if not team:
                continue

            # Build path (simplified)
            qual = result.qualification_prob.get(team_id, {})
            path = [
                {"round": "group", "prob": round(qual.get("r32", 0), 3)},
                {"round": "r32", "prob": round(qual.get("r16", 0), 3)},
                {"round": "r16", "prob": round(qual.get("qf", 0), 3)},
                {"round": "qf", "prob": round(qual.get("sf", 0), 3)},
                {"round": "sf", "prob": round(qual.get("final", 0), 3)},
                {"round": "final", "prob": round(prob, 3)},
            ]

            predictions.append(ChampionPrediction(
                team=team,
                probability=round(prob, 4),
                path=path,
            ))

        # Top scorers (based on attack strength and team strength)
        top_scorers = self._estimate_top_scorers(teams_dict)

        # Dark horses (teams with decent champion prob but not top favorites)
        dark_horses = []
        for team_id, prob in sorted_champs[5:top_n]:
            team = teams_dict.get(team_id)
            if team:
                dark_horses.append({
                    "team": team.name,
                    "team_id": team_id,
                    "probability": round(prob, 4),
                    "reason": f"Strong squad with {team.elo_rating:.0f} Elo rating"
                })

        # Model confidence
        if predictions:
            top_prob = predictions[0].probability if predictions else 0
            model_confidence = min(0.95, top_prob * 3)
        else:
            model_confidence = 0.5

        return ChampionPredictionResponse(
            predictions=predictions,
            top_scorers=top_scorers,
            dark_horses=dark_horses[:5],
            model_confidence=round(model_confidence, 3),
        )

    def simulate_group_stage(self) -> Dict[str, List[Dict]]:
        """Simulate group stage and return predicted standings."""
        if not self._last_result:
            self.simulate_full_tournament()

        teams_dict = {t.id: t for t in self.fetcher.fetch_teams()}
        result = self._last_result

        group_standings = {}
        groups = sorted(set(t.group for t in teams_dict.values()))

        for group in groups:
            group_teams = [t for t in teams_dict.values() if t.group == group]
            group_teams.sort(key=lambda t: (
                result.qualification_prob.get(t.id, {}).get("r32", 0),
                t.elo_rating
            ), reverse=True)

            standings = []
            for i, team in enumerate(group_teams):
                qual = result.qualification_prob.get(team.id, {})
                standings.append({
                    "position": i + 1,
                    "team": team.model_dump(),
                    "qualification_prob": round(qual.get("r32", 0), 3),
                })
            group_standings[group] = standings

        return group_standings

    def simulate_knockout_bracket(self) -> Dict[str, Any]:
        """Generate predicted knockout bracket."""
        if not self._last_result:
            self.simulate_full_tournament()

        teams_dict = {t.id: t for t in self.fetcher.fetch_teams()}
        result = self._last_result

        # Get most likely R16 teams
        r16_probs = {}
        for team_id, qual in result.qualification_prob.items():
            r16_probs[team_id] = qual.get("r16", 0)

        sorted_teams = sorted(r16_probs.items(), key=lambda x: x[1], reverse=True)
        likely_r16 = [t[0] for t in sorted_teams[:16]]

        bracket = {
            "likely_r16": [
                {"team_id": tid, "team_name": teams_dict[tid].name if tid in teams_dict else tid,
                 "qualification_prob": round(prob, 3)}
                for tid, prob in sorted_teams[:16]
            ],
            "predicted_qf": [],
            "predicted_sf": [],
            "predicted_final": [],
        }

        # Simple bracket prediction
        for i in range(0, min(8, len(likely_r16)), 2):
            if i + 1 < len(likely_r16):
                t1 = likely_r16[i]
                t2 = likely_r16[i + 1]
                team1 = teams_dict.get(t1)
                team2 = teams_dict.get(t2)
                winner = t1 if (team1 and team2 and team1.elo_rating >= team2.elo_rating) else t2
                bracket["predicted_qf"].append({
                    "match": f"{t1} vs {t2}",
                    "predicted_winner": winner,
                })

        return bracket

    def _estimate_top_scorers(self, teams_dict: Dict) -> List[Dict]:
        """Estimate top scorers based on team attack strength and player data."""
        scorers = []
        for team_id, team in teams_dict.items():
            if team.squad:
                # Find forwards/strikers
                forwards = [p for p in team.squad if p.position in ("FW", "MF")]
                for player in forwards[:2]:
                    # Estimate goals based on attack strength and player value
                    base_goals = team.attack_strength * 2.5
                    value_factor = min(2.0, player.market_value_eur / 50e6)
                    estimated_goals = base_goals * value_factor * 0.5
                    scorers.append({
                        "player": player.name,
                        "team": team.name,
                        "team_id": team_id,
                        "position": player.position,
                        "estimated_goals": round(estimated_goals, 1),
                        "market_value_eur": player.market_value_eur,
                    })

        scorers.sort(key=lambda x: x["estimated_goals"], reverse=True)
        return scorers[:15]
