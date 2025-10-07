import { streamBus, subscribeOption, subscribeStock } from "./streams.js";
import { computeSnapshot, Snapshot } from "./metrics.js";
import { recordJournal } from "./journalStore.js";
import { updateSignal } from "./signals.js";

type WatchEntry = {
  symbol: string;
  horizon: string;
  lastSnapshot?: Snapshot;
  lastUpdated?: number;
};

const watchlist = new Map<string, WatchEntry>();
let polling = false;

function normalizeSymbol(symbol: string) {
  return symbol?.trim()?.toUpperCase();
}

export async function watchSymbol(symbol: string, horizon = "scalp") {
  const norm = normalizeSymbol(symbol);
  if (!norm) throw new Error("invalid_symbol");
  const entry = watchlist.get(norm) ?? { symbol: norm, horizon };
  entry.horizon = horizon;
  watchlist.set(norm, entry);

  if (norm.includes(":")) {
    subscribeOption(norm);
  } else {
    subscribeStock(norm);
  }

  streamBus.emit("watch.update", { symbol: norm, horizon, state: "added" });
  const snapshot = await computeSnapshot(norm, horizon);
  entry.lastSnapshot = snapshot;
  entry.lastUpdated = Date.now();
  streamBus.emit("signal.update", { symbol: norm, snapshot });
  updateSignal(snapshot);
  recordJournal("watch_added", { symbol: norm, horizon, snapshot }).catch(()=>{});
  startPolling();
  return entry;
}

export async function unwatchSymbol(symbol: string) {
  const norm = normalizeSymbol(symbol);
  if (!norm) return false;
  const removed = watchlist.delete(norm);
  if (removed) {
    streamBus.emit("watch.update", { symbol: norm, state: "removed" });
    recordJournal("watch_removed", { symbol: norm }).catch(()=>{});
  }
  return removed;
}

export function getWatchlist() {
  return Array.from(watchlist.values());
}

export function getWatchEntry(symbol: string) {
  return watchlist.get(normalizeSymbol(symbol));
}

async function pollSnapshots() {
  if (polling) return;
  polling = true;
  try {
    for (const entry of watchlist.values()) {
      try {
        const snapshot = await computeSnapshot(entry.symbol, entry.horizon);
        entry.lastSnapshot = snapshot;
        entry.lastUpdated = Date.now();
        streamBus.emit("signal.update", { symbol: entry.symbol, snapshot });
        updateSignal(snapshot);
        recordJournal("signal_snapshot", { symbol: entry.symbol, snapshot }).catch(()=>{});
      } catch (err) {
        streamBus.emit("error", { kind: "snapshot", symbol: entry.symbol, error: String(err) });
      }
    }
  } finally {
    polling = false;
  }
}

function startPolling() {
  if ((globalThis as any).__WATCHLIST_POLLING_STARTED__) return;
  const interval = Number(process.env.WATCH_POLL_MS || 5000);
  setInterval(() => {
    if (watchlist.size === 0) return;
    pollSnapshots().catch(()=>{});
  }, interval).unref?.();
  (globalThis as any).__WATCHLIST_POLLING_STARTED__ = true;
}
