import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { dashboardAuth } from "../middleware/auth";
import { JsonValue } from '@prisma/client/runtime/library'


interface EventRecord {
    eventType: string;
    payload: JsonValue;
    createdAt: Date;
}

const router = Router();

// Todas las rutas de métricas requieren JWT del dashboard
router.use(dashboardAuth);

// GET /metrics/summary
// Resumen del día para todos los tenants — el widget principal del dashboard
router.get("/summary", async (_req: Request, res: Response) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    try {
        const tenants = await prisma.tenant.findMany({
            select: {
                id: true,
                name: true,
                url: true,
                lastSeenAt: true,
            },
        });

        const summaries = await Promise.all(
            tenants.map(async (tenant: { id: string; name: string; url: string; lastSeenAt: Date | null }) => {
                // Traer todos los eventos del día para este tenant
                const events: EventRecord[] = await prisma.event.findMany({
                    where: {
                        tenantId: tenant.id,
                        createdAt: { gte: startOfDay },
                    },
                    select: { eventType: true, payload: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                });

                // Calcular métricas de IA
                const aiSuccess = events.filter(
                    (e) => e.eventType === "ai.query.success"
                );
                const aiFailed = events.filter(
                    (e) => e.eventType === "ai.query.failed"
                );

                const totalCostUsd = aiSuccess.reduce((sum, e) => {
                    const p = e.payload as Record<string, number>;
                    return sum + (p.cost_usd ?? 0);
                }, 0);

                const totalTokensIn = aiSuccess.reduce((sum, e) => {
                    const p = e.payload as Record<string, number>;
                    return sum + (p.tokens_in ?? 0);
                }, 0);

                const totalTokensOut = aiSuccess.reduce((sum, e) => {
                    const p = e.payload as Record<string, number>;
                    return sum + (p.tokens_out ?? 0);
                }, 0);

                const avgLatencyMs =
                    aiSuccess.length > 0
                        ? aiSuccess.reduce((sum, e) => {
                            const p = e.payload as Record<string, number>;
                            return sum + (p.duration_ms ?? 0);
                        }, 0) / aiSuccess.length
                        : 0;

                // Errores del servidor
                const serverErrors = events.filter(
                    (e) =>
                        e.eventType === "error.server" ||
                        e.eventType === "error.unhandled"
                );

                // Últimos 5 errores para mostrar en el dashboard
                const recentErrors = [
                    ...serverErrors,
                    ...aiFailed,
                ]
                    .sort(
                        (a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                    .slice(0, 5)
                    .map((e) => ({
                        type: e.eventType,
                        payload: e.payload,
                        at: e.createdAt,
                    }));

                // Uptime — si el lastSeenAt es hace menos de 10 minutos, está online
                
                const isOnline = tenant.lastSeenAt
                    ? Math.abs(Date.now() - new Date(tenant.lastSeenAt).getTime()) < 10 * 60 * 1000
                    : false;

                return {
                    tenant: {
                        id: tenant.id,
                        name: tenant.name,
                        url: tenant.url,
                        lastSeenAt: tenant.lastSeenAt,
                    },
                    uptime: {
                        isOnline,
                        lastSeenAt: tenant.lastSeenAt,
                    },
                    ai: {
                        queriesSuccess: aiSuccess.length,
                        queriesFailed: aiFailed.length,
                        failureRate:
                            aiSuccess.length + aiFailed.length > 0
                                ? (
                                    (aiFailed.length /
                                        (aiSuccess.length + aiFailed.length)) *
                                    100
                                ).toFixed(1)
                                : "0.0",
                        totalCostUsd: totalCostUsd.toFixed(4),
                        totalTokensIn,
                        totalTokensOut,
                        avgLatencyMs: Math.round(avgLatencyMs),
                    },
                    errors: {
                        total: serverErrors.length,
                        recent: recentErrors,
                    },
                    logins: events.filter((e) => e.eventType === "auth.login").length,
                    payments: events.filter((e) => e.eventType === "payment.created")
                        .length,
                };
            })
        );

        res.json({ summaries, generatedAt: new Date() });
    } catch (error) {
        console.error("[metrics/summary] Error:", error);
        res.status(500).json({ error: "Failed to fetch metrics" });
    }
});

// GET /metrics/events/:tenantId
// Eventos recientes de un tenant específico — para la vista de detalle
router.get("/events/:tenantId", async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const limitRaw = typeof req.query.limit === 'string' ? req.query.limit : '50';
    const limit = Math.min(Number(limitRaw) || 50, 200);
    const eventType = typeof req.query.type === 'string' ? req.query.type : undefined;

    try {
        const events: EventRecord[] = await prisma.event.findMany({
            where: {
                tenantId,
                ...(eventType ? { eventType: { equals: eventType } } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        res.json({ events });
    } catch (error) {
        console.error("[metrics/events] Error:", error);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});

export default router;