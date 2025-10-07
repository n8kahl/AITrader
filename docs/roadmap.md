# Options Copilot – Roadmap & Progress

## 1. Product Vision
- **Outcome**: A compliant “options copilot” that ingests broker screenshots, normalizes positions, validates them against live market data, computes tactical context (ATR/VWAP/EM/GEX), and delivers actionable advice or paper executions with journaling and guardrails.
- **Modes**: “Advice-only” default; “Advice + Execute” gated behind confirmations, limits, and audit trails.
- **Surfaces**: Web UI, Discord bot, optional voice coach via OpenAI Realtime.

## 2. Current Capabilities (Status ✅)
- **Screenshot Parsing** (`parseImageTool`): Uses OpenAI Vision + Structured Outputs to map images → `Position.schema.json`.
- **Polygon Validation & Enrichment** (`polygonValidateTool`): Confirms OCC symbol (`buildOccSymbol`) and pulls greeks/IV/OI via Option Chain Snapshot.
- **Market Context** (`buildContext`):
  - 14-period ATR from daily bars.
  - Intraday VWAP (last ~120 minutes of 1m bars).
  - Expected Move: `price * IV * sqrt(1/365)`.
  - Dealer Gamma Exposure: `Σ(gamma * OI * 100 * spot)`.
- **Plan Generation** (`planTool`): Structured JSON plan with stops/targets/hedges (requires `OPENAI_API_KEY`).
- **Express Gateway** (`/api/manage-from-json`, `/api/manage-from-image`, `/api/health`): Serves static UI + REST endpoints.
- **Agents Skeleton**: Quant, Coach, Risk, Trader agents with handoff pipeline.
- **Order & Journal Stubs**: Preview/place/modify/flatten (paper) + console journaling.
- **Discord Bot**: Forwards `!manage` screenshot to gateway and returns plan JSON.
- **Deployment**: Dockerized, running on Railway; environment variable support baked in.

## 3. Key Calculations & Data Sources
| Metric | Implementation | Source |
| --- | --- | --- |
| OCC Symbol | `buildOccSymbol(underlying, expiration, strike, right)` | Internal helper (`symbol.ts`) |
| ATR (14) | Rolling true range avg on daily bars | Polygon Aggregates v2 (`/v2/aggs/.../1/day`) |
| VWAP (intraday) | Weighted avg of `((H+L+C)/3) * volume` over last 120 bars | Polygon Aggregates v2 (`/1/minute`) |
| Expected Move | `price * impliedVol * sqrt(1/365)` | Implied vol from Polygon chain snapshot |
| Gamma Exposure | Σ(gamma × OI × 100 × spot) | Polygon Option Chain Snapshot |
| LEAP Screener | Delta, DTE, IV filter & trend slope (EMA21-EMA50) | Polygon daily bars + chain snapshot |

## 4. Roadmap

### Phase 0 – Baseline Stability (✅ in progress)
- [x] Deploy gateway on Railway with Dockerfile.
- [x] Structured Outputs for parse & plan.
- [x] Polygon validation/context hooks.
- [ ] Add OPENAI key & confirm plan generation in production.
- [ ] Harden schemas/tests (Position, Plan) with `additionalProperties: false` + regression suite.

### Phase 1 – Advice MVP (Target: Week 1)
- [ ] Complete plan generation QA (ensure schema compliance, populate `contracts_suggested`, `voice_script`).
- [ ] Web UI polish: show plan cards (intent, stops, targets, hedges) + highlight confidence.
- [ ] Add journal persistence (start with SQLite/Prisma or Railway Postgres).
- [ ] Implement auth/rate limiting (basic API key or user token).

### Phase 2 – Execution Guardrails (Week 2)
- [ ] Risk Agent policies: spread% cap, daily loss (R) limit, position sizing guard.
- [ ] Confirmation loop: capture “Yes, execute” confirmations and log.
- [ ] Paper broker adapter integration (e.g., Tradier sandbox); wire order tool stubs.
- [ ] Discord/voice notifications for plan updates (TP hit, stop moved).

### Phase 3 – Advanced Insights (Week 3+)
- [ ] Gamma regime dashboard & alerts (short vs. long gamma thresholds).
- [ ] LEAP recommender UI with one-tap hedge preview.
- [ ] Performance metrics (win rate, R multiple, adherence scoring).
- [ ] Multi-user tenancy & RBAC (advisor vs. executor).

## 5. Backlog & Ideas
- Add `/api/manage-from-json/test` for health automation.
- Implement image redaction (account numbers) before sending to OpenAI.
- Chat/WhatsApp integrations via Twilio or ChatKit UI.
- Real-time event stream (Polygon WebSockets) feeding voice coach.
- MCP server wrapper exposing Polygon tools for third-party agents.

## 6. Progress Tracking
| Epic | Owner | Status | Notes |
| --- | --- | --- | --- |
| Deployment & Infra | Nate / Codex | ✅ | Railway Docker build fixed (`npm ci` fallback, start command). |
| Polygon Integration | Nate | ✅ | Validation, context, GEX live; needs LEAP UI. |
| Plan Generation | Nate | ⚠️ | Schema tightening done; waiting for prod OPENAI key & QA. |
| Voice & Realtime | TODO | ⏳ | Realtime agent scaffold exists; UI session wiring pending. |
| Execution Safety | TODO | ⏳ | Order/journal stubs in place; risk policies not yet enforced. |

## 7. Environment & Ops Checklist
- [x] Railway service deployed (`radiant-renewal-production.up.railway.app`).
- [ ] Railway variables: `POLYGON_KEY`, `OPENAI_API_KEY`, `MODEL_REASONING`, `MODEL_REALTIME`.
- [ ] Monitoring: add Pino transport or Railway logs retention plan.
- [ ] CI/CD: optional GitHub Action (`infra/github-actions/railway-deploy.yml`) for auto deploys.

## 8. Next Actions
1. **Set OPENAI_API_KEY** in Railway and confirm plan JSON populates (validate contracts_suggested & voice_script presence).
2. Build a lightweight `/docs/TESTING.md` with curl samples & expected responses.
3. Decide on journal storage (files vs. Postgres) and instrument `journalTool`.
4. Kick off Phase 1 UI polish & risk guard implementation.

_Updated: 2025-10-06_
