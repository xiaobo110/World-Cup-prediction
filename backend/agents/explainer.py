"""Explanation agent - generates human-readable explanations for predictions."""
import logging
from typing import Dict, List, Any, Optional

from services.data_fetcher import DataFetcher
from agents.predictor import PredictorAgent
from agents.data_analyzer import DataAnalyzerAgent
from agents.tournament_simulator import TournamentSimulatorAgent
from models.schemas import ExplanationResponse, KeyFactor

logger = logging.getLogger(__name__)


class ExplainerAgent:
    """Agent for generating explanations of predictions and analysis."""

    def __init__(self, data_fetcher: DataFetcher, predictor: PredictorAgent,
                 analyzer: DataAnalyzerAgent, simulator: TournamentSimulatorAgent):
        self.fetcher = data_fetcher
        self.predictor = predictor
        self.analyzer = analyzer
        self.simulator = simulator

    def explain_match(self, match_id: str) -> Optional[ExplanationResponse]:
        """Generate detailed explanation for a match prediction."""
        pred = self.predictor.predict_match(match_id)
        if not pred:
            return None

        match = self.fetcher.get_match(match_id)
        if not match:
            return None

        home_name = match.home_team.name if match.home_team else match.home_team_id
        away_name = match.away_team.name if match.away_team else match.away_team_id

        # Build prediction summary
        if pred.home_win_prob > pred.away_win_prob:
            summary = f"{home_name} is favored to win against {away_name} with {pred.home_win_prob:.1%} probability"
        elif pred.away_win_prob > pred.home_win_prob:
            summary = f"{away_name} is favored to win against {home_name} with {pred.away_win_prob:.1%} probability"
        else:
            summary = f"The match between {home_name} and {away_name} is expected to be closely contested"

        summary += f". Predicted score: {pred.predicted_home_goals:.1f} - {pred.predicted_away_goals:.1f}"
        summary += f". Model confidence: {pred.confidence:.1%}"

        # Build SHAP-like values (feature importance proxy)
        shap_values = self._generate_shap_values(match.home_team, match.away_team)

        # Build reasoning chain
        reasoning = self._build_reasoning_chain(match, pred)

        # Generate natural language explanation
        natural_language = self._generate_natural_language(match, pred, reasoning)

        return ExplanationResponse(
            match_id=match_id,
            prediction_summary=summary,
            key_factors=pred.key_factors,
            shap_values=shap_values,
            reasoning_chain=reasoning,
            natural_language=natural_language,
        )

    def explain_champion(self) -> Dict[str, Any]:
        """Explain why certain teams are favored to win the tournament."""
        champ_response = self.simulator.get_champion_probabilities(top_n=5)
        teams_dict = {t.id: t for t in self.fetcher.fetch_teams()}

        explanations = []
        for cp in champ_response.predictions:
            team_analysis = self.analyzer.analyze_team(cp.team.id)
            if not team_analysis:
                continue

            analysis = team_analysis["analysis"]
            explanation = {
                "team": cp.team.name,
                "team_id": cp.team.id,
                "champion_probability": cp.probability,
                "key_reasons": [],
                "analysis_summary": "",
            }

            # Generate reasons
            if cp.team.elo_rating > 1900:
                explanation["key_reasons"].append(
                    f"Elite Elo rating of {cp.team.elo_rating:.0f}, among the world's best"
                )
            if analysis["offensive_rating"] > 70:
                explanation["key_reasons"].append(
                    f"Powerful attack (rating: {analysis['offensive_rating']:.0f}/100)"
                )
            if analysis["defensive_rating"] > 70:
                explanation["key_reasons"].append(
                    f"Strong defense (rating: {analysis['defensive_rating']:.0f}/100)"
                )
            if analysis["form_trend"] == "improving":
                explanation["key_reasons"].append("Team is in improving form heading into the tournament")
            if cp.team.market_value_eur > 800e6:
                explanation["key_reasons"].append(
                    f"Deep squad valued at {cp.team.market_value_eur / 1e9:.1f}B EUR"
                )
            if analysis["tournament_experience"] > 70:
                explanation["key_reasons"].append("Extensive tournament experience")

            if not explanation["key_reasons"]:
                explanation["key_reasons"].append("Well-rounded team with balanced strengths")

            explanation["analysis_summary"] = (
                f"{cp.team.name} has a {cp.probability:.1%} chance of winning the 2026 World Cup. "
                f"Their overall power rating is {analysis['overall_power']:.0f}/100, "
                f"with {'strong' if analysis['offensive_rating'] > 60 else 'moderate'} attack "
                f"and {'solid' if analysis['defensive_rating'] > 60 else 'average'} defense."
            )

            explanations.append(explanation)

        return {
            "explanations": explanations,
            "model_confidence": champ_response.model_confidence,
            "total_simulations": 10000,
        }

    def _generate_shap_values(self, home_team, away_team) -> Dict[str, float]:
        """Generate SHAP-like feature importance values."""
        if not home_team or not away_team:
            return {}

        values = {}
        elo_diff = (home_team.elo_rating - away_team.elo_rating) / 400
        values["elo_rating_diff"] = round(elo_diff, 3)

        rank_diff = (away_team.fifa_rank - home_team.fifa_rank) / 60
        values["fifa_rank_diff"] = round(rank_diff, 3)

        atk_diff = home_team.attack_strength - away_team.attack_strength
        values["attack_strength_diff"] = round(atk_diff, 3)

        def_diff = away_team.defense_strength - home_team.defense_strength
        values["defense_strength_diff"] = round(def_diff, 3)

        form_a = sum(home_team.form) / len(home_team.form) if home_team.form else 0.5
        form_b = sum(away_team.form) / len(away_team.form) if away_team.form else 0.5
        values["form_diff"] = round(form_a - form_b, 3)

        import math
        mv_ratio = math.log(max(home_team.market_value_eur / max(away_team.market_value_eur, 1), 0.1))
        values["market_value_ratio"] = round(mv_ratio / 5, 3)

        return values

    def _build_reasoning_chain(self, match, pred) -> List[str]:
        """Build step-by-step reasoning chain."""
        home_name = match.home_team.name if match.home_team else match.home_team_id
        away_name = match.away_team.name if match.away_team else match.away_team_id

        chain = []

        # Step 1: Compare Elo ratings
        if match.home_team and match.away_team:
            elo_diff = match.home_team.elo_rating - match.away_team.elo_rating
            if elo_diff > 100:
                chain.append(f"{home_name} has a significantly higher Elo rating ({match.home_team.elo_rating:.0f} vs {match.away_team.elo_rating:.0f})")
            elif elo_diff > 0:
                chain.append(f"{home_name} has a slight Elo rating advantage ({match.home_team.elo_rating:.0f} vs {match.away_team.elo_rating:.0f})")
            elif elo_diff < -100:
                chain.append(f"{away_name} has a significantly higher Elo rating ({match.away_team.elo_rating:.0f} vs {match.home_team.elo_rating:.0f})")
            else:
                chain.append(f"The two teams have similar Elo ratings ({match.home_team.elo_rating:.0f} vs {match.away_team.elo_rating:.0f})")

        # Step 2: Form analysis
        if match.home_team and match.away_team:
            form_h = sum(match.home_team.form[-5:]) / 5 if match.home_team.form else 0.5
            form_a = sum(match.away_team.form[-5:]) / 5 if match.away_team.form else 0.5
            if form_h > form_a + 0.15:
                chain.append(f"{home_name} is in better recent form ({form_h:.2f} vs {form_a:.2f})")
            elif form_a > form_h + 0.15:
                chain.append(f"{away_name} is in better recent form ({form_a:.2f} vs {form_h:.2f})")
            else:
                chain.append("Both teams have similar recent form")

        # Step 3: Attack vs Defense
        if match.home_team and match.away_team:
            if match.home_team.attack_strength > match.away_team.defense_strength:
                chain.append(f"{home_name}'s attack should exploit {away_name}'s defense")
            elif match.away_team.attack_strength > match.home_team.defense_strength:
                chain.append(f"{away_name}'s attack should exploit {home_name}'s defense")
            else:
                chain.append("Attack and defense capabilities are relatively balanced")

        # Step 4: Model consensus
        if pred.confidence > 0.7:
            chain.append("All prediction models agree on the likely outcome (high confidence)")
        elif pred.confidence > 0.5:
            chain.append("Prediction models show moderate agreement")
        else:
            chain.append("Prediction models are divided, indicating an uncertain outcome")

        # Step 5: Final verdict
        if pred.home_win_prob > 0.5:
            chain.append(f"Overall assessment: {home_name} is the likely winner")
        elif pred.away_win_prob > 0.5:
            chain.append(f"Overall assessment: {away_name} is the likely winner")
        else:
            chain.append("Overall assessment: This match could go either way, with a draw being possible")

        return chain

    def _generate_natural_language(self, match, pred, reasoning: List[str]) -> str:
        """Generate natural language explanation."""
        home_name = match.home_team.name if match.home_team else match.home_team_id
        away_name = match.away_team.name if match.away_team else match.away_team_id

        text = f"Match Prediction: {home_name} vs {away_name}\n\n"
        text += f"The model predicts a score of {pred.predicted_home_goals:.1f} - {pred.predicted_away_goals:.1f} "
        text += f"in favor of {'the home team' if pred.home_win_prob > pred.away_win_prob else 'the away team' if pred.away_win_prob > pred.home_win_prob else 'neither side'}.\n\n"

        text += f"Win probabilities: {home_name} {pred.home_win_prob:.1%}, "
        text += f"Draw {pred.draw_prob:.1%}, {away_name} {pred.away_win_prob:.1%}\n\n"

        text += "Key reasoning:\n"
        for i, step in enumerate(reasoning, 1):
            text += f"  {i}. {step}\n"

        if pred.key_factors:
            text += "\nKey factors:\n"
            for factor in pred.key_factors[:3]:
                direction = "favors home" if factor.impact > 0 else "favors away" if factor.impact < 0 else "neutral"
                text += f"  - {factor.factor}: {factor.description} ({direction})\n"

        return text
