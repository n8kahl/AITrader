import { recordJournal } from "../services/journalStore.js";

export const journalTool = {
  name: "journal",
  description: "Persist journal entry for audit.",
  inputSchema: { type:"object", properties:{ text:{type:"string"}, tags:{type:"array","items":{"type":"string"}} }, required:["text"] },
  execute: async ({ text, tags=[] }: any) => {
    recordJournal("journal_tool", { text, tags }).catch(()=>{});
    return { ok: true };
  }
};
