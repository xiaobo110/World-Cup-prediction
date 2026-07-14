"""Weighted ensemble model that fuses predictions from all individual models."""
import logging
from typing import Dict, Any, List, Optional

from models.elo_model import EloModel
from models.poisson_model import PoissonModel
from models.ml_model import MLModel
from models.schemas import ModelBreakdown, KeyFactor, MatchPrediction

logger = logging.getLogger(__name__)


class EnsembleModel:
    """Weighted ensemble that combines Elo, Poisson, and ML model predictions."""

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.elo_model = EloModel()
        self.poisson_model = PoissonModel()
        self.ml_model = MLModel()

        # Default weights
        self.weights = weights or {
            "elo": 0.15,
            "poisson": 0.25,
            "random_forest": 0.20,
            "xgboost": 0.20,
            "lightgbm": 0.20,
        }

    @property
    def is_trained(self) -> bool:
        return self.ml_model.is_trained

    def train_ml(self) -> Dict[str, float]:
        """Train the ML component models."""
        return self.ml_model.train()

    def predict(self, home_team: Dict[str, Any], away_team: Dict[str, Any],
                match_id: str = "") -> MatchPrediction:
        """Generate fused prediction from all models.

        Args:
            home_team: Home team data dict
            away_team: Away team data dict
            match_id: Match identifier

        Returns:
            MatchPrediction with all model breakdowns and key factors
        """
        # Get predictions from each model
        elo_pred = self.elo_model.predict_match(home_team, away_team)
        poisson_pred = self.poisson_model.predict_match(home_team, away_team)

        ml_preds = {}
        if self.ml_model.is_trained:
            ml_preds = self.ml_model.predict(home_team, away_team)

        # Extract probabilities
        model_probs = {}
        model_probs["elo"] = {
            "home": elo_pred["home_win_prob"],
            "draw": elo_pred["draw_prob"],
            "away": elo_pred["away_win_prob"],
        }
        model_probs["poisson"] = {
            "home": poisson_pred["home_win_prob"],
            "draw": poisson_pred["draw_prob"],
            "away": poisson_pred["away_win_prob"],
        }

        for model_name in ["random_forest", "xgboost", "lightgbm"]:
            if model_name in ml_preds:
                p = ml_preds[model_name]
                model_probs[model_name] = {
                    "home": p["home_win_prob"],
                    "draw": p["draw_prob"],
                    "away": p["away_win_prob"],
                }

        # Weighted ensemble
        ensemble_home = 0.0
        ensemble_draw = 0.0
        ensemble_away = 0.0
        total_weight = 0.0

        for model_name, weight in self.weights.items():
            if model_name in model_probs:
                ensemble_home += weight * model_probs[model_name]["home"]
                ensemble_draw += weight * model_probs[model_name]["draw"]
                ensemble_away += weight * model_probs[model_name]["away"]
                total_weight += weight

        if total_weight > 0:
            ensemble_home /= total_weight
            ensemble_draw /= total_weight
            ensemble_away /= total_weight

        # Normalize
        total = ensemble_home + ensemble_draw + ensemble_away
        if total > 0:
            ensemble_home /= total
            ensemble_draw /= total
            ensemble_away /= total

        # Calculate expected goals (weighted average of Elo and Poisson)
        exp_home = 0.5 * elo_pred.get("expected_home_goals", 1.3) + 0.5 * poisson_pred["expected_home_goals"]
        exp_away = 0.5 * elo_pred.get("expected_away_goals", 1.0) + 0.5 * poisson_pred["expected_away_goals"]

        # Calculate confidence based on model agreement
        confidence = self._calculate_confidence(model_probs)

        # Build model breakdown
        breakdown = ModelBreakdown(
            elo={"home_win": model_probs.get("elo", {}).get("home", 0.33),
                 "draw": model_probs.get("elo", {}).get("draw", 0.33),
                 "away_win": model_probs.get("elo", {}).get("away", 0.33)},
            poisson={"home_win": model_probs.get("poisson", {}).get("home", 0.33),
                     "draw": model_probs.get("poisson", {}).get("draw", 0.33),
                     "away_win": model_probs.get("poisson", {}).get("away", 0.33)},
            random_forest={"home_win": model_probs.get("random_forest", {}).get("home", 0.33),
                          "draw": model_probs.get("random_forest", {}).get("draw", 0.33),
                          "away_win": model_probs.get("random_forest", {}).get("away", 0.33)},
            xgboost={"home_win": model_probs.get("xgboost", {}).get("home", 0.33),
                    "draw": model_probs.get("xgboost", {}).get("draw", 0.33),
                    "away_win": model_probs.get("xgboost", {}).get("away", 0.33)},
            lightgbm={"home_win": model_probs.get("lightgbm", {}).get("home", 0.33),
                     "draw": model_probs.get("lightgbm", {}).get("draw", 0.33),
                     "away_win": model_probs.get("lightgbm", {}).get("away", 0.33)},
            ensemble={"home_win": round(ensemble_home, 4),
                     "draw": round(ensemble_draw, 4),
                     "away_win": round(ensemble_away, 4)},
        )

        # Generate key factors
        key_factors = self._generate_key_factors(home_team, away_team)

        return MatchPrediction(
            match_id=match_id,
            home_win_prob=round(ensemble_home, 4),
            draw_prob=round(ensemble_draw, 4),
            away_win_prob=round(ensemble_away, 4),
            predicted_home_goals=round(exp_home, 2),
            predicted_away_goals=round(exp_away, 2),
            confidence=round(confidence, 4),
            model_breakdown=breakdown,
            key_factors=key_factors,
        )

    def _calculate_confidence(self, model_probs: Dict) -> float:
        """Calculate confidence based on model agreement.

        Higher agreement among models = higher confidence.
        """
        if len(model_probs) < 2:
            return 0.5

        # Calculate variance of home win probabilities across models
        home_probs = [p["home"] for p in model_probs.values()]
        draw_probs = [p["draw"] for p in model_probs.values()]

        import numpy as np
        home_var = np.var(home_probs)
        draw_var = np.var(draw_probs)

        # Lower variance = higher confidence
        avg_var = (home_var + draw_var) / 2
        confidence = max(0.1, min(0.95, 1.0 - avg_var * 10))

        return confidence

    def _generate_key_factors(self, home_team: Dict, away_team: Dict) -> List[KeyFactor]:
        """Generate key factors influencing the match."""
        factors = []

        # Elo difference
        elo_diff = home_team.get("elo_rating", 1500) - away_team.get("elo_rating", 1500)
        if abs(elo_diff) > 50:
            favored = home_team.get("name", "Home") if elo_diff > 0 else away_team.get("name", "Away")
            factors.append(KeyFactor(
                factor="Elo Rating",
                impact=round(min(1.0, max(-1.0, elo_diff / 400)), 3),
                description=f"{favored} has a significant Elo rating advantage ({abs(elo_diff):.0f} points)"
            ))

        # FIFA ranking
        rank_diff = away_team.get("fifa_rank", 50) - home_team.get("fifa_rank", 50)
        if abs(rank_diff) > 5:
            favored = home_team.get("name", "Home") if rank_diff > 0 else away_team.get("name", "Away")
            factors.append(KeyFactor(
                factor="FIFA Ranking",
                impact=round(min(1.0, max(-1.0, rank_diff / 50)), 3),
                description=f"{favored} is ranked higher (#{min(home_team.get('fifa_rank', 50), away_team.get('fifa_rank', 50))} vs #{max(home_team.get('fifa_rank', 50), away_team.get('fifa_rank', 50))})"
            ))

        # Attack strength
        atk_diff = home_team.get("attack_strength", 1.0) - away_team.get("attack_strength", 1.0)
        if abs(atk_diff) > 0.2:
            stronger = home_team.get("name", "Home") if atk_diff > 0 else away_team.get("name", "Away")
            factors.append(KeyFactor(
                factor="Attack Strength",
                impact=round(min(1.0, max(-1.0, atk_diff)), 3),
                description=f"{stronger} has stronger attacking capabilities"
            ))

        # Defense strength
        def_diff = away_team.get("defense_strength", 1.0) - home_team.get("defense_strength", 1.0)
        if abs(def_diff) > 0.2:
            stronger = home_team.get("name", "Home") if def_diff > 0 else away_team.get("name", "Away")
            factors.append(KeyFactor(
                factor="Defense Strength",
                impact=round(min(1.0, max(-1.0, def_diff)), 3),
                description=f"{stronger} has a more solid defense"
            ))

        # Recent form
        form_a = home_team.get("form", [0.5] * 10)
        form_b = away_team.get("form", [0.5] * 10)
        avg_form_a = sum(form_a) / max(len(form_a), 1)
        avg_form_b = sum(form_b) / max(len(form_b), 1)
        form_diff = avg_form_a - avg_form_b
        if abs(form_diff) > 0.1:
            better = home_team.get("name", "Home") if form_diff > 0 else away_team.get("name", "Away")
            factors.append(KeyFactor(
                factor="Recent Form",
                impact=round(min(1.0, max(-1.0, form_diff * 2)), 3),
                description=f"{better} is in better recent form"
            ))

        # Market value
        mv_a = home_team.get("market_value_eur", 50e6)
        mv_b = away_team.get("market_value_eur", 50e6)
        if mv_a > 0 and mv_b > 0:
            ratio = mv_a / mv_b
            if ratio > 1.5 or ratio < 0.67:
                richer = home_team.get("name", "Home") if ratio > 1 else away_team.get("name", "Away")
                factors.append(KeyFactor(
                    factor="Squad Value",
                    impact=round(min(1.0, max(-1.0, (ratio - 1) / 3)), 3),
                    description=f"{richer} has a significantly more valuable squad"
                ))

        # Sort by absolute impact
        factors.sort(key=lambda f: abs(f.impact), reverse=True)
        return factors[:6]
