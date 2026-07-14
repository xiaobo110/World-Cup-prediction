"""Prediction agent - uses ensemble model to predict match outcomes."""
import logging
from typing import Dict, List, Any, Optional

from services.data_fetcher import DataFetcher
from models.ensemble import EnsembleModel
from models.schemas import MatchPrediction

logger = logging.getLogger(__name__)


class PredictorAgent:
    """Agent for generating match predictions using the ensemble model."""

    def __init__(self, data_fetcher: DataFetcher, ensemble: EnsembleModel):
        self.fetcher = data_fetcher
        self.ensemble = ensemble
        self._predictions_cache: Dict[str, MatchPrediction] = {}

    def predict_match(self, match_id: str) -> Optional[MatchPrediction]:
        """Predict outcome for a specific match."""
        # Check cache
        if match_id in self._predictions_cache:
            return self._predictions_cache[match_id]

        match = self.fetcher.get_match(match_id)
        if not match:
            logger.warning(f"Match {match_id} not found")
            return None

        home_team = match.home_team
        away_team = match.away_team

        if not home_team or not away_team:
            # Try to fetch team data
            ht = self.fetcher.get_team(match.home_team_id)
            at = self.fetcher.get_team(match.away_team_id)
            if ht and at:
                home_team = ht
                away_team = at
            else:
                logger.warning(f"Team data not available for match {match_id}")
                return None

        prediction = self.ensemble.predict(
            home_team.model_dump(),
            away_team.model_dump(),
            match_id=match_id
        )

        self._predictions_cache[match_id] = prediction
        return prediction

    def predict_all_group_matches(self) -> Dict[str, MatchPrediction]:
        """Predict all group stage matches."""
        matches = self.fetcher.get_matches_by_stage("group")
        predictions = {}

        for match in matches:
            pred = self.predict_match(match.id)
            if pred:
                predictions[match.id] = pred

        logger.info(f"Generated {len(predictions)} group stage predictions")
        return predictions

    def predict_all_knockout_matches(self) -> Dict[str, MatchPrediction]:
        """Predict all knockout stage matches."""
        knockout_stages = ["r32", "r16", "qf", "sf", "third_place", "final"]
        predictions = {}

        for stage in knockout_stages:
            matches = self.fetcher.get_matches_by_stage(stage)
            for match in matches:
                pred = self.predict_match(match.id)
                if pred:
                    predictions[match.id] = pred

        logger.info(f"Generated {len(predictions)} knockout predictions")
        return predictions

    def predict_all_matches(self) -> Dict[str, MatchPrediction]:
        """Predict all matches in the tournament."""
        group_preds = self.predict_all_group_matches()
        knockout_preds = self.predict_all_knockout_matches()
        all_preds = {**group_preds, **knockout_preds}
        logger.info(f"Total predictions: {len(all_preds)}")
        return all_preds

    def get_match_prediction(self, match_id: str) -> Optional[Dict[str, Any]]:
        """Get formatted prediction for a match."""
        pred = self.predict_match(match_id)
        if not pred:
            return None

        match = self.fetcher.get_match(match_id)
        return {
            "match_id": match_id,
            "home_team": match.home_team.name if match.home_team else match.home_team_id,
            "away_team": match.away_team.name if match.away_team else match.away_team_id,
            "datetime": match.datetime,
            "venue": match.venue,
            "stage": match.stage,
            "prediction": pred.model_dump(),
        }

    def clear_cache(self):
        """Clear prediction cache."""
        self._predictions_cache.clear()
