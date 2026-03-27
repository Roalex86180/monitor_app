import express from "express";
import cors from "cors";
import trackRouter from "./routes/track";
import metricsRouter from "./routes/metrics";
import authRouter from "./routes/auth";
import { prisma } from "./utils/prisma";

const app = express();
const PORT = process.env.PORT || 3002;

// ─── Middlewares globales ───────────────────────────────────────────────────
app.use(express.json());
app.use(
    cors({
        origin: process.env.DASHBOARD_URL || "http://localhost:5174",
        credentials: true,
    })
);

// ─── Health check — para Render y para el uptime ping de las instancias ────
app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
});



// ─── Rutas ──────────────────────────────────────────────────────────────────
app.use("/track", trackRouter);       // POST /track — recibe eventos de Silver Star
app.use("/metrics", metricsRouter);   // GET  /metrics/* — datos para el dashboard
app.use("/auth", authRouter);         // POST /auth/login — login del dashboard

// ─── Manejo de rutas no encontradas ─────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
    console.log(`Monitor API running on port ${PORT}`);
});