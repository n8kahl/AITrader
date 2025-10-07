import { Router } from "express";
import { streamBus, lastQuotes } from "../services/streams.js";

export const router = Router();

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event:string, data:any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onQuote = (q:any) => send("quote", q);
  const onStatus = (s:any) => send("status", s);

  streamBus.on("quote", onQuote);
  streamBus.on("status", onStatus);

  // Warm start: dump a small snapshot of recent quotes
  for (const [sym, q] of Array.from(lastQuotes.entries()).slice(0,10)) {
    send("quote", { sym, ...q });
  }

  const heartbeat = setInterval(()=> send("ping", { ts: Date.now() }), 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    streamBus.off("quote", onQuote);
    streamBus.off("status", onStatus);
  });
});

