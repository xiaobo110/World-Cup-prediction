"""Elo rating model for match prediction."""
import math
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class EloModel:
    """Elo-based match prediction model."""

    def __init__(self, k_factor: float = 40.0, home_advantage: float = 100.0):
        self.k_factor = k_factor
        self.home_advantage = home_advantage

    @staticmethod
    def calculate_expected(elo_a: float, elo_b: float) -> float:
        """Calculate expected score for team A given Elo ratings.
        Returns value between 0 and 1, where 1 means team A is certain to win.
        """
        diff = elo_a - elo_b
        return 1.0 / (1.0 + math.pow(10.0, diff / 400.0))

    def predict_match(self, team_a: Dict[str, Any], team_b: Dict[str, Any],
                      is_neutral: bool = False) -> Dict[str, float]:
        """Predict match outcome probabilities using Elo ratings.

        Args:
            team_a: Home team data dict with 'elo_rating' key
            team_b: Away team data dict with 'elo_rating' key
            is_neutral: If True, no home advantage is applied

        Returns:
            Dict with home_win_prob, draw_prob, away_win_prob
        """
        elo_a = team_a["elo_rating"]
        elo_b = team_b["elo_rating"]

        # Apply home advantage
        if not is_neutral:
            elo_a += self.home_advantage

        expected_a = self.calculate_expected(elo_a, elo_b)
        expected_b = 1.0 - expected_a

        # Calculate draw probability based on Elo difference
        # Small Elo difference -> higher draw probability
        elo_diff = abs(elo_a - elo_b)
        # Base draw probability ~25%, decreases with larger Elo difference
        draw_prob = 0.32 * math.exp(-elo_diff / 600.0)
        draw_prob = max(0.10, min(0.35, draw_prob))

        # Adjust win probabilities
        remaining = 1.0 - draw_prob
        total_expected = expected_a + expected_b
        home_win_prob = remaining * (expected_a / total_expected)
        away_win_prob = remaining * (expected_b / total_expected)

        # Normalize to ensure they sum to 1
        total = home_win_prob + draw_prob + away_win_prob
        home_win_prob /= total
        draw_prob /= total
        away_win_prob /= total

        return {
            "home_win_prob": round(home_win_prob, 4),
            "draw_prob": round(draw_prob, 4),
            "away_win_prob": round(away_win_prob, 4),
            "expected_home_goals": round(expected_a * 2.0, 3),
            "expected_away_goals": round(expected_b * 2.0, 3),
        }

    def update_elo(self, elo_a: float, elo_b: float, result: float) -> tuple:
        """Update Elo ratings after a match.

        Args:
            elo_a: Team A's current Elo rating
            elo_b: Team B's current Elo rating
            result: 1.0 for A win, 0.5 for draw, 0.0 for B win

        Returns:
            Tuple of (new_elo_a, new_elo_b)
        """
        expected_a = self.calculate_expected(elo_a, elo_b)
        delta_a = self.k_factor * (result - expected_a)
        return round(elo_a + delta_a, 1), round(elo_b - delta_a, 1)
