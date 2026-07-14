"""FastAPI application for the 2026 FIFA World Cup Champion Prediction Agent."""
import logging
import sys
import asyncio
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from services.cache import CacheService
from services.data_fetcher import DataFetcher
from models.ensemble import EnsembleModel
from models.schemas import (
    Team, Match, Group, GroupStanding, MatchPrediction,
    ChampionPredictionResponse, SimulationResult, SimulationRequest,
    ExplanationResponse, ChatRequest, ChatResponse,
)
from agents.data_collector import DataCollectorAgent
from agents.data_analyzer import DataAnalyzerAgent
from agents.predictor import PredictorAgent
from agents.tournament_simulator import TournamentSimulatorAgent
from agents.explainer import ExplainerAgent
from agents.ai_chat import AIChatAgent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Global instances
cache: Optional[CacheService] = None
data_fetcher: Optional[DataFetcher] = None
ensemble: Optional[EnsembleModel] = None
data_collector: Optional[DataCollectorAgent] = None
data_analyzer: Optional[DataAnalyzerAgent] = None
predictor: Optional[PredictorAgent] = None
simulator: Optional[TournamentSimulatorAgent] = None
explainer: Optional[ExplainerAgent] = None
chat_agent: Optional[AIChatAgent] = None

# Cached simulation results
_cached_champion_result: Optional[dict] = None


def _build_champion_response(sim_result: dict, top_n: int) -> dict:
    """Build ChampionPredictionResponse from simulation result dict."""
    teams_dict = {t.id: t for t in data_fetcher.fetch_teams()}

    sorted_champs = sorted(
        sim_result.get("champion_prob", {}).items(),
        key=lambda x: x[1],
        reverse=True
    )[:top_n]

    predictions = []
    for team_id, prob in sorted_champs:
        team = teams_dict.get(team_id)
        if not team:
            continue
        qual = sim_result.get("qualification_prob", {}).get(team_id, {})
        path = [
            {"round": "group", "prob": round(qual.get("r32", 0), 3)},
            {"round": "r32", "prob": round(qual.get("r16", 0), 3)},
            {"round": "r16", "prob": round(qual.get("qf", 0), 3)},
            {"round": "qf", "prob": round(qual.get("sf", 0), 3)},
            {"round": "sf", "prob": round(qual.get("final", 0), 3)},
            {"round": "final", "prob": round(prob, 3)},
        ]
        predictions.append({
            "team": team.model_dump(),
            "probability": round(prob, 4),
            "path": path,
        })

    # Top scorers
    top_scorers = []
    for team_id, team in sorted(teams_dict.items(), key=lambda x: x[1].attack_strength, reverse=True)[:5]:
        if team.squad:
            fw = [p for p in team.squad if p.position in ("FW", "MF")]
            for p in fw[:1]:
                top_scorers.append({
                    "team": team.name,
                    "player": p.name,
                    "goals": round(team.attack_strength * 2.5, 1),
                })

    # Dark horses
    dark_horses = []
    for team_id, prob in sorted_champs[3:min(8, len(sorted_champs))]:
        team = teams_dict.get(team_id)
        if team:
            dark_horses.append({
                "team": team.name,
                "team_id": team_id,
                "probability": round(prob, 4),
                "reason": f"Elo评分 {team.elo_rating:.0f}，进攻能力 {team.attack_strength:.2f}",
            })

    model_confidence = round(min(0.95, (sorted_champs[0][1] if sorted_champs else 0) * 3), 3)

    return {
        "predictions": predictions,
        "top_scorers": top_scorers[:5],
        "dark_horses": dark_horses,
        "model_confidence": model_confidence,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    global cache, data_fetcher, ensemble, data_collector, data_analyzer
    global predictor, simulator, explainer, chat_agent
    global _cached_champion_result

    logger.info("Starting World Cup Predictor Backend...")

    # Initialize services
    cache = CacheService(settings.CACHE_DIR)
    data_fetcher = DataFetcher(cache)
    ensemble = EnsembleModel()

    # Initialize data
    data_collector = DataCollectorAgent(data_fetcher, cache)
    init_result = data_collector.initialize()
    logger.info(f"Data initialized: {init_result}")

    # Train ML models first (needed for prediction cache)
    logger.info("Training ML models...")
    cv_scores = ensemble.train_ml()
    logger.info(f"ML models trained. CV scores: {cv_scores}")

    # Initialize agents
    data_analyzer = DataAnalyzerAgent(data_fetcher)
    predictor = PredictorAgent(data_fetcher, ensemble)
    simulator = TournamentSimulatorAgent(data_fetcher, ensemble)
    explainer = ExplainerAgent(data_fetcher, predictor, data_analyzer, simulator)
    chat_agent = AIChatAgent(data_fetcher, data_analyzer, predictor, simulator)

    logger.info("Backend ready!")

    # Pre-compute simulation in background thread
    async def precompute_simulation():
        global _cached_champion_result
        await asyncio.sleep(1)
        logger.info("Pre-computing simulation (500 iterations) in background...")
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, simulator.simulate_full_tournament, 500
            )
            _cached_champion_result = result.model_dump()
            top = max(result.champion_prob, key=result.champion_prob.get) if result.champion_prob else 'N/A'
            logger.info(f"Pre-computation complete. Champion: {top}")
        except Exception as e:
            logger.error(f"Pre-computation failed: {e}")

    asyncio.create_task(precompute_simulation())

    yield

    logger.info("Shutting down...")


