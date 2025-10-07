import fetch from "node-fetch";

const webhook = process.env.DISCORD_WEBHOOK_URL;

export async function sendDiscordMessage(message: string) {
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: message.slice(0, 1900) })
    });
  } catch (err) {
    console.error("discord webhook failed", err);
  }
}
