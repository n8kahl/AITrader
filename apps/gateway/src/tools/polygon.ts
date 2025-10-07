import fetch from "node-fetch";
import { buildOccSymbol } from "../services/symbol.js";
import { buildContext } from "../services/context.js";
import { fetchJsonCached } from "../utils/cache.js";

const POLY = "https://api.polygon.io";
const POLY_KEY = process.env.POLYGON_KEY || process.env.POLYGON_API_KEY;

export const polygonValidateTool = {
  name: "validate_position",
  description: "Validate position & get contract meta from Polygon.",
  inputSchema: { type: "object", properties: {
    underlying:{type:"string"}, expiration:{type:"string"}, strike:{type:"number"}, right:{type:"string"}
  }, required: ["underlying","expiration","strike","right"] },
  execute: async ({ underlying, expiration, strike, right }: any) => {
    const symbol = buildOccSymbol(underlying, expiration, strike, right); // O:AAPL260116C00025000
    const metaUrl = `${POLY}/v3/reference/options/contracts/${encodeURIComponent(symbol)}?apiKey=${POLY_KEY}`;
    const meta: any = await fetchJsonCached(metaUrl, 10000);

    const chainUrl = `${POLY}/v3/snapshot/options/${underlying}?apiKey=${POLY_KEY}`;
    const chain: any = await fetchJsonCached(chainUrl, 1500);
    const contract = chain?.results?.find((c:any)=>c.ticker===symbol);
    const bid = contract?.last_quote?.bid ?? contract?.day?.bid ?? 0;
    const ask = contract?.last_quote?.ask ?? contract?.day?.ask ?? 0;
    const mid = (bid>0 && ask>0) ? (bid+ask)/2 : (contract?.last_trade?.price ?? 0);
    const spreadPct = (bid>0 && ask>0) ? ((ask - bid) / ((ask+bid)/2)) * 100 : 0;

    return { symbol, meta, contract, quote: { bid, ask, mid, spreadPct } };
  }
};

export const polygonContextTool = {
  name: "build_market_context",
  description: "Compute ATR/VWAP/EM and (optional) gamma exposure from Polygon data.",
  inputSchema: { type: "object", properties: {
    underlying:{type:"string"}, symbol:{type:"string"}
  }, required: ["underlying","symbol"] },
  execute: async ({ underlying, symbol }: any) => {
    const ctx = await buildContext(underlying, symbol);
    return ctx;
  }
};