app = FastAPI(
    title="2026 FIFA World Cup Champion Prediction Agent",
    description="AI-powered predictions for the 2026 FIFA World Cup",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============ Health Check ============

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "mock_mode": settings.MOCK_MODE,
        "ml_trained": ensemble.is_trained if ensemble else False,
        "simulation_cached": _cached_champion_result is not None,
    }


# ============ Teams ============

@app.get("/api/teams")
async def get_teams():
    """Get all 48 teams."""
    teams = data_fetcher.fetch_teams()
    return [t.model_dump() for t in teams]


@app.get("/api/teams/{team_id}")
async def get_team(team_id: str):
    """Get a specific team by ID."""
    team = data_fetcher.get_team(team_id)
    if not team:
        raise HTTPException(status_code=404, detail=f"Team '{team_id}' not found")
    return team.model_dump()


# ============ Groups ============

@app.get("/api/groups")
async def get_groups():
    """Get all groups with teams and standings."""
    teams = data_fetcher.fetch_teams()
    groups_dict = {}

    for team in teams:
        g = team.group
        if g not in groups_dict:
            groups_dict[g] = []
        groups_dict[g].append(team)

    result = []
    for g_name in sorted(groups_dict.keys()):
        g_teams = groups_dict[g_name]
        g_teams_sorted = sorted(g_teams, key=lambda t: t.elo_rating, reverse=True)
        standings = []
        for i, team in enumerate(g_teams_sorted):
            standings.append(GroupStanding(
                team=team,
                played=0, won=0, drawn=0, lost=0,
                goals_for=0, goals_against=0, points=0,
                qualification_prob=round(1.0 - i * 0.2, 2) if i < 2 else round(0.3 - (i - 2) * 0.15, 2),
            ))

        result.append(Group(
            name=g_name,
            teams=g_teams,
            standings=standings,
        ).model_dump())

    return result


# ============ Matches ============

@app.get("/api/matches")
async def get_matches(stage: Optional[str] = Query(None), group: Optional[str] = Query(None)):
    """Get matches, optionally filtered by stage and/or group."""
    matches = data_fetcher.fetch_matches()

    if stage:
        matches = [m for m in matches if m.stage == stage]
    if group:
        matches = [m for m in matches if m.group == group]

    return [m.model_dump() for m in matches]


@app.get("/api/matches/{match_id}/predict")
async def predict_match(match_id: str):
    """Get prediction for a specific match."""
    pred = predictor.predict_match(match_id)
    if not pred:
        raise HTTPException(status_code=404, detail=f"Match '{match_id}' not found or prediction unavailable")
    return pred.model_dump()


