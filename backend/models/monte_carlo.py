"""Monte Carlo tournament simulation engine."""
import logging
import math
import random
from typing import Dict, List, Any, Tuple, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


def _poisson_sample(lam: float) -> int:
    """Fast Poisson random variate using Knuth's algorithm."""
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while True:
        k += 1
        p *= random.random()
        if p <= L:
            return k - 1


class MonteCarloSimulator:
    """Monte Carlo simulation for the 2026 FIFA World Cup tournament."""

    def __init__(self, teams: List[Dict], matches: List[Dict],
                 match_predictor=None, pred_cache: Optional[Dict] = None):
        self.teams = {t["id"]: t for t in teams}
        self.matches = matches
        self.predictor = match_predictor
        self.pred_cache = pred_cache or {}
        self.group_matches = [m for m in matches if m["stage"] == "group"]
        self.knockout_matches = [m for m in matches if m["stage"] != "group"]

    def _get_prediction(self, home_team: Dict, away_team: Dict) -> Dict:
        """Get prediction for a match, using cache if available."""
        home_id = home_team.get("id", "")
        away_id = away_team.get("id", "")
        cache_key = (home_id, away_id)

        if cache_key in self.pred_cache:
            return self.pred_cache[cache_key]

        if self.predictor:
            pred = self.predictor(home_team, away_team)
            # Cache for future use
            self.pred_cache[cache_key] = pred
            return pred

        # Fallback: simple Elo-based prediction
        elo_diff = home_team.get("elo_rating", 1500) - away_team.get("elo_rating", 1500)
        elo_diff += 100  # home advantage
        home_prob = 1.0 / (1.0 + 10 ** (-elo_diff / 400))
        draw_prob = 0.25 * (1 - abs(home_prob - 0.5) * 2)
        away_prob = 1.0 - home_prob - draw_prob
        return {
            "home_win_prob": max(0.05, home_prob),
            "draw_prob": max(0.05, draw_prob),
            "away_win_prob": max(0.05, away_prob),
            "expected_home_goals": 1.3,
            "expected_away_goals": 1.0,
        }

    def simulate_match(self, home_team: Dict, away_team: Dict) -> Tuple[int, int]:
        """Simulate a single match result based on prediction probabilities.

        Returns:
            Tuple of (home_goals, away_goals)
        """
        pred = self._get_prediction(home_team, away_team)

        # Determine outcome
        r = random.random()
        home_win_p = pred.get("home_win_prob", 0.4)
        draw_p = pred.get("draw_prob", 0.25)

        exp_home = pred.get("expected_home_goals", 1.3)
        exp_away = pred.get("expected_away_goals", 1.0)

        # Sample goals from Poisson distribution
        home_goals = _poisson_sample(max(0.1, exp_home))
        away_goals = _poisson_sample(max(0.1, exp_away))

        # Bias towards the predicted outcome
        if r < home_win_p:
            if home_goals <= away_goals:
                home_goals = away_goals + random.choice([1, 1, 2])
        elif r < home_win_p + draw_p:
            home_goals = away_goals
        else:
            if away_goals <= home_goals:
                away_goals = home_goals + random.choice([1, 1, 2])

        return home_goals, away_goals

    def simulate_group_stage(self, group: str,
                              group_matches: List[Dict]) -> List[Dict]:
        """Simulate all matches in a group and return standings.

        Returns:
            List of dicts with team_id, points, goals_for, goals_against, etc.
        """
        standings = defaultdict(lambda: {
            "played": 0, "won": 0, "drawn": 0, "lost": 0,
            "goals_for": 0, "goals_against": 0, "points": 0
        })

        for match in group_matches:
            if match.get("group") != group:
                continue

            home_id = match["home_team_id"]
            away_id = match["away_team_id"]
            home_team = self.teams.get(home_id, {})
            away_team = self.teams.get(away_id, {})

            if not home_team or not away_team:
                continue

            home_goals, away_goals = self.simulate_match(home_team, away_team)

            standings[home_id]["played"] += 1
            standings[away_id]["played"] += 1
            standings[home_id]["goals_for"] += home_goals
            standings[home_id]["goals_against"] += away_goals
            standings[away_id]["goals_for"] += away_goals
            standings[away_id]["goals_against"] += home_goals

            if home_goals > away_goals:
                standings[home_id]["won"] += 1
                standings[home_id]["points"] += 3
                standings[away_id]["lost"] += 1
            elif home_goals == away_goals:
                standings[home_id]["drawn"] += 1
                standings[away_id]["drawn"] += 1
                standings[home_id]["points"] += 1
                standings[away_id]["points"] += 1
            else:
                standings[away_id]["won"] += 1
                standings[away_id]["points"] += 3
                standings[home_id]["lost"] += 1

        result = []
        for team_id, stats in standings.items():
            stats["team_id"] = team_id
            stats["goal_diff"] = stats["goals_for"] - stats["goals_against"]
            result.append(stats)

        # Sort by points, then goal difference, then goals scored
        result.sort(key=lambda x: (x["points"], x["goal_diff"], x["goals_for"]), reverse=True)
        return result

    def simulate_tournament(self, num_simulations: int = 10000) -> Dict[str, Any]:
        """Run full tournament simulation multiple times.

        Returns:
            Dict with champion_prob, qualification_prob, avg_goals, total_simulations
        """
        logger.info(f"Starting Monte Carlo simulation with {num_simulations} iterations...")

        champion_counts = defaultdict(int)
        stage_counts = defaultdict(lambda: defaultdict(int))
        total_goals = defaultdict(lambda: {"total": 0, "matches": 0})

        groups = sorted(set(m.get("group") for m in self.group_matches if m.get("group")))

        for sim in range(num_simulations):
            if sim % 2000 == 0 and sim > 0:
                logger.info(f"Simulation progress: {sim}/{num_simulations}")

            # Simulate group stage
            group_results = {}
            all_advancing = []

            for group in groups:
                g_matches = [m for m in self.group_matches if m.get("group") == group]
                standings = self.simulate_group_stage(group, g_matches)
                group_results[group] = standings

                for i, team_stats in enumerate(standings):
                    team_id = team_stats["team_id"]
                    position = i + 1
                    stage_counts[team_id]["group"] += 1

                    if position <= 2:
                        all_advancing.append({
                            "team_id": team_id,
                            "group": group,
                            "position": position,
                            "points": team_stats["points"],
                            "goal_diff": team_stats["goal_diff"],
                            "goals_for": team_stats["goals_for"],
                        })
                        stage_counts[team_id]["r32"] += 1
                    elif position == 3:
                        # Track third-place teams for potential advancement
                        all_advancing.append({
                            "team_id": team_id,
                            "group": group,
                            "position": 3,
                            "points": team_stats["points"],
                            "goal_diff": team_stats["goal_diff"],
                            "goals_for": team_stats["goals_for"],
                        })

            # Select 32 advancing teams:
            # Top 2 from each group (24) + 8 best third-place teams
            top2 = [t for t in all_advancing if t["position"] <= 2]
            third_place = [t for t in all_advancing if t["position"] == 3]
            third_place.sort(key=lambda x: (x["points"], x["goal_diff"], x["goals_for"]), reverse=True)
            best_third = third_place[:8]

            advancing_32 = top2 + best_third
            for t in advancing_32:
                stage_counts[t["team_id"]]["r32"] += 1 if t["position"] == 3 else 0

            # Sort advancing teams by strength for bracket seeding
            advancing_32.sort(
                key=lambda x: self.teams.get(x["team_id"], {}).get("elo_rating", 1500),
                reverse=True
            )

            # Simulate R32 (16 matches)
            r32_winners = []
            r32_bye = advancing_32[:8]  # Top 8 seeds get byes
            r32_play = advancing_32[8:]  # Remaining 16 teams play

            for i in range(0, len(r32_play), 2):
                if i + 1 < len(r32_play):
                    t1 = self.teams.get(r32_play[i]["team_id"], {})
                    t2 = self.teams.get(r32_play[i + 1]["team_id"], {})
                    g1, g2 = self.simulate_match(t1, t2)
                    total_goals[r32_play[i]["team_id"]]["total"] += g1
                    total_goals[r32_play[i]["team_id"]]["matches"] += 1
                    total_goals[r32_play[i + 1]["team_id"]]["total"] += g2
                    total_goals[r32_play[i + 1]["team_id"]]["matches"] += 1

                    if g1 > g2:
                        r32_winners.append(r32_play[i])
                    elif g1 < g2:
                        r32_winners.append(r32_play[i + 1])
                    else:
                        # Penalty shootout - higher Elo wins
                        if t1.get("elo_rating", 1500) >= t2.get("elo_rating", 1500):
                            r32_winners.append(r32_play[i])
                        else:
                            r32_winners.append(r32_play[i + 1])

            # R16: 8 bye teams + 8 R32 winners = 16 teams
            r16_teams = r32_bye + r32_winners
            r16_teams.sort(
                key=lambda x: self.teams.get(x["team_id"], {}).get("elo_rating", 1500),
                reverse=True
            )

            for t in r16_teams:
                stage_counts[t["team_id"]]["r16"] += 1

            # Simulate R16 (8 matches)
            r16_winners = []
            for i in range(0, len(r16_teams), 2):
                if i + 1 < len(r16_teams):
                    t1 = self.teams.get(r16_teams[i]["team_id"], {})
                    t2 = self.teams.get(r16_teams[i + 1]["team_id"], {})
                    g1, g2 = self.simulate_match(t1, t2)
                    total_goals[r16_teams[i]["team_id"]]["total"] += g1
                    total_goals[r16_teams[i]["team_id"]]["matches"] += 1
                    total_goals[r16_teams[i + 1]["team_id"]]["total"] += g2
                    total_goals[r16_teams[i + 1]["team_id"]]["matches"] += 1

                    if g1 > g2:
                        r16_winners.append(r16_teams[i])
                    elif g1 < g2:
                        r16_winners.append(r16_teams[i + 1])
                    else:
                        if t1.get("elo_rating", 1500) >= t2.get("elo_rating", 1500):
                            r16_winners.append(r16_teams[i])
                        else:
                            r16_winners.append(r16_teams[i + 1])

            for t in r16_winners:
                stage_counts[t["team_id"]]["qf"] += 1

            # Simulate QF (4 matches)
            qf_winners = []
            for i in range(0, len(r16_winners), 2):
                if i + 1 < len(r16_winners):
                    t1 = self.teams.get(r16_winners[i]["team_id"], {})
                    t2 = self.teams.get(r16_winners[i + 1]["team_id"], {})
                    g1, g2 = self.simulate_match(t1, t2)
                    total_goals[r16_winners[i]["team_id"]]["total"] += g1
                    total_goals[r16_winners[i]["team_id"]]["matches"] += 1
                    total_goals[r16_winners[i + 1]["team_id"]]["total"] += g2
                    total_goals[r16_winners[i + 1]["team_id"]]["matches"] += 1

                    if g1 > g2:
                        qf_winners.append(r16_winners[i])
                    elif g1 < g2:
                        qf_winners.append(r16_winners[i + 1])
                    else:
                        if t1.get("elo_rating", 1500) >= t2.get("elo_rating", 1500):
                            qf_winners.append(r16_winners[i])
                        else:
                            qf_winners.append(r16_winners[i + 1])

            for t in qf_winners:
                stage_counts[t["team_id"]]["sf"] += 1

            # Simulate SF (2 matches)
            sf_winners = []
            sf_losers = []
            for i in range(0, len(qf_winners), 2):
                if i + 1 < len(qf_winners):
                    t1 = self.teams.get(qf_winners[i]["team_id"], {})
                    t2 = self.teams.get(qf_winners[i + 1]["team_id"], {})
                    g1, g2 = self.simulate_match(t1, t2)

                    if g1 > g2:
                        sf_winners.append(qf_winners[i])
                        sf_losers.append(qf_winners[i + 1])
                    elif g1 < g2:
                        sf_winners.append(qf_winners[i + 1])
                        sf_losers.append(qf_winners[i])
                    else:
                        if t1.get("elo_rating", 1500) >= t2.get("elo_rating", 1500):
                            sf_winners.append(qf_winners[i])
                            sf_losers.append(qf_winners[i + 1])
                        else:
                            sf_winners.append(qf_winners[i + 1])
                            sf_losers.append(qf_winners[i])

            for t in sf_winners:
                stage_counts[t["team_id"]]["final"] += 1

            # Simulate Final
            if len(sf_winners) >= 2:
                t1 = self.teams.get(sf_winners[0]["team_id"], {})
                t2 = self.teams.get(sf_winners[1]["team_id"], {})
                g1, g2 = self.simulate_match(t1, t2)

                if g1 > g2:
                    champion_id = sf_winners[0]["team_id"]
                elif g1 < g2:
                    champion_id = sf_winners[1]["team_id"]
                else:
                    champion_id = sf_winners[0]["team_id"] if t1.get("elo_rating", 1500) >= t2.get("elo_rating", 1500) else sf_winners[1]["team_id"]

                champion_counts[champion_id] += 1
                stage_counts[champion_id]["champion"] += 1

        # Calculate probabilities
        champion_prob = {}
        for team_id, count in champion_counts.items():
            champion_prob[team_id] = round(count / num_simulations, 4)

        qualification_prob = {}
        for team_id in self.teams:
            stages = {}
            for stage in ["r32", "r16", "qf", "sf", "final", "champion"]:
                stages[stage] = round(stage_counts[team_id][stage] / num_simulations, 4)
            qualification_prob[team_id] = stages

        avg_goals = {}
        for team_id, data in total_goals.items():
            if data["matches"] > 0:
                avg_goals[team_id] = round(data["total"] / data["matches"], 3)

        logger.info(f"Simulation complete. Top champion: {max(champion_prob, key=champion_prob.get) if champion_prob else 'N/A'}")

        return {
            "champion_prob": champion_prob,
            "qualification_prob": qualification_prob,
            "avg_goals": avg_goals,
            "total_simulations": num_simulations,
        }
