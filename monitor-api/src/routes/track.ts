import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { tenantAuth } from "../middleware/auth";

const router = Router();

// Tipos de eventos válidos
const VALID_EVENT_TYPES = [
    "ai.query.success",
    "ai.query.failed",
    "error.server",
    "error.unhandled",
    "auth.login",
    "payment.created",
] as const;

type EventType = (typeof VALID_EVENT_TYPES)[number];

// POST /track
// Llamado desde el backend de Silver Star — fire and forget desde su lado
router.post("/", tenantAuth, async (req: Request, res: Response) => {
    const { eventType, payload } = req.body;

    // Validación básica
    if (!eventType || !VALID_EVENT_TYPES.includes(eventType as EventType)) {
        res.status(400).json({ error: `Invalid event type: ${eventType}` });
        return;
    }

    if (!payload || typeof payload !== "object") {
        res.status(400).json({ error: "Payload must be an object" });
        return;
    }

    try {
        // Guardar el evento y actualizar lastSeenAt del tenant en paralelo
        await Promise.all([
            prisma.event.create({
                data: {
                    tenantId: req.tenant!.id,
                    eventType,
                    payload,
                },
            }),
            prisma.tenant.update({
                where: { id: req.tenant!.id },
                data: { lastSeenAt: new Date() },
            }),
        ]);

        res.status(201).json({ ok: true });
    } catch (error) {
        console.error("[track] Error saving event:", error);
        res.status(500).json({ error: "Failed to save event" });
    }
});

export default router;