# ============ Champion Predictions ============

@app.get("/api/predictions/champion")
async def get_champion_predictions(top_n: int = Query(10, ge=1, le=48)):
    """Get champion prediction rankings."""
    global _cached_champion_result

    if _cached_champion_result:
        return _build_champion_response(_cached_champion_result, top_n)

    # Run simulation synchronously if not cached
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, simulator.simulate_full_tournament, 1000
        )
        _cached_champion_result = result.model_dump()
        return _build_champion_response(_cached_champion_result, top_n)
    except Exception as e:
        logger.error(f"Champion prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ============ Simulation ============

@app.post("/api/simulate")
async def run_simulation(request: SimulationRequest):
    """Run Monte Carlo tournament simulation."""
    global _cached_champion_result
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, simulator.simulate_full_tournament, request.num_simulations
        )
        _cached_champion_result = result.model_dump()
        return result.model_dump()
    except Exception as e:
        logger.error(f"Simulation error: {e}")
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")


@app.get("/api/simulate/summary")
async def get_simulation_summary():
    """Get summary of last simulation results."""
    global _cached_champion_result

    if not _cached_champion_result:
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, simulator.simulate_full_tournament, 500
            )
            _cached_champion_result = result.model_dump()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    result = _cached_champion_result
    teams_dict = {t.id: t for t in data_fetcher.fetch_teams()}

    group_standings = {}
    for group_letter in sorted(set(t.group for t in teams_dict.values())):
        group_teams = [t for t in teams_dict.values() if t.group == group_letter]
        group_teams.sort(key=lambda t: (
            result.get("qualification_prob", {}).get(t.id, {}).get("r32", 0),
            t.elo_rating
        ), reverse=True)
        group_standings[group_letter] = [
            {"position": i + 1, "team": t.model_dump(),
             "qualification_prob": round(result.get("qualification_prob", {}).get(t.id, {}).get("r32", 0), 3)}
            for i, t in enumerate(group_teams)
        ]

    r16_probs = {
        tid: qp.get("r16", 0)
        for tid, qp in result.get("qualification_prob", {}).items()
    }
    sorted_r16 = sorted(r16_probs.items(), key=lambda x: x[1], reverse=True)[:16]
    bracket = {
        "likely_r16": [
            {"team_id": tid, "team_name": teams_dict[tid].name if tid in teams_dict else tid,
             "qualification_prob": round(prob, 3)}
            for tid, prob in sorted_r16
        ],
    }

    return {
        "champion_predictions": _build_champion_response(result, 10),
        "group_standings": group_standings,
        "knockout_bracket": bracket,
    }


# ============ Explanations ============

@app.get("/api/explain/match/{match_id}")
async def explain_match(match_id: str):
    """Get detailed explanation for a match prediction."""
    result = explainer.explain_match(match_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Match '{match_id}' not found")
    return result.model_dump()


@app.get("/api/explain/champion")
async def explain_champion():
    """Get explanation for champion predictions."""
    return explainer.explain_champion()


# ============ Chat ============

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Chat with the prediction AI."""
    result = chat_agent.chat(request.message)
    return ChatResponse(**result).model_dump()


# ============ Additional Endpoints ============

@app.get("/api/analysis/team/{team_id}")
async def analyze_team(team_id: str):
    """Get comprehensive team analysis."""
    result = data_analyzer.analyze_team(team_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Team '{team_id}' not found")
    return result


@app.get("/api/analysis/compare")
async def compare_teams(team_a: str = Query(...), team_b: str = Query(...)):
    """Compare two teams."""
    result = data_analyzer.compare_teams(team_a, team_b)
    if not result:
        raise HTTPException(status_code=404, detail="One or both teams not found")
    return result


@app.get("/api/analysis/group/{group_name}")
async def analyze_group(group_name: str):
    """Analyze a specific group."""
    group_name = group_name.upper()
    result = data_analyzer.analyze_group(group_name)
    if not result:
        raise HTTPException(status_code=404, detail=f"Group '{group_name}' not found")
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
