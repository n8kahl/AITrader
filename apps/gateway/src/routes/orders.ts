import { Router } from "express";
import { previewOrder, placeOrder } from "../services/orders.js";

export const router = Router();

router.post("/orders/preview", (req, res) => {
  try {
    const { intent } = req.body || {};
    if (!intent?.symbol || !intent?.side || !intent?.qty || !intent?.type) {
      return res.status(400).json({ error: "missing_fields", required: ["intent.symbol","intent.side","intent.qty","intent.type"] });
    }
    const preview = previewOrder(intent);
    res.json(preview);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});

router.post("/orders/place", (req, res) => {
  try {
    const { intent, confirm = false } = req.body || {};
    if (!intent?.symbol || !intent?.side || !intent?.qty || !intent?.type) {
      return res.status(400).json({ error: "missing_fields", required: ["intent.symbol","intent.side","intent.qty","intent.type"] });
    }
    const result = placeOrder(intent, confirm);
    res.json(result);
  } catch (e:any) {
    res.status(500).json({ error: e?.message || "internal_error" });
  }
});
