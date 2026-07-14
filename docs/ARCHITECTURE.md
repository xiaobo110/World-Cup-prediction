## Phase 1: 系统架构设计

### 项目概述

2026 FIFA 世界杯冠军预测 Agent —— 一个基于多 Agent 架构的 AI 预测系统。系统自动采集球队数据，通过 Elo、Poisson、机器学习（Random Forest / XGBoost / LightGBM）和 Monte Carlo 模拟（10000+ 次）融合预测，输出每场比赛比分、晋级概率和冠军概率，并提供完整的可解释 AI 推理链。

### 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                        │
│  ┌─────────┬──────────┬──────────┬──────────┬────────────────┐  │
│  │Dashboard│ Team     │ Group    │Knockout  │ Champion       │  │
│  │ Overview│ Analysis │ Stage    │ Bracket  │ Prediction     │  │
│  └────┬────┴────┬─────┴────┬─────┴────┬─────┴───────┬────────┘  │
│       │         │          │          │             │            │
│  ┌────┴─────────┴──────────┴──────────┴─────────────┴────────┐  │
│  │        React Query + Zustand (State Management)           │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │ REST API                          │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP
┌─────────────────────────────┼───────────────────────────────────┐
│                    Backend (FastAPI)                             │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │                    API Gateway (REST)                      │  │
│  └──┬──────────┬──────────┬──────────┬──────────┬───────────┘  │
│     │          │          │          │          │               │
│  ┌──┴───┐  ┌──┴───┐  ┌──┴───┐  ┌──┴───┐  ┌──┴──────────┐    │
│  │Data  │  │Analy-│  │Predic-│  │Tourn-│  │Explainable  │    │
│  │Collec│  │sis   │  │tion  │  │ament │  │AI Agent     │    │
│  │tor   │  │Agent │  │Agent │  │Simul.│  │             │    │
│  │Agent │  │      │  │      │  │Agent │  │             │    │
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └─────────────┘    │
│     │         │         │         │                             │
│  ┌──┴─────────┴─────────┴─────────┴────────────────────────┐  │
│  │              Prediction Models Layer                      │  │
│  │  ┌─────┐ ┌────────┐ ┌────┐ ┌───────┐ ┌────────┐        │  │
│  │  │ Elo │ │Poisson │ │ RF │ │XGBoost│ │LightGBM│        │  │
│  │  └─────┘ └────────┘ └────┘ └───────┘ └────────┘        │  │
│  │  ┌──────────────────────────────────────────────┐        │  │
│  │  │        Weighted Ensemble Fusion              │        │  │
│  │  └──────────────────────────────────────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│  ┌──────────────────────────┴────────────────────────────────┐  │
│  │              Data Layer (Cache + Mock)                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐        │  │
│  │  │JSON Cache│  │Mock Data │  │Football-Data.org │        │  │
│  │  └──────────┘  └──────────┘  └──────────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 多 Agent 架构

**Agent 1: DataCollector（数据采集）**
负责从多个数据源获取世界杯相关数据。数据源包括 football-data.org（比赛赛程、小组赛分组、历史比分）、FIFA 排名 API、Elo Ratings（国家队 Elo 评分）、TransferMarkt（球员身价）。采集后自动清洗、去重并缓存到本地 JSON 文件，支持增量更新。

**Agent 2: DataAnalyzer（数据分析）**
接收原始数据，计算每支球队的多维能力画像：进攻能力（近10场场均进球、射门转化率）、防守能力（场均失球、零封率）、中场控制（控球率、传球成功率）、近期状态（近10场胜负平加权）、历史交锋记录。输出标准化的球队能力向量。

**Agent 3: Predictor（比赛预测）**
融合多种预测模型输出每场比赛的胜/平/负概率和预期比分。使用 Elo 差值计算基础胜率，Poisson 模型预测进球分布，Random Forest / XGBoost / LightGBM 基于特征工程预测比赛结果，最终通过加权融合得到综合概率。

**Agent 4: TournamentSimulator（淘汰赛推演）**
从小组赛开始完整模拟世界杯赛程。小组赛阶段计算每场比赛结果并生成积分榜，淘汰赛阶段逐轮模拟（16强→8强→半决赛→决赛）。Monte Carlo 模块将此过程重复 10000 次以上，统计冠军概率、晋级概率和比分分布。

**Agent 5: Explainer（可解释 AI）**
为每个预测结果生成人类可读的推理过程。使用 SHAP 值量化各特征对预测结果的贡献度，提取关键因素（如"Elo 优势 +120，近期状态 8 连胜，历史交锋 5:2"），生成自然语言推理报告。

### 预测模型设计

**Elo Rating Model**
基于 Elo 评分差计算预期胜率。公式：E_A = 1 / (1 + 10^((R_B - R_A) / 400))。平局概率由 Elo 差值的绝对值映射。世界杯比赛 K 因子 = 40。

**Poisson Goal Model**
为每支球队计算攻击强度（attack_strength = 球队场均进球 / 联赛平均进球）和防守强度（defense_strength = 球队场均失球 / 联赛平均失球）。预期进球 = attack × opponent_defense × avg_goals。进球概率服从 Poisson 分布，由此计算胜/平/负概率。

**Machine Learning Models**
特征工程包含 20+ 维特征：Elo 差值、FIFA 排名差值、近 10 场胜率、场均进球/失球、控球率、射门效率、历史交锋胜率、大赛经验指数等。使用 Random Forest、XGBoost 和 LightGBM 三种集成学习方法，通过交叉验证调参。

**Weighted Ensemble**
最终预测 = w1×Elo + w2×Poisson + w3×RF + w4×XGBoost + w5×LightGBM。权重通过验证集上的模型表现（对数损失）自动优化。

**Monte Carlo Simulation**
完整模拟世界杯赛程 10000 次。每场比赛结果从融合概率分布中随机采样。统计每支球队的冠军次数、晋级各轮次数、预期进球分布。

### API 契约

```
GET  /api/teams                    → Team[]
GET  /api/teams/{id}               → TeamDetail
GET  /api/groups                   → Group[]
GET  /api/matches                  → Match[]
GET  /api/matches/{id}/predict     → MatchPrediction
GET  /api/predictions/champion     → ChampionPrediction
POST /api/simulate                 → TournamentSimulation
GET  /api/simulate/summary         → SimulationSummary
GET  /api/explain/match/{id}       → Explanation
GET  /api/explain/champion         → ChampionExplanation
POST /api/chat                     → ChatResponse
GET /api/health                    → { status: "ok" }
```

### 数据模型

**Team**: id, name, code, fifaRank, eloRating, flag, group, attackStrength, defenseStrength, form, marketValue, squad (Player[])

**Match**: id, homeTeam, awayTeam, datetime, stage (group/r16/qf/sf/final), group, venue

**MatchPrediction**: matchId, homeWinProb, drawProb, awayWinProb, predictedHomeGoals, predictedAwayGoals, confidence, modelBreakdown, keyFactors

**SimulationResult**: championProb (Map), qualificationProb (Map), avgGoalsPerTeam, bracketPaths, totalSimulations

### 技术栈

前端: Next.js 14 + React 18 + TypeScript (strict) + TailwindCSS + shadcn/ui + Framer Motion + ECharts (via echarts-for-react) + Three.js (via @react-three/fiber) + Zustand + React Query

后端: Python 3.11+ + FastAPI + NumPy + SciPy + scikit-learn + XGBoost + LightGBM + SHAP + httpx (async HTTP)

部署: Docker + Docker Compose
