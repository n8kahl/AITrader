import { getBars, vwap, atr14, expectedMove, buildContext, Bar } from "./context.js";
import { fetchJsonCached } from "../utils/cache.js";

type AggregatedBar = { t:number; o:number; h:number; l:number; c:number; v:number };

function ema(values: number[], period: number) {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let emaVal = values[0];
  for (let i = 1; i < values.length; i++) {
    emaVal = values[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function aggregate(bars: Bar[], size: number): AggregatedBar[] {
  const out: AggregatedBar[] = [];
  for (let i = 0; i < bars.length; i += size) {
    const chunk = bars.slice(i, i + size);
    if (!chunk.length) continue;
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const high = Math.max(...chunk.map(b => b.h));
    const low = Math.min(...chunk.map(b => b.l));
    const volume = chunk.reduce((sum, b) => sum + b.v, 0);
    out.push({ t: last.t, o: first.o, h: high, l: low, c: last.c, v: volume });
  }
  return out;
}

function calcRVOL(bars: Bar[], windowCount = 30) {
  if (bars.length < windowCount) return 1;
  const recent = bars.slice(-windowCount);
  const recentVol = recent.reduce((sum, b) => sum + b.v, 0);
  const avgVol = bars.reduce((sum, b) => sum + b.v, 0) / bars.length;
  const expected = avgVol * windowCount;
  return expected > 0 ? recentVol / expected : 1;
}

export type Snapshot = {
  symbol: string;
  horizon: string;
  ts: number;
  price: number;
  atr: number;
  em: number;
  tf: Record<string, any>;
  rvol: number;
  liquidity: number;
  levels: Record<string, number>;
  gamma: number;
  confluence: number;
};

export async function computeSnapshot(symbol: string, horizon: string) {
  const upperSymbol = symbol.toUpperCase();
  const today = new Date().toISOString().slice(0, 10);
  const intradayFrom = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const dailyFrom = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);

  const [bars1m, daily] = await Promise.all([
    getBars(upperSymbol, 1, "minute", intradayFrom, today),
    getBars(upperSymbol, 1, "day", dailyFrom, today)
  ]);

  const recent1m = bars1m.slice(-240) || [];
  const lastBar = recent1m.at(-1);
  const price = lastBar?.c ?? daily.at(-1)?.c ?? 0;
  const vwap1m = vwap(recent1m);
  const ema21 = ema(recent1m.map(b => b.c), 21);
  const ema50 = ema(recent1m.map(b => b.c), 50);
  const trend1m = price >= ema21 ? "up" : "down";

  const bars15 = aggregate(recent1m, 15);
  const ema15_21 = ema(bars15.map(b => b.c), 21);
  const ema15_50 = ema(bars15.map(b => b.c), 50);
  const trend15 = ema15_21 >= ema15_50 ? "up" : "down";

  const atr = atr14(daily);
  const gContext = await buildContext(upperSymbol, `O:${upperSymbol}000000P00000000`);
  const em = gContext.em ?? expectedMove(price, gContext.iv ?? 0.25);
  const gex = gContext.gex ?? 0;
  const rvol = calcRVOL(recent1m);
  const liquidity = Math.min(100, Math.round((recent1m.slice(-5).reduce((s, b) => s + b.v, 0) / 1000)));

  const dailyLast = daily.at(-1);
  const levels = {
    vwap: Number(vwap1m.toFixed(2)),
    daily_high: dailyLast?.h ?? 0,
    daily_low: dailyLast?.l ?? 0,
    prev_close: daily.slice(-2, -1)?.[0]?.c ?? dailyLast?.c ?? 0
  };

  const confluence = [
    price >= ema21,
    ema21 >= ema50,
    price >= vwap1m,
    rvol > 1,
    gex > 0
  ].reduce((score, condition) => score + (condition ? 1 : 0), 0);

  const snapshot: Snapshot = {
    symbol: upperSymbol,
    horizon,
    ts: Date.now(),
    price,
    atr,
    em,
    tf: {
      "1m": { price, vwap: vwap1m, ema21, ema50, trend: trend1m },
      "15m": { ema21: ema15_21, ema50: ema15_50, trend: trend15 }
    },
    rvol,
    liquidity,
    levels,
    gamma: gex,
    confluence
  };

  return snapshot;
}
