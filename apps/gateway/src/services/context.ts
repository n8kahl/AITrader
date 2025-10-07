import fetch from "node-fetch";
import { fetchJsonCached } from "../utils/cache.js";
import { computeGEX } from "./gamma.js";
const POLY = "https://api.polygon.io";
const POLY_KEY = process.env.POLYGON_KEY || process.env.POLYGON_API_KEY;

export type Bar = { o:number; h:number; l:number; c:number; v:number; vw?:number; t:number };

export async function getBars(ticker:string, multiplier:number, timespan:string, fr:string, to:string): Promise<Bar[]> {
  const url = `${POLY}/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fr}/${to}?sort=asc&limit=50000&apiKey=${POLY_KEY}`;
  const json: any = await fetchJsonCached(url, 5000);
  return (json.results||[]) as Bar[];
}
export function atr14(bars: Bar[]) {
  const trs = [];
  for (let i=1;i<bars.length;i++) {
    const prev = bars[i-1], cur = bars[i];
    const tr = Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
    trs.push(tr);
  }
  const n = Math.min(14, trs.length);
  if (n===0) return 0;
  return trs.slice(-n).reduce((a,b)=>a+b,0)/n;
}
export function vwap(bars: Bar[]) {
  let pv=0, vv=0;
  for (const b of bars) {
    const typ = (b.h + b.l + b.c)/3;
    pv += typ * b.v;
    vv += b.v;
  }
  return vv>0 ? pv/vv : (bars.at(-1)?.c ?? 0);
}
export function expectedMove(price:number, iv:number) { return price * iv * Math.sqrt(1/365); }

export async function buildContext(underlying: string, optionTicker: string) {
  const today = new Date().toISOString().slice(0,10);
  const dFrom = new Date(Date.now()-27*864e5).toISOString().slice(0,10);

  const intraday = await getBars(underlying, 1, "minute", today, today);
  const daily = await getBars(underlying, 1, "day", dFrom, today);

  const last = intraday.at(-1) || daily.at(-1);
  const price = last?.c ?? 0;
  const atr = atr14(daily);
  const vwap1m = vwap(intraday.slice(-120)); // last ~2h

  const chainUrl = `${POLY}/v3/snapshot/options/${underlying}?apiKey=${POLY_KEY}`;
  const chain: any = await fetchJsonCached(chainUrl, 2000);
  const contract = chain?.results?.find((c:any)=>c.ticker===optionTicker);
  const iv = contract?.implied_volatility ?? 0.25;
  const em = expectedMove(price, iv);

  const gex = computeGEX(chain, price);

  return { price, atr, vwap: vwap1m, iv, em, gex };
}
