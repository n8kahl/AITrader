import WebSocket from "ws";
import { EventEmitter } from "events";

/**
 * Live WebSocket Aggregator for Polygon.io
 * - Stocks: per-second aggregates -> in-memory rolling 1m bars
 * - Options: quotes/trades for specific contracts -> spread/liq metrics
 * 
 * NOTE: This is a starter. You must consult Polygon's WS channel names & payloads.
 */

export class StockAggStream extends EventEmitter {
  private ws?: WebSocket;
  private key: string;
  private tickers: Set<string> = new Set();

  constructor(apiKey: string) {
    super();
    this.key = apiKey;
  }

  connect() {
    this.ws = new WebSocket("wss://socket.polygon.io/stocks");
    this.ws.on("open", () => {
      this.ws?.send(JSON.stringify({ action: "auth", params: this.key }));
      if (this.tickers.size > 0) {
        this.ws?.send(JSON.stringify({ action: "subscribe", params: [...this.tickers].map(t=>`A.${t}`).join(",") }));
      }
      this.emit("status","connected");
    });
    this.ws.on("message", (raw) => {
      try {
        const msgs = JSON.parse(raw.toString());
        for (const m of msgs) this.emit("agg", m); // you can re-aggregate to 1m here
      } catch {}
    });
    this.ws.on("close", ()=> this.emit("status","closed"));
    this.ws.on("error", (e)=> this.emit("error", e));
  }

  subscribe(ticker: string){
    this.tickers.add(ticker);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "subscribe", params: `A.${ticker}` }));
    }
  }
}

export class OptionsQuoteStream extends EventEmitter {
  private ws?: WebSocket;
  private key: string;
  private symbols: Set<string> = new Set();

  constructor(apiKey: string) {
    super();
    this.key = apiKey;
  }

  connect() {
    this.ws = new WebSocket("wss://socket.polygon.io/options");
    this.ws.on("open", () => {
      this.ws?.send(JSON.stringify({ action: "auth", params: this.key }));
      if (this.symbols.size > 0) {
        const params = [...this.symbols].map(s=>`Q.${s}`).join(",");
        this.ws?.send(JSON.stringify({ action: "subscribe", params }));
      }
      this.emit("status","connected");
    });
    this.ws.on("message", (raw) => {
      try {
        const msgs = JSON.parse(raw.toString());
        for (const m of msgs) this.emit("quote", m);
      } catch {}
    });
    this.ws.on("close", ()=> this.emit("status","closed"));
    this.ws.on("error", (e)=> this.emit("error", e));
  }

  subscribe(symbol: string){
    this.symbols.add(symbol);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "subscribe", params: `Q.${symbol}` }));
    }
  }
}
