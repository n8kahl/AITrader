
# Options Copilot (Starter Repo)

**Upload a broker screenshot → parse a structured position → validate with Polygon → compute context (ATR/VWAP/EM/GEX) → get a management plan (stops/targets/hedges).**
Includes **extended modules**: Live WebSocket Aggregator (stocks/options), **Gamma Engine**, and **LEAP recommender**.

> ⚠️ **Compliance**: This is for educational use. Ship *advice-only* by default. Require explicit user confirmation for any execution. Add daily loss limits, spread% caps, journaling, and appropriate registrations for live trading.

## Stack
- **OpenAI Agents SDK (Agent Kit)**: multi-agent logic (Quant / Coach / Risk / Trader), tools & handoffs.
- **OpenAI Structured Outputs + Vision**: parse screenshot → **Position JSON**.
- **OpenAI Realtime (WebRTC)**: voice coaching (speak at inflection points).
- **Polygon.io**: stocks aggregates, options quotes/trades, **Option Chain Snapshot** (greeks/IV/OI).
- **Railway**: one-click deploy from GitHub.

## Quickstart
```bash
cd apps/gateway
cp .env.example .env                  # fill OPENAI_API_KEY + Polygon key
# Use either POLYGON_KEY or POLYGON_API_KEY in .env
npm i
npm run build
npm start
# open http://localhost:8080, upload a screenshot, see the plan JSON
```

## Core Endpoint
- `POST /api/manage-from-image`  
  **Body**: `{ "imageUrl": "<dataURL or https://...>", "hints": "optional", "mode": "advice" | "execute" }`  
  **Returns**: `{ position, validated, context, plan }`

## Extended Modules
- **Live WebSocket Aggregator** (`src/services/live.ts`): connect to Polygon Stocks & Options sockets; in-memory bar/quote cache; EventEmitter hooks.
- **Gamma Engine** (`src/services/gamma.ts`): computes net GEX from Option Chain Snapshot; used in `context.ts`.
- **LEAP Recommender** (`src/tools/leaps.ts`): screens for Δ≈0.6, DTE 200–550, low IV context, trend slope (EMA 21>50).

## Deploy on Railway
- Connect your GitHub repo; set env vars in Railway UI.
- (Optional) Use the GitHub Action in `infra/github-actions/railway-deploy.yml`.

## Safety
- Advice-only default; execution requires explicit "Yes, execute".
- Spread% guard, daily R cap, journaling & audit trail (extend `journal.ts` and add DB).
