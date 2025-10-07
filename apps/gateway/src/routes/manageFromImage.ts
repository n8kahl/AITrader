import { Router } from "express";
import { parseImageTool } from "../tools/parseImage.js";
import { polygonValidateTool, polygonContextTool } from "../tools/polygon.js";
import { planTool } from "../tools/plan.js";
// If you wire Agents SDK orchestration later, import pipeline() from agents.

export const router = Router();

router.post("/manage-from-image", async (req, res) => {
  try {
    const { imageUrl, hints, mode="advice" } = req.body;
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({
        error: "missing_openai_key",
        message: "OPENAI_API_KEY is not set. Use /api/manage-from-json to supply a typed position, or add your key to parse screenshots.",
      });
    }

    const parsed = await parseImageTool.execute({ image_url: imageUrl, hints });
    if (!parsed?.underlying) {
      return res.status(422).json({ error: "parse_failed", parsed });
    }

    const validated = await polygonValidateTool.execute({
      underlying: parsed.underlying,
      expiration: parsed.expiration,
      strike: parsed.strike,
      right: parsed.right
    });

    const context = await polygonContextTool.execute({
      underlying: parsed.underlying, symbol: validated.symbol
    });

    const plan = await planTool.execute({ position: { ...parsed, ...validated }, context });

    // For now, return plan directly. You can handoff to Agents (coach/risk) later.
    res.json({ position: parsed, validated, context, plan, mode });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});
