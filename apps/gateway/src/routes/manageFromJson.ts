import { Router } from "express";
import { polygonValidateTool, polygonContextTool } from "../tools/polygon.js";
import { planTool } from "../tools/plan.js";

export const router = Router();

/**
 * POST /api/manage-from-json
 * body: { position: { underlying, expiration, strike, right, quantity, avg_price }, mode?: "advice"|"execute" }
 */
router.post("/manage-from-json", async (req, res) => {
  try {
    const { position, mode = "advice" } = req.body || {};
    const polygonKey = process.env.POLYGON_KEY || process.env.POLYGON_API_KEY;
    if (!polygonKey) {
      return res.status(400).json({
        error: "missing_polygon_key",
        message: "Set POLYGON_KEY (or POLYGON_API_KEY) in your environment to use Polygon validation.",
      });
    }
    if (!position?.underlying || !position?.expiration || !position?.strike || !position?.right) {
      return res.status(400).json({ error: "missing_required_fields", required: ["underlying","expiration","strike","right"] });
    }

    const validated = await polygonValidateTool.execute({
      underlying: position.underlying,
      expiration: position.expiration,
      strike: position.strike,
      right: position.right,
    });

    const context = await polygonContextTool.execute({
      underlying: position.underlying,
      symbol: validated.symbol,
    });

    let plan: any = null;
    if (process.env.OPENAI_API_KEY) {
      try {
        plan = await planTool.execute({ position: { ...position, ...validated }, context });
      } catch (err:any) {
        plan = { disabled: true, reason: `plan_generation_failed: ${err?.message || 'unknown_error'}` };
      }
    } else {
      plan = { disabled: true, reason: "OPENAI_API_KEY is not set; plan generation is disabled. Set the key to enable plans." };
    }
    res.json({ position, validated, context, plan, mode });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});
