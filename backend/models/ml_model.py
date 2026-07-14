"""Machine learning model for match prediction using Random Forest, XGBoost, and LightGBM."""
import logging
import math
import warnings
import numpy as np
from typing import Dict, Any, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

# Suppress noisy sklearn joblib warnings
warnings.filterwarnings("ignore", message=".*sklearn.utils.parallel.*")
warnings.filterwarnings("ignore", message=".*feature names.*")

logger = logging.getLogger(__name__)

# Try importing optional ML libraries
try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    logger.warning("XGBoost not available, using RandomForest only")

try:
    from lightgbm import LGBMClassifier
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    logger.warning("LightGBM not available, using RandomForest only")


def generate_synthetic_data(n_samples: int = 2000, seed: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """Generate synthetic historical match data with realistic patterns.

    Features:
    - elo_diff: Elo rating difference (home - away), range [-500, 500]
    - fifa_rank_diff: FIFA ranking difference (away - home, so positive = home better), range [-60, 60]
    - form_diff: Form difference (home - away), range [-5, 5]
    - attack_diff: Attack strength difference, range [-1, 1]
    - defense_diff: Defense strength difference (lower is better), range [-1, 1]
    - goal_diff: Average goal difference, range [-2, 2]
    - historical_win_rate: Historical head-to-head win rate, range [0, 1]
    - tournament_experience: Tournament experience score difference, range [-5, 5]
    - market_value_ratio: Market value ratio (home/away), range [0.1, 10]
    - rest_days_diff: Rest days difference, range [-5, 5]

    Target: 0 = away win, 1 = draw, 2 = home win
    """
    rng = np.random.RandomState(seed)

    features = np.zeros((n_samples, 10))
    targets = np.zeros(n_samples, dtype=int)

    for i in range(n_samples):
        # Generate base ratings
        home_elo = rng.normal(1700, 150)
        away_elo = rng.normal(1700, 150)
        elo_diff = home_elo - away_elo

        home_rank = rng.randint(1, 80)
        away_rank = rng.randint(1, 80)
        rank_diff = away_rank - home_rank  # positive = home better ranked

        home_form = rng.uniform(0.2, 1.0)
        away_form = rng.uniform(0.2, 1.0)
        form_diff = home_form - away_form

        home_attack = rng.uniform(0.6, 2.0)
        away_attack = rng.uniform(0.6, 2.0)
        attack_diff = home_attack - away_attack

        home_defense = rng.uniform(0.6, 2.0)
        away_defense = rng.uniform(0.6, 2.0)
        defense_diff = away_defense - home_defense  # positive = home defends better

        home_goals = rng.uniform(0.5, 2.5)
        away_goals = rng.uniform(0.5, 2.5)
        goal_diff = home_goals - away_goals

        hist_win_rate = rng.uniform(0.2, 0.8)
        home_experience = rng.uniform(1, 10)
        away_experience = rng.uniform(1, 10)
        exp_diff = home_experience - away_experience

        home_value = rng.uniform(10e6, 1.2e9)
        away_value = rng.uniform(10e6, 1.2e9)
        value_ratio = home_value / max(away_value, 1e6)

        rest_diff = rng.uniform(-5, 5)

        features[i] = [
            elo_diff, rank_diff, form_diff, attack_diff, defense_diff,
            goal_diff, hist_win_rate, exp_diff, math.log(max(value_ratio, 0.1)),
            rest_diff
        ]

        # Determine outcome based on features with realistic probabilities
        # Home advantage adds ~10% to home win probability
        home_strength = (
            0.30 * (elo_diff / 400.0) +
            0.15 * (rank_diff / 60.0) +
            0.15 * (form_diff / 2.0) +
            0.15 * (attack_diff / 1.5) +
            0.10 * (defense_diff / 1.5) +
            0.05 * (goal_diff / 2.0) +
            0.05 * (hist_win_rate - 0.5) +
            0.05 * (exp_diff / 5.0)
        )

        # Add home advantage
        home_strength += 0.15
        # Add noise
        home_strength += rng.normal(0, 0.25)

        # Convert to probabilities
        # Draw probability is higher when teams are evenly matched
        draw_base = 0.25 * math.exp(-abs(elo_diff) / 500.0)
        draw_noise = rng.normal(0, 0.03)
        draw_prob = max(0.08, min(0.40, draw_base + draw_noise))

        # Home/away split
        remaining = 1.0 - draw_prob
        # Sigmoid-like conversion
        home_win_raw = 1.0 / (1.0 + math.exp(-3.0 * home_strength))
        home_win_prob = remaining * home_win_raw
        away_win_prob = remaining - home_win_prob

        # Ensure valid probabilities
        home_win_prob = max(0.02, min(0.95, home_win_prob))
        away_win_prob = max(0.02, min(0.95, away_win_prob))

        total = home_win_prob + draw_prob + away_win_prob
        home_win_prob /= total
        draw_prob /= total
        away_win_prob /= total

        # Sample outcome
        r = rng.random()
        if r < home_win_prob:
            targets[i] = 2  # home win
        elif r < home_win_prob + draw_prob:
            targets[i] = 1  # draw
        else:
            targets[i] = 0  # away win

    return features, targets


class MLModel:
    """Machine learning ensemble for match prediction."""

    def __init__(self):
        self.rf_model: Optional[RandomForestClassifier] = None
        self.xgb_model: Optional[Any] = None
        self.lgbm_model: Optional[Any] = None
        self.is_trained = False
        self.cv_scores: Dict[str, float] = {}

    def train(self) -> Dict[str, float]:
        """Train all ML models on synthetic data.

        Returns:
            Dict with cross-validation scores for each model
        """
        logger.info("Generating synthetic training data...")
        X, y = generate_synthetic_data(n_samples=3000)

        logger.info(f"Training data shape: {X.shape}, class distribution: {np.bincount(y)}")

        # Train Random Forest
        logger.info("Training Random Forest...")
        self.rf_model = RandomForestClassifier(
            n_estimators=200, max_depth=10, min_samples_leaf=5,
            random_state=42, n_jobs=-1
        )
        self.rf_model.fit(X, y)
        rf_scores = cross_val_score(self.rf_model, X, y, cv=5, scoring="accuracy")
        self.cv_scores["random_forest"] = float(np.mean(rf_scores))
        logger.info(f"Random Forest CV accuracy: {self.cv_scores['random_forest']:.4f}")

        # Train XGBoost
        if HAS_XGB:
            logger.info("Training XGBoost...")
            self.xgb_model = XGBClassifier(
                n_estimators=200, max_depth=6, learning_rate=0.1,
                random_state=42, n_jobs=-1, eval_metric="mlogloss"
            )
            self.xgb_model.fit(X, y)
            xgb_scores = cross_val_score(self.xgb_model, X, y, cv=5, scoring="accuracy")
            self.cv_scores["xgboost"] = float(np.mean(xgb_scores))
            logger.info(f"XGBoost CV accuracy: {self.cv_scores['xgboost']:.4f}")

        # Train LightGBM
        if HAS_LGBM:
            logger.info("Training LightGBM...")
            self.lgbm_model = LGBMClassifier(
                n_estimators=200, max_depth=8, learning_rate=0.1,
                random_state=42, n_jobs=-1, verbose=-1
            )
            self.lgbm_model.fit(X, y)
            lgbm_scores = cross_val_score(self.lgbm_model, X, y, cv=5, scoring="accuracy")
            self.cv_scores["lightgbm"] = float(np.mean(lgbm_scores))
            logger.info(f"LightGBM CV accuracy: {self.cv_scores['lightgbm']:.4f}")

        self.is_trained = True
        return self.cv_scores

    def _extract_features(self, team_a: Dict[str, Any], team_b: Dict[str, Any]) -> np.ndarray:
        """Extract feature vector from two teams."""
        elo_diff = team_a.get("elo_rating", 1500) - team_b.get("elo_rating", 1500)
        rank_diff = team_b.get("fifa_rank", 50) - team_a.get("fifa_rank", 50)

        form_a = team_a.get("form", [0.5] * 10)
        form_b = team_b.get("form", [0.5] * 10)
        form_diff = sum(form_a) / max(len(form_a), 1) - sum(form_b) / max(len(form_b), 1)

        attack_diff = team_a.get("attack_strength", 1.0) - team_b.get("attack_strength", 1.0)
        defense_diff = team_b.get("defense_strength", 1.0) - team_a.get("defense_strength", 1.0)
        goal_diff = team_a.get("avg_goals_scored", 1.0) - team_b.get("avg_goals_scored", 1.0)

        # Historical win rate (simulated as 0.5 for no prior data)
        hist_win_rate = 0.5

        # Tournament experience (based on FIFA rank as proxy)
        exp_diff = (80 - team_a.get("fifa_rank", 40)) / 10.0 - (80 - team_b.get("fifa_rank", 40)) / 10.0

        # Market value ratio
        mv_a = team_a.get("market_value_eur", 50e6)
        mv_b = team_b.get("market_value_eur", 50e6)
        value_ratio = math.log(max(mv_a / max(mv_b, 1e6), 0.1))

        # Rest days (default 0 difference)
        rest_diff = 0.0

        return np.array([[
            elo_diff, rank_diff, form_diff, attack_diff, defense_diff,
            goal_diff, hist_win_rate, exp_diff, value_ratio, rest_diff
        ]])

    def predict(self, team_a: Dict[str, Any], team_b: Dict[str, Any]) -> Dict[str, Dict[str, float]]:
        """Predict match outcome using all trained ML models.

        Returns:
            Dict with predictions from each model: random_forest, xgboost, lightgbm
        """
        if not self.is_trained:
            logger.warning("Models not trained, training now...")
            self.train()

        X = self._extract_features(team_a, team_b)
        results = {}

        # Random Forest
        if self.rf_model is not None:
            rf_proba = self.rf_model.predict_proba(X)[0]
            results["random_forest"] = {
                "home_win_prob": round(float(rf_proba[2]), 4) if len(rf_proba) > 2 else 0.33,
                "draw_prob": round(float(rf_proba[1]), 4) if len(rf_proba) > 1 else 0.33,
                "away_win_prob": round(float(rf_proba[0]), 4),
            }

        # XGBoost
        if self.xgb_model is not None:
            xgb_proba = self.xgb_model.predict_proba(X)[0]
            results["xgboost"] = {
                "home_win_prob": round(float(xgb_proba[2]), 4) if len(xgb_proba) > 2 else 0.33,
                "draw_prob": round(float(xgb_proba[1]), 4) if len(xgb_proba) > 1 else 0.33,
                "away_win_prob": round(float(xgb_proba[0]), 4),
            }

        # LightGBM
        if self.lgbm_model is not None:
            lgbm_proba = self.lgbm_model.predict_proba(X)[0]
            results["lightgbm"] = {
                "home_win_prob": round(float(lgbm_proba[2]), 4) if len(lgbm_proba) > 2 else 0.33,
                "draw_prob": round(float(lgbm_proba[1]), 4) if len(lgbm_proba) > 1 else 0.33,
                "away_win_prob": round(float(lgbm_proba[0]), 4),
            }

        return results

    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from Random Forest model."""
        if self.rf_model is None:
            return {}

        feature_names = [
            "elo_diff", "fifa_rank_diff", "form_diff", "attack_diff",
            "defense_diff", "goal_diff", "historical_win_rate",
            "tournament_experience", "market_value_ratio", "rest_days"
        ]
        importances = self.rf_model.feature_importances_
        return {name: round(float(imp), 4) for name, imp in zip(feature_names, importances)}
