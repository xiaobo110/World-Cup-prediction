"""Poisson distribution model for goal prediction."""
import logging
import math
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

# Overall World Cup averages
OVERALL_AVG_HOME_GOALS = 1.38
OVERALL_AVG_AWAY_GOALS = 1.08
OVERALL_AVG_GOALS = 1.23
OVERALL_AVG_CONCED = 1.23


def _poisson_pmf(k: int, lam: float) -> float:
    """Fast Poisson PMF using math library (no scipy dependency)."""
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(k * math.log(lam) - lam - math.lgamma(k + 1))


class PoissonModel:
    """Poisson distribution-based goal prediction model."""

    def __init__(self, avg_home_goals: float = OVERALL_AVG_HOME_GOALS,
                 avg_away_goals: float = OVERALL_AVG_AWAY_GOALS,
                 overall_avg: float = OVERALL_AVG_GOALS,
                 overall_avg_conced: float = OVERALL_AVG_CONCED):
        self.avg_home_goals = avg_home_goals
        self.avg_away_goals = avg_away_goals
        self.overall_avg = overall_avg
        self.overall_avg_conced = overall_avg_conced

    def calculate_expected_goals(self, attacking_team: Dict[str, Any],
                                  defending_team: Dict[str, Any],
                                  is_home: bool = True) -> float:
        """Calculate expected goals for the attacking team."""
        attack_strength = attacking_team.get("attack_strength", 1.0)
        defense_strength = defending_team.get("defense_strength", 1.0)
        base_goals = self.avg_home_goals if is_home else self.avg_away_goals
        expected = attack_strength * defense_strength * base_goals
        return max(0.1, min(5.0, expected))

    def predict_match(self, home_team: Dict[str, Any],
                      away_team: Dict[str, Any],
                      max_goals: int = 8) -> Dict[str, Any]:
        """Predict match outcome using Poisson distribution (full version)."""
        exp_home = self.calculate_expected_goals(home_team, away_team, is_home=True)
        exp_away = self.calculate_expected_goals(away_team, home_team, is_home=False)

        prob_matrix = [[0.0] * max_goals for _ in range(max_goals)]
        home_win = 0.0
        draw = 0.0
        away_win = 0.0
        score_probs = []

        for i in range(max_goals):
            p_i = _poisson_pmf(i, exp_home)
            for j in range(max_goals):
                p = p_i * _poisson_pmf(j, exp_away)
                prob_matrix[i][j] = p
                score_probs.append({"home": i, "away": j, "prob": round(p, 6)})
                if i > j:
                    home_win += p
                elif i == j:
                    draw += p
                else:
                    away_win += p

        total = home_win + draw + away_win
        if total > 0:
            home_win /= total
            draw /= total
            away_win /= total

        score_probs.sort(key=lambda x: x["prob"], reverse=True)

        return {
            "expected_home_goals": round(exp_home, 3),
            "expected_away_goals": round(exp_away, 3),
            "home_win_prob": round(home_win, 4),
            "draw_prob": round(draw, 4),
            "away_win_prob": round(away_win, 4),
            "most_likely_scores": score_probs[:5],
        }

    def fast_predict(self, home_team: Dict[str, Any],
                     away_team: Dict[str, Any],
                     max_goals: int = 7) -> Dict[str, Any]:
        """Fast prediction: only win/draw/away probs + expected goals. No score matrix."""
        exp_home = self.calculate_expected_goals(home_team, away_team, is_home=True)
        exp_away = self.calculate_expected_goals(away_team, home_team, is_home=False)

        home_win = 0.0
        draw = 0.0
        away_win = 0.0

        # Pre-compute Poisson PMFs
        home_pmf = [_poisson_pmf(i, exp_home) for i in range(max_goals)]
        away_pmf = [_poisson_pmf(j, exp_away) for j in range(max_goals)]

        for i in range(max_goals):
            for j in range(max_goals):
                p = home_pmf[i] * away_pmf[j]
                if i > j:
                    home_win += p
                elif i == j:
                    draw += p
                else:
                    away_win += p

        total = home_win + draw + away_win
        if total > 0:
            home_win /= total
            draw /= total
            away_win /= total

        return {
            "expected_home_goals": round(exp_home, 3),
            "expected_away_goals": round(exp_away, 3),
            "home_win_prob": round(home_win, 4),
            "draw_prob": round(draw, 4),
            "away_win_prob": round(away_win, 4),
        }
