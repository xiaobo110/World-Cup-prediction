"""Data analysis agent - provides comprehensive team and group analysis."""
import logging
from typing import Dict, List, Any, Optional

from services.data_fetcher import DataFetcher
from models.schemas import Team, GroupStanding

logger = logging.getLogger(__name__)


class DataAnalyzerAgent:
    """Agent for analyzing teams, groups, and match data."""

    def __init__(self, data_fetcher: DataFetcher):
        self.fetcher = data_fetcher

    def analyze_team(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Generate comprehensive analysis for a team."""
        team = self.fetcher.get_team(team_id)
        if not team:
            return None

        form_avg = sum(team.form) / len(team.form) if team.form else 0.5
        form_trend = self._calculate_form_trend(team.form)

        # Offensive rating (0-100)
        offensive_rating = min(100, max(0, team.attack_strength * 50))

        # Defensive rating (0-100, lower defense_strength = better)
        defensive_rating = min(100, max(0, (2.0 - team.defense_strength) * 50))

        # Midfield control (proxy: combination of form and attack)
        midfield_control = min(100, max(0, (form_avg * 40 + team.attack_strength * 30)))

        # Tournament experience (proxy: FIFA ranking + Elo)
        experience_score = min(100, max(0,
            (80 - team.fifa_rank) / 80 * 50 + team.elo_rating / 2100 * 50
        ))

        # Overall power rating
        overall_power = (
            offensive_rating * 0.30 +
            defensive_rating * 0.25 +
            midfield_control * 0.20 +
            experience_score * 0.15 +
            min(100, team.market_value_eur / 10e6) * 0.10
        )

        return {
            "team_id": team_id,
            "team": team.model_dump(),
            "analysis": {
                "offensive_rating": round(offensive_rating, 1),
                "defensive_rating": round(defensive_rating, 1),
                "midfield_control": round(midfield_control, 1),
                "form_trend": form_trend,
                "form_avg": round(form_avg, 3),
                "tournament_experience": round(experience_score, 1),
                "overall_power": round(overall_power, 1),
                "strengths": self._identify_strengths(team),
                "weaknesses": self._identify_weaknesses(team),
                "key_player": team.squad[0].name if team.squad else "Unknown",
                "squad_value": sum(p.market_value_eur for p in team.squad),
            }
        }

    def compare_teams(self, team_a_id: str, team_b_id: str) -> Optional[Dict[str, Any]]:
        """Compare two teams head-to-head."""
        team_a = self.fetcher.get_team(team_a_id)
        team_b = self.fetcher.get_team(team_b_id)
        if not team_a or not team_b:
            return None

        elo_diff = team_a.elo_rating - team_b.elo_rating
        rank_diff = team_b.fifa_rank - team_a.fifa_rank
        atk_diff = team_a.attack_strength - team_b.attack_strength
        def_diff = team_b.defense_strength - team_a.defense_strength
        form_a = sum(team_a.form) / len(team_a.form) if team_a.form else 0.5
        form_b = sum(team_b.form) / len(team_b.form) if team_b.form else 0.5
        form_diff = form_a - form_b
        value_ratio = team_a.market_value_eur / max(team_b.market_value_eur, 1)

        # Determine favorite
        score = 0
        score += 1 if elo_diff > 50 else (-1 if elo_diff < -50 else 0)
        score += 1 if rank_diff > 5 else (-1 if rank_diff < -5 else 0)
        score += 1 if atk_diff > 0.2 else (-1 if atk_diff < -0.2 else 0)
        score += 1 if def_diff > 0.2 else (-1 if def_diff < -0.2 else 0)
        score += 1 if form_diff > 0.1 else (-1 if form_diff < -0.1 else 0)

        if score > 1:
            favorite = team_a.name
        elif score < -1:
            favorite = team_b.name
        else:
            favorite = "Evenly matched"

        return {
            "team_a": team_a.model_dump(),
            "team_b": team_b.model_dump(),
            "comparison": {
                "elo_diff": round(elo_diff, 1),
                "rank_diff": rank_diff,
                "attack_diff": round(atk_diff, 3),
                "defense_diff": round(def_diff, 3),
                "form_diff": round(form_diff, 3),
                "value_ratio": round(value_ratio, 2),
                "favorite": favorite,
                "advantage_score": score,
            }
        }

    def analyze_group(self, group_name: str) -> Optional[Dict[str, Any]]:
        """Analyze group dynamics and difficulty."""
        teams = self.fetcher.get_teams_by_group(group_name)
        if not teams:
            return None

        # Calculate group difficulty metrics
        elo_ratings = [t.elo_rating for t in teams]
        avg_elo = sum(elo_ratings) / len(elo_ratings)
        elo_spread = max(elo_ratings) - min(elo_ratings)

        # Group of death score: high average Elo + low spread = tough group
        death_score = min(100, avg_elo / 2100 * 60 + (1 - elo_spread / 600) * 40)

        # Predicted standings (simple Elo-based)
        teams_sorted = sorted(teams, key=lambda t: t.elo_rating, reverse=True)
        predicted_order = [
            {"position": i + 1, "team_id": t.id, "team_name": t.name,
             "elo_rating": t.elo_rating, "fifa_rank": t.fifa_rank}
            for i, t in enumerate(teams_sorted)
        ]

        return {
            "group": group_name,
            "teams": [t.model_dump() for t in teams],
            "analysis": {
                "avg_elo": round(avg_elo, 1),
                "elo_spread": round(elo_spread, 1),
                "group_of_death_score": round(death_score, 1),
                "predicted_standings": predicted_order,
                "strongest_team": teams_sorted[0].name,
                "weakest_team": teams_sorted[-1].name,
                "qualification_contenders": [t.name for t in teams_sorted[:2]],
            }
        }

    def _calculate_form_trend(self, form: List[float]) -> str:
        """Calculate form trend from recent results."""
        if len(form) < 4:
            return "stable"
        recent = form[:5]
        older = form[5:10] if len(form) > 5 else form[-5:]
        recent_avg = sum(recent) / len(recent)
        older_avg = sum(older) / len(older)
        diff = recent_avg - older_avg
        if diff > 0.15:
            return "improving"
        elif diff < -0.15:
            return "declining"
        return "stable"

    def _identify_strengths(self, team: Team) -> List[str]:
        strengths = []
        if team.attack_strength > 1.5:
            strengths.append("Strong attack")
        if team.defense_strength < 1.0:
            strengths.append("Solid defense")
        if team.elo_rating > 1900:
            strengths.append("World-class team")
        if sum(team.form[-3:]) / 3 > 0.7:
            strengths.append("Excellent recent form")
        if team.market_value_eur > 500e6:
            strengths.append("Deep squad with high-value players")
        if not strengths:
            strengths.append("Competitive squad")
        return strengths

    def _identify_weaknesses(self, team: Team) -> List[str]:
        weaknesses = []
        if team.attack_strength < 0.8:
            weaknesses.append("Limited attacking threat")
        if team.defense_strength > 1.4:
            weaknesses.append("Vulnerable defense")
        if team.elo_rating < 1550:
            weaknesses.append("Lower international standing")
        if sum(team.form[-3:]) / 3 < 0.3:
            weaknesses.append("Poor recent form")
        if not weaknesses:
            weaknesses.append("No major weaknesses identified")
        return weaknesses
