import OpenAI from "openai";
import positionSchema from "../schemas/Position.schema.json" assert { type: "json" };

export const parseImageTool = {
  name: "parse_position_from_image",
  description: "Extract structured option position from a broker screenshot.",
  inputSchema: { type: "object", properties: {
    image_url: { type: "string" },
    hints: { type: "string" }
  }, required: ["image_url"] },
  execute: async ({ image_url, hints }: any) => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const resp = await client.responses.create({
      model: process.env.MODEL_REASONING || "gpt-4o",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text:
            "Extract a single options position (underlying, expiration YYYY-MM-DD, strike, side C/P, qty, avg price). Use screenshot values. If unknown, leave field blank." },
          { type: "input_image", image_url },
          ...(hints ? [{ type: "input_text", text: `Hints: ${hints}` }] : [])
        ]
      }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "ExtractedOptionPosition", schema: positionSchema as any, strict: true }
      }
    });

    return (resp as any).output?.[0]?.content?.[0]?.json;
  }
};
