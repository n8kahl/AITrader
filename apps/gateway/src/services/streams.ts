import { EventEmitter } from "events";
import { OptionsQuoteStream, StockAggStream } from "./live.js";

const key = process.env.POLYGON_KEY || process.env.POLYGON_API_KEY || "";

export const streamBus = new EventEmitter();

const singletons: { stocks?: StockAggStream; options?: OptionsQuoteStream } = {} as any;
export const lastQuotes = new Map<string, any>();

function ensureOptions() {
  if (!singletons.options) {
    singletons.options = new OptionsQuoteStream(key);
    singletons.options.on("status", (s)=>streamBus.emit("status", { kind:"options", status:s }));
    singletons.options.on("error", (e)=>streamBus.emit("error", { kind:"options", error:String(e) }));
    singletons.options.on("quote", (q:any)=>{
      const sym = q?.sym || q?.i || q?.ticker;
      if (sym) lastQuotes.set(sym, q);
      streamBus.emit("quote", q);
    });
    singletons.options.connect();
  }
  return singletons.options;
}

export function subscribeOption(symbol: string) {
  const opts = ensureOptions();
  opts.subscribe(symbol);
  return { subscribed: symbol };
}

function ensureStocks() {
  if (!singletons.stocks) {
    singletons.stocks = new StockAggStream(key);
    singletons.stocks.on("status", (s)=>streamBus.emit("status", { kind:"stocks", status:s }));
    singletons.stocks.on("error", (e)=>streamBus.emit("error", { kind:"stocks", error:String(e) }));
    singletons.stocks.on("agg", (agg:any)=>{
      streamBus.emit("agg", agg);
    });
    singletons.stocks.connect();
  }
  return singletons.stocks;
}

export function subscribeStock(ticker: string) {
  const stocks = ensureStocks();
  stocks.subscribe(ticker);
  return { subscribed: ticker };
}
