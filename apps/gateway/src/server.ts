import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { router as manageFromImage } from "./routes/manageFromImage.js";
import { router as health } from "./routes/health.js";
import { router as manageFromJson } from "./routes/manageFromJson.js";
import { router as fastPlan } from "./routes/fastPlan.js";
import { router as events } from "./routes/events.js";
import { router as watch } from "./routes/watch.js";
import { bearerAuth } from "./middleware/auth.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(bearerAuth);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use("/", express.static(path.join(__dirname, "../public")));

app.use("/api", manageFromImage);
app.use("/api", manageFromJson);
app.use("/api", fastPlan);
app.use("/api", watch);
app.use("/api", events);
app.use("/api", health);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🚀 options-copilot listening on :${port}`));
