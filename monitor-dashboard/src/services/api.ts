const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken() {
    return localStorage.getItem("monitor_token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...options?.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || "Request failed");
    }

    return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(password: string): Promise<{ token: string }> {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });

    if (!res.ok) throw new Error("Invalid credentials");
    return res.json();
}

// ─── Métricas ────────────────────────────────────────────────────────────────
export interface TenantSummary {
    tenant: {
        id: string;
        name: string;
        url: string;
        lastSeenAt: string | null;
    };
    uptime: {
        isOnline: boolean;
        lastSeenAt: string | null;
    };
    ai: {
        queriesSuccess: number;
        queriesFailed: number;
        failureRate: string;
        totalCostUsd: string;
        totalTokensIn: number;
        totalTokensOut: number;
        avgLatencyMs: number;
    };
    errors: {
        total: number;
        recent: Array<{
            type: string;
            payload: Record<string, unknown>;
            at: string;
        }>;
    };
    logins: number;
    payments: number;
}

export async function getSummary(): Promise<{
    summaries: TenantSummary[];
    generatedAt: string;
}> {
    return request("/metrics/summary");
}

export async function getEvents(
    tenantId: string,
    options?: { type?: string; limit?: number }
) {
    const params = new URLSearchParams();
    if (options?.type) params.set("type", options.type);
    if (options?.limit) params.set("limit", String(options.limit));
    return request(`/metrics/events/${tenantId}?${params}`);
}