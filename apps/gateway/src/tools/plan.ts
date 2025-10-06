import OpenAI from "openai";
import planSchema from "../schemas/ManagementPlan.schema.json" assert { type: "json" };

export const planTool = {
  name: "build_management_plan",
  description: "Produce a stops/targets plan + hedges using context.",
  inputSchema: { type: "object", properties: {
    position: { type:"object" }, context: { type:"object" }
  }, required:["position","context"] },
  execute: async ({ position, context }: any) => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const resp = await client.responses.create({
      model: process.env.MODEL_REASONING || "gpt-4o",
      input: [{
        role: "user",
        content: [{ type: "input_text", text:
`You are a professional options risk manager.
Position: ${JSON.stringify(position)}
Market Context: ${JSON.stringify(context)}
Rules:
- If GEX<0 → expect volatility expansion; widen EM targets; stops >= 1x ATR for swings, 0.75x for scalps.
- If IV percentile is high, prefer debit/credit spreads; if low, allow single-leg buy.
Return a crisp plan with intent, stop logic, TP ladder, invalidations, and 1-2 alternative contracts (ticker + why).` }]
      }],
      response_format: { type:"json_schema", json_schema: { name:"ManagementPlan", schema: planSchema as any, strict:true } }
    });
    return (resp as any).output?.[0]?.content?.[0]?.json;
  }
};
