import { Agent, handoff } from "@openai/agents";
import { parseImageTool } from "../tools/parseImage.js";
import { polygonValidateTool, polygonContextTool } from "../tools/polygon.js";
import { planTool } from "../tools/plan.js";
import { journalTool } from "../tools/journal.js";
import { orderTools } from "../tools/orders.js";

export const quantAgent = new Agent({
  model: process.env.MODEL_REASONING || "gpt-4o",
  instructions: "You are a quantitative trading analyst. Be precise & terse.",
  tools: [parseImageTool, polygonValidateTool, polygonContextTool, planTool]
});

export const coachAgent = new Agent({
  model: process.env.MODEL_REALTIME || "gpt-4o-realtime",
  instructions: "You are a calm trading coach. Speak only at inflection points.",
  tools: [journalTool]
});

export const riskAgent = new Agent({
  model: process.env.MODEL_REASONING || "gpt-4o",
  instructions: "Enforce limits; require explicit confirmation; journal all actions.",
  tools: [journalTool]
});

export const traderAgent = new Agent({
  model: process.env.MODEL_REASONING || "gpt-4o",
  instructions: "Place paper orders and modify stops precisely.",
  tools: orderTools
});

export async function pipeline({ mode, input }: { mode: "advice"|"execute"; input: any }) {
  const analysis = await quantAgent.run(input);
  if (mode === "advice") return handoff(analysis).to(coachAgent);
  if (mode === "execute") return handoff(analysis).to(riskAgent);
}
