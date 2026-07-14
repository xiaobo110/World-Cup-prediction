"""Data collection agent - initializes and manages data from mock/API sources."""
import logging
from typing import Dict, List, Any, Optional

from services.data_fetcher import DataFetcher
from services.cache import CacheService
from models.schemas import Team, Match
from config import settings

logger = logging.getLogger(__name__)


class DataCollectorAgent:
    """Agent responsible for data collection, validation, and caching."""

    def __init__(self, data_fetcher: DataFetcher, cache: CacheService):
        self.fetcher = data_fetcher
        self.cache = cache
        self._initialized = False

    def initialize(self) -> Dict[str, int]:
        """Initialize all data sources and calculate derived stats.

        Returns:
            Dict with counts of loaded data
        """
        logger.info("Initializing data collection agent...")

        # Fetch teams and matches
        teams = self.fetcher.fetch_teams()
        matches = self.fetcher.fetch_matches()

        # Calculate derived stats
        self._calculate_derived_stats(teams)

        # Cache the enriched data
        self.cache.set("initialized", True, ttl=86400)
        self._initialized = True

        result = {
            "teams": len(teams),
            "matches": len(matches),
            "groups": len(set(t.group for t in teams)),
        }
        logger.info(f"Data collection initialized: {result}")
        return result

    def _calculate_derived_stats(self, teams: List[Team]) -> None:
        """Calculate attack/defense strengths and other derived statistics."""
        if not teams:
            return

        # Calculate overall averages
        all_avg_scored = [t.avg_goals_scored for t in teams]
        all_avg_conceded = [t.avg_goals_conceded for t in teams]
        overall_avg_scored = sum(all_avg_scored) / len(all_avg_scored) if all_avg_scored else 1.23
        overall_avg_conceded = sum(all_avg_conceded) / len(all_avg_conceded) if all_avg_conceded else 1.23

        # Update attack and defense strengths
        for team in teams:
            if overall_avg_scored > 0:
                team.attack_strength = round(team.avg_goals_scored / overall_avg_scored, 3)
            if overall_avg_conceded > 0:
                team.defense_strength = round(team.avg_goals_conceded / overall_avg_conceded, 3)

        # Cache updated teams
        self.cache.set("teams", [t.model_dump() for t in teams], ttl=settings.CACHE_TTL)

    def get_team_stats(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive stats for a team."""
        team = self.fetcher.get_team(team_id)
        if not team:
            return None

        return {
            "id": team.id,
            "name": team.name,
            "name_zh": team.name_zh,
            "fifa_rank": team.fifa_rank,
            "elo_rating": team.elo_rating,
            "group": team.group,
            "attack_strength": team.attack_strength,
            "defense_strength": team.defense_strength,
            "avg_goals_scored": team.avg_goals_scored,
            "avg_goals_conceded": team.avg_goals_conceded,
            "form": team.form,
            "form_avg": round(sum(team.form) / len(team.form), 3) if team.form else 0.5,
            "market_value_eur": team.market_value_eur,
            "squad_size": len(team.squad),
            "top_player": team.squad[0].name if team.squad else "Unknown",
            "top_player_value": team.squad[0].market_value_eur if team.squad else 0,
        }

    def refresh_data(self) -> Dict[str, int]:
        """Force refresh all data from sources."""
        self.cache.clear()
        return self.initialize()

    @property
    def is_initialized(self) -> bool:
        return self._initialized
