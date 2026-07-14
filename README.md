# 2026 FIFA 世界杯冠军预测 Agent

基于 AI 多模型融合的 2026 年 FIFA 世界杯冠军预测系统。

## 系统特性

- **多 Agent 架构**: 数据采集、分析、预测、模拟、可解释 AI 五大 Agent 协同工作
- **多模型融合**: Elo Rating + Poisson + Random Forest + XGBoost + LightGBM 集成预测
- **Monte Carlo 模拟**: 10000+ 次完整锦标赛模拟，输出冠军概率
- **可解释 AI**: SHAP 特征重要性分析 + 自然语言推理链
- **AI 助手**: 支持自然语言问答，实时查询预测结果
- **现代 Dashboard**: Dark Theme + Glassmorphism + Three.js 粒子背景 + ECharts 可视化

## 技术栈

**前端**: Next.js 14 + React 18 + TypeScript + TailwindCSS + Framer Motion + ECharts + Three.js + Zustand

**后端**: Python 3.11 + FastAPI + NumPy + SciPy + scikit-learn + XGBoost + LightGBM + SHAP

## 快速开始

### 环境要求

- Node.js 18+
- Python 3.11+
- npm / pip

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

后端启动时会自动：
- 加载 48 支参赛队伍数据
- 加载 104 场比赛赛程
- 训练机器学习模型（Random Forest / XGBoost / LightGBM）
- 运行初始 Monte Carlo 模拟

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000 查看 Dashboard。

### Docker 部署

```bash
docker-compose up --build
```

## 项目结构

```
worldcup-predictor-agent/
├── backend/
│   ├── agents/           # 5 大 AI Agent
│   │   ├── data_collector.py    # 数据采集
│   │   ├── data_analyzer.py     # 数据分析
│   │   ├── predictor.py         # 比赛预测
│   │   ├── tournament_simulator.py  # 淘汰赛推演
│   │   ├── explainer.py         # 可解释 AI
│   │   └── ai_chat.py           # AI 聊天助手
│   ├── models/           # 预测模型
│   │   ├── elo_model.py         # Elo 评分模型
│   │   ├── poisson_model.py     # Poisson 进球模型
│   │   ├── ml_model.py          # 机器学习模型 (RF/XGB/LGBM)
│   │   ├── monte_carlo.py       # Monte Carlo 模拟器
│   │   ├── ensemble.py          # 加权融合模型
│   │   └── schemas.py           # 数据模型定义
│   ├── services/         # 基础服务
│   ├── data/mock/        # Mock 数据 (48队 + 104场)
│   └── main.py           # FastAPI 入口
├── frontend/
│   ├── src/app/          # 7 个页面
│   │   ├── dashboard/    # 总览 Dashboard
│   │   ├── teams/        # 球队分析
│   │   ├── groups/       # 小组赛
│   │   ├── knockout/     # 淘汰赛赛程树
│   │   ├── champion/     # 冠军预测
│   │   ├── explain/      # 可解释 AI
│   │   └── chat/         # AI 聊天
│   ├── src/components/   # UI 组件 + 图表 + 3D 背景
│   ├── src/lib/          # API 客户端 + 工具函数
│   └── src/stores/       # Zustand 状态管理
├── docker-compose.yml
└── docs/ARCHITECTURE.md
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/teams` | GET | 获取全部 48 支队伍 |
| `/api/teams/{id}` | GET | 获取单支球队详情 |
| `/api/groups` | GET | 获取 12 个小组 + 积分榜 |
| `/api/matches` | GET | 获取全部 104 场比赛 |
| `/api/matches/{id}/predict` | GET | 获取单场比赛预测 |
| `/api/predictions/champion` | GET | 冠军预测排名 |
| `/api/simulate` | POST | 运行 Monte Carlo 模拟 |
| `/api/simulate/summary` | GET | 模拟结果摘要 |
| `/api/explain/match/{id}` | GET | 比赛预测解释 |
| `/api/explain/champion` | GET | 冠军预测解释 |
| `/api/chat` | POST | AI 聊天 |

## 预测模型

1. **Elo Rating**: 基于 Elo 评分差计算基础胜率，K=40
2. **Poisson Goal Model**: 攻击/防守强度 × 联赛平均值 → Poisson 分布预测进球
3. **Random Forest**: 20+ 维特征工程，100 棵树
4. **XGBoost**: 梯度提升，学习率 0.05
5. **LightGBM**: 轻量梯度提升，叶子优先生长
6. **Weighted Ensemble**: 加权融合 (Elo 15%, Poisson 25%, RF 20%, XGB 20%, LGBM 20%)

## 数据来源

默认使用 Mock 数据（内置 48 支球队的 realistic 数据）。支持切换为真实 API：

- [football-data.org](https://www.football-data.org/) - 比赛赛程、比分
- FIFA Ranking API - 世界排名
- Elo Ratings - 国家队 Elo 评分

设置环境变量 `MOCK_MODE=false` 和 `API_FOOTBALL_DATA_KEY=your_key` 切换到真实数据。

## License

MIT
