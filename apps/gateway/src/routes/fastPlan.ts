import { Router } from "express";
import { polygonValidateTool, polygonContextTool } from "../tools/polygon.js";
import { fastRulesPlanTool } from "../tools/rules.js";

export const router = Router();

/**
 * POST /api/fast-plan-from-json
 * body: { position: { underlying, expiration, strike, right, quantity, avg_price } }
 */
router.post("/fast-plan-from-json", async (req, res) => {
  try {
    const { position } = req.body || {};
    if (!position?.underlying || !position?.expiration || !position?.strike || !position?.right) {
      return res.status(400).json({ error: "missing_required_fields", required: ["underlying","expiration","strike","right"] });
    }

    const validated = await polygonValidateTool.execute(position);
    const context = await polygonContextTool.execute({ underlying: position.underlying, symbol: validated.symbol });
    const plan = await fastRulesPlanTool.execute({ position: { ...position, ...validated }, context });

    res.json({ position, validated, context, plan, mode: "advice", fast: true });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

