"""Configuration for the World Cup Predictor backend."""
import os
from pathlib import Path
from typing import List


class Settings:
    """Application settings."""

    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = BASE_DIR / "data"
    MOCK_DIR: Path = DATA_DIR / "mock"
    CACHE_DIR: Path = DATA_DIR / "cache"

    MOCK_MODE: bool = True
    API_FOOTBALL_DATA_KEY: str = os.getenv("API_FOOTBALL_DATA_KEY", "")

    MONTE_CARLO_SIMULATIONS: int = 10000
    CACHE_TTL: int = 3600

    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Model weights for ensemble
    ELO_WEIGHT: float = 0.15
    POISSON_WEIGHT: float = 0.25
    RF_WEIGHT: float = 0.20
    XGB_WEIGHT: float = 0.20
    LGBM_WEIGHT: float = 0.20

    # Elo model parameters
    ELO_K_FACTOR: float = 40.0
    ELO_HOME_ADVANTAGE: float = 100.0

    # Poisson model parameters
    AVG_HOME_GOALS: float = 1.38
    AVG_AWAY_GOALS: float = 1.08
    OVERALL_AVG_GOALS: float = 1.23
    OVERALL_AVG_GOALS_CONCED: float = 1.23

    def __init__(self):
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
