"""Pydantic models for all API responses - the exact API contracts."""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class Player(BaseModel):
    name: str
    position: str
    number: int
    club: str
    market_value_eur: float


class Team(BaseModel):
    id: str
    name: str
    name_zh: str
    code: str
    fifa_rank: int
    elo_rating: float
    flag_emoji: str
    group: str
    attack_strength: float
    defense_strength: float
    avg_goals_scored: float
    avg_goals_conceded: float
    form: List[float]
    market_value_eur: float
    squad: List[Player]


class GroupStanding(BaseModel):
    team: Team
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    points: int
    qualification_prob: float


class Group(BaseModel):
    name: str
    teams: List[Team]
    standings: List[GroupStanding]


class Match(BaseModel):
    id: str
    home_team_id: str
    away_team_id: str
    home_team: Optional[Team] = None
    away_team: Optional[Team] = None
    datetime: str
    stage: str
    group: Optional[str] = None
    venue: str


class ModelBreakdown(BaseModel):
    elo: Dict[str, float]
    poisson: Dict[str, float]
    random_forest: Dict[str, float]
    xgboost: Dict[str, float]
    lightgbm: Dict[str, float]
    ensemble: Dict[str, float]


class KeyFactor(BaseModel):
    factor: str
    impact: float = Field(ge=-1.0, le=1.0)
    description: str


class MatchPrediction(BaseModel):
    match_id: str
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    predicted_home_goals: float
    predicted_away_goals: float
    confidence: float
    model_breakdown: ModelBreakdown
    key_factors: List[KeyFactor]


class ChampionPrediction(BaseModel):
    team: Team
    probability: float
    path: List[Dict]


class ChampionPredictionResponse(BaseModel):
    predictions: List[ChampionPrediction]
    top_scorers: List[Dict]
    dark_horses: List[Dict]
    model_confidence: float


class SimulationResult(BaseModel):
    champion_prob: Dict[str, float]
    qualification_prob: Dict[str, Dict[str, float]]
    avg_goals: Dict[str, float]
    total_simulations: int


class ExplanationResponse(BaseModel):
    match_id: str
    prediction_summary: str
    key_factors: List[KeyFactor]
    shap_values: Dict[str, float]
    reasoning_chain: List[str]
    natural_language: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    data_context: Optional[Dict] = None


class SimulationRequest(BaseModel):
    num_simulations: int = 10000
