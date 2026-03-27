import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";

// Extiende el tipo Request para incluir el tenant autenticado
declare global {
    namespace Express {
        interface Request {
            tenant?: {
                id: string;
                name: string;
            };
        }
    }
}

export async function tenantAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing API key" });
        return;
    }

    const apiKey = authHeader.split(" ")[1];

    console.log('[tenantAuth] apiKey recibida:', apiKey)

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { apiKey },
            select: { id: true, name: true },
        });

        console.log('[tenantAuth] tenant encontrado:', tenant)

        if (!tenant) {
            res.status(401).json({ error: "Invalid API key" });
            return;
        }

        req.tenant = tenant;
        next();
    } catch (error) {
        console.log('[tenantAuth] Error de base de datos:', error)
        res.status(500).json({ error: "Database error" });
    }
}

// El dashboard usa un JWT distinto — solo tú puedes acceder
import jwt from "jsonwebtoken";

export function dashboardAuth(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        jwt.verify(token, process.env.DASHBOARD_JWT_SECRET!);
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
}