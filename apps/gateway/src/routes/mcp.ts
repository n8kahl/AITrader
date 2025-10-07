import { Router } from "express";
import { subscribeOption } from "../services/streams.js";
import { polygonValidateTool, polygonContextTool } from "../tools/polygon.js";
import { parseImageTool } from "../tools/parseImage.js";
import { planTool } from "../tools/plan.js";
import { fastRulesPlanTool } from "../tools/rules.js";

export const router = Router();

// 1) polygon.subscribe
router.post("/mcp/polygon.subscribe", async (req, res) => {
  try {
    const { symbol } = req.body || {};
    if (!symbol) return res.status(400).json({ error: "missing_symbol" });
    const out = subscribeOption(symbol);
    res.json({ cluster: "options", subscribed: [symbol], last: out });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

// 2) context.snapshot
router.post("/mcp/context.snapshot", async (req, res) => {
  try {
    const { symbol, horizon = "scalp" } = req.body || {};
    if (!symbol) return res.status(400).json({ error: "missing_symbol" });
    // Reuse existing builder with a proxy option symbol if not supplied
    const proxyOption = req.body?.occ || undefined;
    const ctx = await polygonContextTool.execute({ underlying: symbol, symbol: proxyOption ?? `O:${symbol}000000P00000000` });
    const snapshot = {
      symbol, ts: Date.now(), horizon,
      tf: { "1m": { price: ctx.price, vwap: ctx.vwap, trend: ctx.price >= ctx.vwap ? "up" : "down" } },
      rvol: 1.0,
      liquidity: 100,
      key_levels: { vwap: ctx.vwap },
      gamma: { gex: ctx.gex },
      confluence: Number((ctx.price >= ctx.vwap)) + Number((ctx.gex>0)) + Number((ctx.iv<0.5))
    };
    res.json(snapshot);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

// 3) position.parse_from_image
router.post("/mcp/position.parse_from_image", async (req, res) => {
  try {
    const { image, hints } = req.body || {};
    const parsed = await parseImageTool.execute({ image_url: image, hints });
    res.json(parsed);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

// 4) plan.generate
router.post("/mcp/plan.generate", async (req, res) => {
  try {
    const { symbol, horizon = "scalp", position } = req.body || {};
    if (!symbol && !position?.underlying) return res.status(400).json({ error: "missing_symbol" });
    const underlying = symbol || position.underlying;
    const validated = position?.right ? await polygonValidateTool.execute(position) : { symbol: undefined } as any;
    const context = await polygonContextTool.execute({ underlying, symbol: validated.symbol || `O:${underlying}000000P00000000` });
    let plan: any;
    if (process.env.OPENAI_API_KEY) {
      try {
        plan = await planTool.execute({ position: { ...(position||{}), ...validated }, context });
      } catch {
        plan = await fastRulesPlanTool.execute({ position: { ...(position||{}), ...validated }, context });
        plan.fallback = true;
      }
    } else {
      plan = await fastRulesPlanTool.execute({ position: { ...(position||{}), ...validated }, context });
      plan.fallback = true;
    }
    res.json({ symbol: underlying, horizon, context, plan });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

// 5) orders.place (stub)
router.post("/mcp/orders.place", async (req, res) => {
  try {
    const { intent } = req.body || {};
    res.json({ ok: true, order_id: "paper-"+Date.now(), intent });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

