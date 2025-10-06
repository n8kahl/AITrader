import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const GATEWAY = process.env.GATEWAY_URL || "http://localhost:8080";

client.on("messageCreate", async (m) => {
  if (m.author.bot) return;
  if (!m.content.startsWith("!manage")) return;
  const attachment = m.attachments.first();
  if (!attachment) return m.reply("Attach a screenshot with `!manage`.");
  const imageUrl = attachment.url;
  const resp = await fetch(`${GATEWAY}/api/manage-from-image`, {
    method: "POST", headers: { "content-type":"application/json" },
    body: JSON.stringify({ imageUrl, mode: "advice" })
  });
  const plan = await resp.json();
  await m.reply("Plan:\n```json\n"+JSON.stringify(plan.plan,null,2)+"\n```");
});

client.login(process.env.DISCORD_BOT_TOKEN);
