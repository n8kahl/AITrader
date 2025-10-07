import { lastQuotes, streamBus } from "./streams.js";
import { getWatchEntry } from "./watchlist.js";
import { recordJournal } from "./journalStore.js";
import { sendDiscordMessage } from "./discord.js";

export type OrderSide = "BUY" | "SELL" | "BUY_TO_OPEN" | "SELL_TO_CLOSE" | "SELL_TO_OPEN" | "BUY_TO_CLOSE";
export type OrderType = "MKT" | "LMT";

export interface OrderIntent {
  symbol: string;
  occ?: string;
  side: OrderSide;
  qty: number;
  type: OrderType;
  limit?: number;
  horizon?: string;
  tag?: string;
}

export interface OrderPreview {
  intent: OrderIntent;
  quote: { bid: number; ask: number; mid: number; spreadPct: number };
  liquidity: number;
  openPositions: number;
  guards: { ok: boolean; reasons: string[]; details: Record<string, any> };
  estimateFill: number;
  notional: number;
}

export interface OrderRecord extends OrderPreview {
  id: string;
  status: "FILLED" | "REJECTED";
  createdAt: number;
}

const orders: OrderRecord[] = [];
const exposure = new Map<string, number>();
let dailyNotional = 0;
let dailyAnchor = new Date().toDateString();

function resetDailyIfNeeded() {
  const today = new Date().toDateString();
  if (today !== dailyAnchor) {
    dailyAnchor = today;
    dailyNotional = 0;
  }
}

function getConfig() {
  return {
    maxSpread: Number(process.env.MAX_SPREAD_PCT ?? 2.5),
    minLiquidity: Number(process.env.MIN_LIQUIDITY_SCORE ?? 0),
    maxPositions: Number(process.env.MAX_OPEN_POSITIONS ?? 99),
    dailyLimit: Number(process.env.DAILY_R_LIMIT ?? process.env.MAX_DAILY_R ?? Infinity)
  };
}

function getQuote(intent: OrderIntent) {
  const key = intent.occ || intent.symbol;
  const q = lastQuotes.get(key);
  const bid = q?.bid ?? q?.b ?? 0;
  const ask = q?.ask ?? q?.a ?? 0;
  const mid = bid && ask ? (bid + ask) / 2 : (q?.price ?? q?.p ?? intent.limit ?? 0);
  const spread = bid && ask ? ((ask - bid) / ((ask + bid) / 2)) * 100 : 0;
  return { bid, ask, mid, spreadPct: Number(spread.toFixed(3)) };
}

function getMultiplier(intent: OrderIntent) {
  return intent.occ ? 100 : 1;
}

function direction(side: OrderSide) {
  const up = ["BUY", "BUY_TO_OPEN", "BUY_TO_CLOSE"];
  const down = ["SELL", "SELL_TO_CLOSE", "SELL_TO_OPEN"];
  if (up.includes(side)) return 1;
  if (down.includes(side)) return -1;
  return 0;
}

function currentOpenCount() {
  let count = 0;
  for (const val of exposure.values()) {
    if (val !== 0) count++;
  }
  return count;
}

export function listOrders() {
  return orders.slice().reverse();
}

export function previewOrder(intent: OrderIntent): OrderPreview {
  const cfg = getConfig();
  resetDailyIfNeeded();
  const quote = getQuote(intent);
  const multiplier = getMultiplier(intent);
  const fill = intent.type === "LMT" && intent.limit ? intent.limit : (quote.mid || intent.limit || quote.ask || quote.bid || 0);
  const notional = Math.abs(fill * intent.qty * multiplier);

  const watch = getWatchEntry(intent.symbol) || getWatchEntry(intent.occ || "");
  const liquidity = watch?.lastSnapshot?.liquidity ?? 100;
  const spreadPct = quote.spreadPct ?? 0;
  const openPositions = currentOpenCount();

  const reasons: string[] = [];
  if (spreadPct > cfg.maxSpread) reasons.push("spread_exceeds_limit");
  if (liquidity < cfg.minLiquidity) reasons.push("liquidity_too_low");
  const dir = direction(intent.side);
  if (dir > 0 && openPositions >= cfg.maxPositions) reasons.push("max_positions_reached");
  if (dailyNotional + notional > cfg.dailyLimit * 1000 && Number.isFinite(cfg.dailyLimit)) reasons.push("daily_notional_limit");

  return {
    intent,
    quote,
    liquidity,
    openPositions,
    guards: { ok: reasons.length === 0, reasons, details: { maxSpread: cfg.maxSpread, minLiquidity: cfg.minLiquidity, maxPositions: cfg.maxPositions, dailyLimit: cfg.dailyLimit } },
    estimateFill: Number(fill.toFixed(4)),
    notional
  };
}

export function placeOrder(intent: OrderIntent, confirm = false) {
  const preview = previewOrder(intent);
  if (!confirm) {
    return { requires_confirmation: true, preview };
  }
  if (!preview.guards.ok) {
    return { error: "risk_guard_triggered", preview };
  }

  const id = `paper-${Date.now()}`;
  const record: OrderRecord = {
    id,
    status: "FILLED",
    createdAt: Date.now(),
    ...preview
  };
  orders.push(record);

  const dir = direction(intent.side);
  const key = intent.symbol.toUpperCase();
  const prev = exposure.get(key) ?? 0;
  exposure.set(key, prev + dir * intent.qty);
  dailyNotional += record.notional;

  recordJournal("order_filled", { order: record }).catch(()=>{});
  streamBus.emit("order.update", { order: record });
  sendDiscordMessage(`🧾 ${intent.side} ${intent.qty} ${intent.symbol} @ ${record.estimateFill.toFixed(2)} (notional ~$${Math.round(record.notional)})`).catch(()=>{});
  return { order: record };
}
