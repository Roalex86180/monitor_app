import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();



// POST /auth/login
// Solo tú puedes hacer login con la contraseña maestra del dashboard
router.post("/login", (req: Request, res: Response) => {
    const { password } = req.body;

    if (!password || password !== process.env.DASHBOARD_PASSWORD) {
        // Mismo error para password incorrecta y ausente — no revelar cuál
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    const token = jwt.sign(
        { role: "admin" },
        process.env.DASHBOARD_JWT_SECRET!,
        { expiresIn: "7d" }
    );

    res.json({ token });
});

export default router;