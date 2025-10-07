import { Router } from "express";
import { watchSymbol, unwatchSymbol, getWatchlist } from "../services/watchlist.js";

export const router = Router();

router.get("/watch", (_req, res) => {
  res.json({ watchlist: getWatchlist() });
});

router.post("/watch", async (req, res) => {
  try {
    const { symbol, horizon = "scalp" } = req.body || {};
    if (!symbol) return res.status(400).json({ error: "missing_symbol" });
    const entry = await watchSymbol(symbol, horizon);
    res.json({ ok: true, entry });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

router.delete("/watch/:symbol", async (req, res) => {
  try {
    const removed = await unwatchSymbol(req.params.symbol);
    if (!removed) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});
