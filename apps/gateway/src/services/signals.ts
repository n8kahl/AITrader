import { Snapshot } from "./metrics.js";
import { streamBus } from "./streams.js";
import { recordJournal } from "./journalStore.js";
import { sendDiscordMessage } from "./discord.js";

type SignalState = "forming" | "confirmed" | "invalidated" | "idle";

type SignalRecord = {
  symbol: string;
  horizon: string;
  state: SignalState;
  score: number;
  lastSnapshot?: Snapshot;
  updatedAt: number;
};

const signals = new Map<string, SignalRecord>();

function keyOf(snapshot: Snapshot) {
  return `${snapshot.symbol}:${snapshot.horizon}`;
}

function determineState(score: number, prev?: SignalRecord): SignalState {
  if (score >= 4) return "confirmed";
  if (score >= 3) return prev?.state === "confirmed" ? "confirmed" : "forming";
  if (score <= 1) return "invalidated";
  return "forming";
}

export function updateSignal(snapshot: Snapshot) {
  const key = keyOf(snapshot);
  const prev = signals.get(key);
  const state = determineState(snapshot.confluence, prev);
  const record: SignalRecord = {
    symbol: snapshot.symbol,
    horizon: snapshot.horizon,
    state,
    score: snapshot.confluence,
    lastSnapshot: snapshot,
    updatedAt: Date.now()
  };
  signals.set(key, record);

  const changed = !prev || prev.state !== state || prev.score !== snapshot.confluence;
  if (changed) {
    streamBus.emit("signal.update", { symbol: snapshot.symbol, horizon: snapshot.horizon, state, score: snapshot.confluence, snapshot });
    recordJournal("signal_state", { symbol: snapshot.symbol, horizon: snapshot.horizon, state, score: snapshot.confluence }).catch(()=>{});
    if (state === "confirmed") {
      sendDiscordMessage(`✅ ${snapshot.symbol} (${snapshot.horizon}) confirmed signal — score ${snapshot.confluence}`).catch(()=>{});
    } else if (state === "invalidated" && prev && prev.state === "confirmed") {
      sendDiscordMessage(`⚠️ ${snapshot.symbol} (${snapshot.horizon}) signal invalidated`).catch(()=>{});
    }
  }
  return record;
}

export function getSignal(symbol: string, horizon = "scalp") {
  return signals.get(`${symbol.toUpperCase()}:${horizon}`);
}

export function listSignals() {
  return Array.from(signals.values());
}
