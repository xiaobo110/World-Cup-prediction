"""AI chat agent - rule-based chat that answers questions about prediction data."""
import logging
import re
from typing import Dict, Any, Optional, List

from services.data_fetcher import DataFetcher
from agents.data_analyzer import DataAnalyzerAgent
from agents.predictor import PredictorAgent
from agents.tournament_simulator import TournamentSimulatorAgent

logger = logging.getLogger(__name__)


class AIChatAgent:
    """Rule-based chat agent that answers questions about World Cup predictions."""

    def __init__(self, data_fetcher: DataFetcher, analyzer: DataAnalyzerAgent,
                 predictor: PredictorAgent, simulator: TournamentSimulatorAgent):
        self.fetcher = data_fetcher
        self.analyzer = analyzer
        self.predictor = predictor
        self.simulator = simulator

    def chat(self, message: str) -> Dict[str, Any]:
        """Process a chat message and return a response.

        Uses keyword matching to route to appropriate handlers.
        """
        msg = message.lower().strip()
        data_context = None

        # Route based on keywords
        response, data_context = self._route_message(msg, message)

        return {
            "response": response,
            "data_context": data_context,
        }

    def _route_message(self, msg_lower: str, original: str) -> tuple:
        """Route message to appropriate handler based on keywords."""

        # Champion prediction queries
        if any(kw in msg_lower for kw in ["champion", "winner", "who will win", "recommend", "推荐冠军", "冠军"]):
            return self._handle_champion_query()

        # Team analysis queries
        if any(kw in msg_lower for kw in ["analyze", "analysis", "分析", "查看"]):
            return self._handle_team_analysis(msg_lower, original)

        # Why queries
        if any(kw in msg_lower for kw in ["why", "为什么", "为啥"]):
            return self._handle_why_query(msg_lower, original)

        # Group of death
        if any(kw in msg_lower for kw in ["group of death", "死亡之组", "最死亡", "toughest group"]):
            return self._handle_group_of_death()

        # Simulation
        if any(kw in msg_lower for kw in ["simulate", "模拟", "rerun", "re-simulate"]):
            return self._handle_simulation(msg_lower)

        # Top scorer
        if any(kw in msg_lower for kw in ["top scorer", "golden boot", "最佳射手", "射手"]):
            return self._handle_top_scorers()

        # Dark horse
        if any(kw in msg_lower for kw in ["dark horse", "黑马", "surprise"]):
            return self._handle_dark_horses()

        # Group standings
        if any(kw in msg_lower for kw in ["group", "standings", "小组赛", "排名"]):
            return self._handle_group_query(msg_lower, original)

        # Match prediction
        if any(kw in msg_lower for kw in ["predict", "prediction", "预测"]):
            return self._handle_prediction_query(msg_lower, original)

        # Team comparison
        if any(kw in msg_lower for kw in ["compare", "vs", "versus", "对比"]):
            return self._handle_comparison(msg_lower, original)

        # Help
        if any(kw in msg_lower for kw in ["help", "帮助", "what can you", "你能做什么"]):
            return self._handle_help()

        # Default response
        return self._handle_default(original)

    def _handle_champion_query(self) -> tuple:
        """Handle champion prediction queries."""
        champ = self.simulator.get_champion_probabilities(top_n=5)
        data_context = champ.model_dump()

        lines = ["2026 FIFA World Cup Champion Predictions:\n"]
        for i, pred in enumerate(champ.predictions, 1):
            lines.append(f"  {i}. {pred.team.flag_emoji} {pred.team.name} - {pred.probability:.1%}")

        lines.append(f"\nModel confidence: {champ.model_confidence:.1%}")
        lines.append(f"Based on {champ.total_simulations if hasattr(champ, 'total_simulations') else 10000} Monte Carlo simulations")

        return "\n".join(lines), data_context

    def _handle_team_analysis(self, msg_lower: str, original: str) -> tuple:
        """Handle team analysis queries."""
        teams = self.fetcher.fetch_teams()
        teams_dict = {t.id: t for t in teams}
        name_to_id = {}
        for t in teams:
            name_to_id[t.name.lower()] = t.id
            name_to_id[t.name_zh] = t.id
            name_to_id[t.id] = t.id
            name_to_id[t.code.lower()] = t.id

        # Find team in message
        found_team = None
        for name, tid in name_to_id.items():
            if name in msg_lower:
                found_team = tid
                break

        if not found_team:
            return "I couldn't identify which team you're asking about. Please specify a team name.", None

        analysis = self.analyzer.analyze_team(found_team)
        if not analysis:
            return f"Sorry, I couldn't find analysis data for that team.", None

        data_context = analysis
        team = teams_dict.get(found_team)
        a = analysis["analysis"]

        lines = [f"Analysis: {team.flag_emoji} {team.name} ({team.name_zh})\n"]
        lines.append(f"  FIFA Rank: #{team.fifa_rank}")
        lines.append(f"  Elo Rating: {team.elo_rating:.0f}")
        lines.append(f"  Group: {team.group}")
        lines.append(f"  Overall Power: {a['overall_power']:.0f}/100")
        lines.append(f"  Attack Rating: {a['offensive_rating']:.0f}/100")
        lines.append(f"  Defense Rating: {a['defensive_rating']:.0f}/100")
        lines.append(f"  Form: {' '.join(['W' if f == 1 else 'D' if f == 0.5 else 'L' for f in team.form])}")
        lines.append(f"  Form Trend: {a['form_trend']}")
        lines.append(f"\n  Strengths: {', '.join(a['strengths'])}")
        lines.append(f"  Weaknesses: {', '.join(a['weaknesses'])}")
        lines.append(f"  Key Player: {a['key_player']}")

        return "\n".join(lines), data_context

    def _handle_why_query(self, msg_lower: str, original: str) -> tuple:
        """Handle 'why' queries about team strength."""
        teams = self.fetcher.fetch_teams()
        name_to_id = {}
        for t in teams:
            name_to_id[t.name.lower()] = t.id
            name_to_id[t.name_zh] = t.id
            name_to_id[t.id] = t.id

        found_team = None
        for name, tid in name_to_id.items():
            if name in msg_lower:
                found_team = tid
                break

        if not found_team:
            return "I couldn't identify which team you're asking about.", None

        analysis = self.analyzer.analyze_team(found_team)
        if not analysis:
            return "Sorry, no analysis available for that team.", None

        team = self.fetcher.get_team(found_team)
        a = analysis["analysis"]

        lines = [f"Why {team.name} is strong:\n"]
        for s in a["strengths"]:
            lines.append(f"  - {s}")
        lines.append(f"\nOverall power rating: {a['overall_power']:.0f}/100")
        lines.append(f"Attack: {a['offensive_rating']:.0f}/100, Defense: {a['defensive_rating']:.0f}/100")

        return "\n".join(lines), analysis

    def _handle_group_of_death(self) -> tuple:
        """Handle group of death queries."""
        groups = {}
        for g in "ABCDEFGHIJKL":
            analysis = self.analyzer.analyze_group(g)
            if analysis:
                groups[g] = analysis

        sorted_groups = sorted(groups.items(), key=lambda x: x[1]["analysis"]["group_of_death_score"], reverse=True)

        lines = ["Group Difficulty Rankings (Group of Death Score):\n"]
        for g, analysis in sorted_groups:
            score = analysis["analysis"]["group_of_death_score"]
            teams = ", ".join(t["team_name"] for t in analysis["analysis"]["predicted_standings"])
            bar = "█" * int(score / 10) + "░" * (10 - int(score / 10))
            lines.append(f"  Group {g}: [{bar}] {score:.0f}/100")
            lines.append(f"    Teams: {teams}")

        toughest = sorted_groups[0]
        lines.append(f"\nThe 'Group of Death' is Group {toughest[0]} with a difficulty score of {toughest[1]['analysis']['group_of_death_score']:.0f}/100")

        return "\n".join(lines), {g: a for g, a in sorted_groups}

    def _handle_simulation(self, msg_lower: str) -> tuple:
        """Handle simulation requests."""
        # Try to extract number
        nums = re.findall(r'\d+', msg_lower)
        n = int(nums[0]) if nums else 10000
        n = min(n, 50000)  # Cap at 50000

        result = self.simulator.simulate_full_tournament(n)
        data_context = result.model_dump()

        return f"Tournament simulation complete with {n:,} iterations. Results have been updated.", data_context

    def _handle_top_scorers(self) -> tuple:
        """Handle top scorer queries."""
        champ = self.simulator.get_champion_probabilities()
        scorers = champ.top_scorers[:10]

        lines = ["Predicted Top Scorers:\n"]
        for i, s in enumerate(scorers, 1):
            lines.append(f"  {i}. {s['player']} ({s['team']}) - Est. {s['estimated_goals']} goals")

        return "\n".join(lines), scorers

    def _handle_dark_horses(self) -> tuple:
        """Handle dark horse queries."""
        champ = self.simulator.get_champion_probabilities()
        dark_horses = champ.dark_horses

        lines = ["Dark Horse Candidates:\n"]
        for dh in dark_horses:
            lines.append(f"  {dh['team']} - {dh['probability']:.1%} chance")
            lines.append(f"    Reason: {dh['reason']}")

        return "\n".join(lines), dark_horses

    def _handle_group_query(self, msg_lower: str, original: str) -> tuple:
        """Handle group standings queries."""
        # Try to find group letter
        for g in "ABCDEFGHIJKL":
            if g.lower() in msg_lower:
                analysis = self.analyzer.analyze_group(g)
                if analysis:
                    lines = [f"Group {g} Analysis:\n"]
                    for ts in analysis["analysis"]["predicted_standings"]:
                        lines.append(f"  {ts['position']}. {ts['team_name']} (Elo: {ts['elo_rating']:.0f})")
                    lines.append(f"\nStrongest: {analysis['analysis']['strongest_team']}")
                    lines.append(f"Weakest: {analysis['analysis']['weakest_team']}")
                    return "\n".join(lines), analysis
                return f"Group {g} data not available.", None

        # Show all groups summary
        lines = ["All Groups:\n"]
        for g in "ABCDEFGHIJKL":
            teams = self.fetcher.get_teams_by_group(g)
            team_names = ", ".join(t.name for t in teams)
            lines.append(f"  Group {g}: {team_names}")

        return "\n".join(lines), None

    def _handle_prediction_query(self, msg_lower: str, original: str) -> tuple:
        """Handle match prediction queries."""
        # Try to find a match
        matches = self.fetcher.fetch_matches()
        teams = self.fetcher.fetch_teams()
        name_to_id = {}
        for t in teams:
            name_to_id[t.name.lower()] = t.id
            name_to_id[t.id] = t.id

        found_teams = []
        for name, tid in name_to_id.items():
            if name in msg_lower and tid not in found_teams:
                found_teams.append(tid)

        if len(found_teams) >= 2:
            # Find match between these teams
            for m in matches:
                if (m.home_team_id in found_teams and m.away_team_id in found_teams):
                    pred = self.predictor.get_match_prediction(m.id)
                    if pred:
                        p = pred["prediction"]
                        lines = [f"Prediction: {pred['home_team']} vs {pred['away_team']}\n"]
                        lines.append(f"  {pred['home_team']}: {p['home_win_prob']:.1%}")
                        lines.append(f"  Draw: {p['draw_prob']:.1%}")
                        lines.append(f"  {pred['away_team']}: {p['away_win_prob']:.1%}")
                        lines.append(f"  Predicted Score: {p['predicted_home_goals']:.1f} - {p['predicted_away_goals']:.1f}")
                        lines.append(f"  Confidence: {p['confidence']:.1%}")
                        return "\n".join(lines), pred

        return "I couldn't find a match for those teams. Try asking about specific teams or groups.", None

    def _handle_comparison(self, msg_lower: str, original: str) -> tuple:
        """Handle team comparison queries."""
        teams = self.fetcher.fetch_teams()
        name_to_id = {}
        for t in teams:
            name_to_id[t.name.lower()] = t.id
            name_to_id[t.name_zh] = t.id
            name_to_id[t.id] = t.id

        found = []
        for name, tid in name_to_id.items():
            if name in msg_lower and tid not in found:
                found.append(tid)

        if len(found) >= 2:
            comp = self.analyzer.compare_teams(found[0], found[1])
            if comp:
                c = comp["comparison"]
                lines = [f"Comparison: {comp['team_a']['name']} vs {comp['team_b']['name']}\n"]
                lines.append(f"  Elo Diff: {c['elo_diff']:+.0f}")
                lines.append(f"  FIFA Rank Diff: {c['rank_diff']:+d}")
                lines.append(f"  Attack Diff: {c['attack_diff']:+.3f}")
                lines.append(f"  Defense Diff: {c['defense_diff']:+.3f}")
                lines.append(f"  Form Diff: {c['form_diff']:+.3f}")
                lines.append(f"\n  Favorite: {c['favorite']}")
                return "\n".join(lines), comp

        return "Please specify two teams to compare (e.g., 'compare Brazil vs Germany').", None

    def _handle_help(self) -> tuple:
        """Handle help queries."""
        help_text = """I can help you with 2026 FIFA World Cup predictions! Try asking:

  - "Who will win the World Cup?" / "推荐冠军"
  - "Analyze Argentina" / "查看阿根廷分析"
  - "Why is France strong?" / "为什么法国胜率最高？"
  - "Which group is the group of death?" / "哪个组最死亡？"
  - "Top scorers" / "最佳射手"
  - "Dark horses" / "黑马"
  - "Simulate 5000 times" / "重新模拟5000次"
  - "Group A standings"
  - "Compare Brazil vs Germany"
  - "Predict match between Spain and England"
"""
        return help_text, None

    def _handle_default(self, original: str) -> tuple:
        """Handle unrecognized queries."""
        return (
            "I'm not sure I understand your question. I can help with World Cup predictions, "
            "team analysis, group standings, and match predictions. "
            "Type 'help' to see what I can do!",
            None
        )
