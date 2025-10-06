export const journalTool = {
  name: "journal",
  description: "Persist journal entry for audit.",
  inputSchema: { type:"object", properties:{ text:{type:"string"}, tags:{type:"array","items":{"type":"string"}} }, required:["text"] },
  execute: async ({ text, tags=[] }: any) => {
    // TODO: swap for Postgres insert if DATABASE_URL set
    console.log("[JOURNAL]", new Date().toISOString(), text, tags);
    return { ok: true };
  }
};
