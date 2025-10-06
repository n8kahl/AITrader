export const orderTools = [
  {
    name: "preview_order",
    description: "Simulate order with live bid/ask and slippage.",
    inputSchema: { type:"object", properties:{
      symbol:{type:"string"}, side:{type:"string","enum":["BUY","SELL"]},
      qty:{type:"number"}, type:{type:"string","enum":["MKT","LMT"]}, limit:{type:"number"}
    }, required:["symbol","side","qty","type"] },
    execute: async (o:any) => {
      return { estimate: { fill: o.limit ?? 0, fees: 0.0 }, ok: true };
    }
  },
  {
    name: "place_order",
    description: "Place paper order (replace with broker API later).",
    inputSchema: { type:"object", properties:{
      symbol:{type:"string"}, side:{type:"string"}, qty:{type:"number"}, type:{type:"string"}, limit:{type:"number"}
    }, required:["symbol","side","qty","type"] },
    execute: async (o:any) => {
      return { orderId: "paper-" + Date.now(), status: "FILLED", ...o };
    }
  },
  { name: "modify_stop", inputSchema: { type:"object", properties:{ orderId:{type:"string"}, stop:{type:"number"} }, required:["orderId","stop"] }, execute: async (_:any)=>({ok:true}) },
  { name: "flatten_position", inputSchema: { type:"object", properties:{ symbol:{type:"string"} }, required:["symbol"] }, execute: async (_:any)=>({ok:true}) }
];
