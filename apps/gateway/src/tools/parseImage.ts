import OpenAI from "openai";
import positionSchema from "../schemas/Position.schema.json" with { type: "json" };

export const parseImageTool = {
  name: "parse_position_from_image",
  description: "Extract structured option position from a broker screenshot.",
  inputSchema: { type: "object", properties: {
    image_url: { type: "string" },
    hints: { type: "string" }
  }, required: ["image_url"] },
  execute: async ({ image_url, hints }: any) => {
    const client: any = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const content: any[] = [
      { type: "input_text", text:
        "Extract a single options position (underlying, expiration YYYY-MM-DD, strike, side C/P, qty, avg price). Use screenshot values. If unknown, leave field blank." },
      { type: "input_image", image_url }
    ];
    if (hints) content.push({ type: "input_text", text: `Hints: ${hints}` });

    const resp = await (client as any).responses.create({
      model: process.env.MODEL_REASONING || "gpt-4o",
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", json_schema: { name: "ExtractedOptionPosition", schema: positionSchema as any, strict: true } } }
    } as any);

    return (resp as any).output?.[0]?.content?.[0]?.json;
  }
};
