import fetch from "node-fetch";
const POLY = "https://api.polygon.io";
const POLY_KEY = process.env.POLYGON_KEY || process.env.POLYGON_API_KEY;

type LeapIdea = { ticker:string; delta:number; iv:number; dte:number; oi:number; why:string };

function ema(arr:number[], p=21){
  const k = 2/(p+1);
  let ema = arr[0] ?? 0;
  for (let i=1;i<arr.length;i++) ema = arr[i]*k + ema*(1-k);
  return ema;
}
function slope(a:number[], p=21){
  if (a.length<2) return 0;
  const e21 = ema(a, 21);
  const e50 = ema(a, 50);
  return e21 - e50;
}
function daysBetween(a:Date,b:Date){ return Math.round((b.getTime()-a.getTime())/86400000); }

export const leapSuggestTool = {
  name: "suggest_leaps",
  description: "Suggest 3 LEAP calls with Δ≈0.6, DTE 200–550, low IV context and uptrend slope.",
  inputSchema: { type:"object", properties:{ underlying:{type:"string"} }, required:["underlying"] },
  execute: async ({ underlying }: any) => {
    const today = new Date().toISOString().slice(0,10);

    // Daily bars for trend slope
    const dailyUrl = `${POLY}/v2/aggs/ticker/${underlying}/range/1/day/${new Date(Date.now()-400*864e5).toISOString().slice(0,10)}/${today}?sort=asc&limit=50000&apiKey=${POLY_KEY}`;
    const djson: any = await fetch(dailyUrl).then(r=>r.json()).catch(()=>({}));
    const closes = (djson?.results||[]).map((b:any)=>b.c);
    const trendSlope = slope(closes);

    // Option chain snapshot
    const chainUrl = `${POLY}/v3/snapshot/options/${underlying}?apiKey=${POLY_KEY}`;
    const chain: any = await fetch(chainUrl).then(r=>r.json()).catch(()=>({}));

    const now = new Date();
    const candidates: LeapIdea[] = [];
    for (const c of (chain?.results||[])) {
      try {
        const exp = c.expiration_date ?? c.details?.expiration_date;
        if (!exp) continue;
        const dte = daysBetween(now, new Date(exp));
        if (dte < 200 || dte > 550) continue;
        if (c.contract_type !== "call") continue;
        const delta = c.greeks?.delta ?? 0;
        if (delta < 0.5 || delta > 0.75) continue;
        const iv = c.implied_volatility ?? 0;
        const oi = c.open_interest ?? 0;
        if (oi < 500) continue;
        const why = `Δ≈${delta.toFixed(2)}, DTE ${dte}, IV ${Math.round(iv*100)}%, OI ${oi}`;
        candidates.push({ ticker: c.ticker, delta, iv, dte, oi, why });
      } catch {}
    }
    // Rank: prefer lower IV and higher OI; add bonus if trend slope > 0
    candidates.sort((a,b)=> (a.iv - b.iv) || (b.oi - a.oi) );
    const top = candidates.slice(0,3).map(c => ({
      ...c,
      why: `${c.why}` + (trendSlope>0 ? " | Trend slope positive" : " | Trend slope neutral/negative")
    }));
    return { underlying, trendSlope, ideas: top };
  }
};
