import { previewOrder, placeOrder } from "../services/orders.js";

export const orderTools = [
  {
    name: "preview_order",
    description: "Preview order with live quotes and risk guard evaluation.",
    inputSchema: { type:"object", properties:{
      symbol:{type:"string"}, occ:{type:"string"}, side:{type:"string"},
      qty:{type:"number"}, type:{type:"string","enum":["MKT","LMT"]}, limit:{type:"number"}, horizon:{type:"string"}
    }, required:["symbol","side","qty","type"] },
    execute: async (intent:any) => previewOrder(intent)
  },
  {
    name: "place_order",
    description: "Place paper order (requires confirm=true).",
    inputSchema: { type:"object", properties:{
      symbol:{type:"string"}, occ:{type:"string"}, side:{type:"string"},
      qty:{type:"number"}, type:{type:"string"}, limit:{type:"number"}, confirm:{type:"boolean"}
    }, required:["symbol","side","qty","type"] },
    execute: async ({ confirm = false, ...intent }: any) => placeOrder(intent, confirm === true)
  },
  { name: "modify_stop", inputSchema: { type:"object", properties:{ orderId:{type:"string"}, stop:{type:"number"} }, required:["orderId","stop"] }, execute: async (_:any)=>({ok:true}) },
  { name: "flatten_position", inputSchema: { type:"object", properties:{ symbol:{type:"string"} }, required:["symbol"] }, execute: async (_:any)=>({ok:true}) }
];
