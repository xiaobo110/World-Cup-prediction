"""Data fetching service - loads teams and matches from mock data or API."""
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from models.schemas import Team, Match, Player
from services.cache import CacheService
from config import settings

logger = logging.getLogger(__name__)


class DataFetcher:
    """Fetches team and match data from mock files or live API."""

    def __init__(self, cache: CacheService):
        self.cache = cache
        self._teams: List[Team] = []
        self._matches: List[Match] = []
        self._teams_dict: Dict[str, Team] = {}

    def fetch_teams(self) -> List[Team]:
        """Fetch all teams. Uses cache if available."""
        cached = self.cache.get("teams")
        if cached is not None:
            self._teams = [Team(**t) for t in cached]
            self._teams_dict = {t.id: t for t in self._teams}
            return self._teams

        if settings.MOCK_MODE:
            teams = self._load_mock_teams()
        else:
            teams = self._fetch_api_teams()
            if not teams:
                logger.warning("API fetch failed, falling back to mock data")
                teams = self._load_mock_teams()

        self._teams = teams
        self._teams_dict = {t.id: t for t in teams}
        self.cache.set("teams", [t.model_dump() for t in teams], ttl=settings.CACHE_TTL)
        logger.info(f"Loaded {len(teams)} teams")
        return teams

    def fetch_matches(self) -> List[Match]:
        """Fetch all matches. Uses cache if available."""
        cached = self.cache.get("matches")
        if cached is not None:
            self._matches = [Match(**m) for m in cached]
            return self._matches

        if settings.MOCK_MODE:
            matches = self._load_mock_matches()
        else:
            matches = self._fetch_api_matches()
            if not matches:
                logger.warning("API fetch failed, falling back to mock data")
                matches = self._load_mock_matches()

        # Enrich matches with team data
        teams_dict = {t.id: t for t in self._teams} if self._teams else {}
        for m in matches:
            if m.home_team_id in teams_dict:
                m.home_team = teams_dict[m.home_team_id]
            if m.away_team_id in teams_dict:
                m.away_team = teams_dict[m.away_team_id]

        self._matches = matches
        self.cache.set("matches", [m.model_dump() for m in matches], ttl=settings.CACHE_TTL)
        logger.info(f"Loaded {len(matches)} matches")
        return matches

    def get_team(self, team_id: str) -> Optional[Team]:
        """Get a specific team by ID."""
        if not self._teams_dict:
            self.fetch_teams()
        return self._teams_dict.get(team_id)

    def get_match(self, match_id: str) -> Optional[Match]:
        """Get a specific match by ID."""
        if not self._matches:
            self.fetch_matches()
        for m in self._matches:
            if m.id == match_id:
                return m
        return None

    def get_teams_by_group(self, group: str) -> List[Team]:
        """Get all teams in a specific group."""
        if not self._teams:
            self.fetch_teams()
        return [t for t in self._teams if t.group == group]

    def get_matches_by_stage(self, stage: str) -> List[Match]:
        """Get all matches in a specific stage."""
        if not self._matches:
            self.fetch_matches()
        return [m for m in self._matches if m.stage == stage]

    def get_group_matches(self, group: str) -> List[Match]:
        """Get all group stage matches for a specific group."""
        if not self._matches:
            self.fetch_matches()
        return [m for m in self._matches if m.stage == "group" and m.group == group]

    def _load_mock_teams(self) -> List[Team]:
        """Load teams from mock JSON file."""
        teams_path = settings.MOCK_DIR / "teams.json"
        try:
            with open(teams_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [Team(**t) for t in data]
        except Exception as e:
            logger.error(f"Failed to load mock teams: {e}")
            return []

    def _load_mock_matches(self) -> List[Match]:
        """Load matches from mock JSON file."""
        matches_path = settings.MOCK_DIR / "matches.json"
        try:
            with open(matches_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [Match(**m) for m in data]
        except Exception as e:
            logger.error(f"Failed to load mock matches: {e}")
            return []

    def _fetch_api_teams(self) -> List[Team]:
        """Fetch teams from football-data.org API (placeholder for live mode)."""
        # In live mode, this would call the API
        # For now, return empty to trigger fallback to mock
        logger.info("Live API mode not implemented, using mock data")
        return []

    def _fetch_api_matches(self) -> List[Match]:
        """Fetch matches from football-data.org API (placeholder for live mode)."""
        logger.info("Live API mode not implemented, using mock data")
        return []
