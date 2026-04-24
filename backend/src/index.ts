import express from "express";
import { createServer } from "http";
import { runMigrations } from "./db/migrations";
import { initWebSocketServer } from "./ws/server";
import tilesRouter from "./routes/tiles";
import linksRouter from "./routes/links";
import sectionsRouter from "./routes/sections";
import notesRouter from "./routes/notes";
import settingsRouter from "./routes/settings";
import faviconRouter from "./routes/favicon";
import exportRouter from "./routes/export";
import dashboardRouter from "./routes/dashboard";
import tagsRouter from "./routes/tags";

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use("/api/tiles", tilesRouter);
app.use("/api/links", linksRouter);
app.use("/api/sections", sectionsRouter);
app.use("/api/notes", notesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/favicon", faviconRouter);
app.use("/api/tags", tagsRouter);
app.use("/api", exportRouter);
app.use("/api/dashboard", dashboardRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const server = createServer(app);
initWebSocketServer(server);
runMigrations();

const port = parseInt(process.env.PORT ?? "3001", 10);
server.listen(port, () => {
  console.log(`TheDash backend running on port ${port}`);
});
