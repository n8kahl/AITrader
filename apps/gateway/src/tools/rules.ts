import { buildOccSymbol } from "../services/symbol.js";

// Simple, deterministic rules-based plan as a fast fallback
export const fastRulesPlanTool = {
  name: "build_fast_rules_plan",
  description: "Compute a quick management plan using ATR/EM/VWAP heuristics (no LLM).",
  inputSchema: { type: "object", properties: {
    position: { type: "object" },
    context: { type: "object" }
  }, required: ["position","context"] },
  execute: async ({ position, context }: any) => {
    const isCall = String(position.right||'C').toUpperCase()==='C';
    const dir = isCall ? 1 : -1;
    const price = context.price || 0;
    const atr = context.atr || 0;
    const em = context.em || Math.max(atr, price*0.01);
    const vwap = context.vwap || price;

    // Targets: EM ladder (0.5x, 1.0x, 1.5x)
    const t1 = +(price + dir * 0.5 * em).toFixed(2);
    const t2 = +(price + dir * 1.0 * em).toFixed(2);
    const t3 = +(price + dir * 1.5 * em).toFixed(2);

    // Stop logic: ~0.75x ATR for scalps; 1.0x ATR if GEX<0
    const gex = context.gex ?? 0;
    const atrMult = gex < 0 ? 1.0 : 0.75;
    const stopLevel = +(price - dir * atrMult * atr).toFixed(2);

    const invalidations = [
      `Break and hold below ${vwap.toFixed(2)} for 2 bars`,
      `Spread% > ${(process.env.MAX_SPREAD_PCT||'2.5')} or liquidity deteriorates`
    ];

    const plan = {
      intent: "hold",
      entry_logic: `Maintain while above VWAP ${vwap.toFixed(2)}; scale on VWAP reclaim if trend resumes`,
      stop_logic: `Hard stop at ${stopLevel.toFixed(2)} (~${atrMult}x ATR). Trail to VWAP on TP1.`,
      targets: [t1, t2, t3],
      invalidations,
      contracts_suggested: [
        { ticker: buildOccSymbol(position.underlying, position.expiration, position.strike, position.right), why: "Current contract" }
      ],
      voice_script: [
        `Watching VWAP ${vwap.toFixed(2)}; TP1 ${t1}`,
        `TP1 hit; trail to VWAP; eye TP2 ${t2}`
      ],
      confidence: 62
    };
    return plan;
  }
};

