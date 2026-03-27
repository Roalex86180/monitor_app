import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary } from "../services/api";
import type { TenantSummary } from "../services/api";

export default function Dashboard() {
    const [summaries, setSummaries] = useState<TenantSummary[]>([]);
    const [generatedAt, setGeneratedAt] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function fetchData() {
        try {
            const data = await getSummary();
            setSummaries(data.summaries);
            setGeneratedAt(data.generatedAt);
        } catch (err: unknown) {
            if (err instanceof Error && err.message === "Unauthorized") {
                localStorage.removeItem("monitor_token");
                navigate("/login");
            } else {
                setError("Error cargando métricas");
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // refresca cada 30s
        return () => clearInterval(interval);
    }, []);

    function handleLogout() {
        localStorage.removeItem("monitor_token");
        navigate("/login");
    }

    if (loading) return (
        <div style={styles.centered}>
            <p style={{ color: "#666", fontFamily: "monospace" }}>Cargando...</p>
        </div>
    );

    if (error) return (
        <div style={styles.centered}>
            <p style={{ color: "#ef4444", fontFamily: "monospace" }}>{error}</p>
        </div>
    );

    return (
        <div style={styles.page}>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Monitor</h1>
                    <p style={styles.subtitle}>
                        Actualizado {new Date(generatedAt).toLocaleTimeString("es-CL")}
                    </p>
                </div>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                    Salir
                </button>
            </div>

            {/* Grid de tenants */}
            <div style={styles.grid}>
                {summaries.map((s) => (
                    <TenantCard key={s.tenant.id} summary={s} />
                ))}
            </div>
        </div>
    );
}

function TenantCard({ summary: s }: { summary: TenantSummary }) {
    const aiFailureRate = parseFloat(s.ai.failureRate);

    return (
        <div style={styles.card}>
            {/* Nombre + uptime */}
            <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>{s.tenant.name}</h2>
                <span style={{
                    ...styles.badge,
                    background: s.uptime.isOnline ? "#14532d" : "#450a0a",
                    color: s.uptime.isOnline ? "#4ade80" : "#f87171",
                }}>
                    {s.uptime.isOnline ? "Online" : "Offline"}
                </span>
            </div>

            <p style={styles.tenantUrl}>{s.tenant.url}</p>

            <div style={styles.divider} />

            {/* Métricas de IA */}
            <p style={styles.sectionLabel}>IA hoy</p>
            <div style={styles.metricsGrid}>
                <Metric label="Consultas OK" value={s.ai.queriesSuccess} />
                <Metric
                    label="Fallos"
                    value={s.ai.queriesFailed}
                    alert={s.ai.queriesFailed > 0}
                />
                <Metric
                    label="Tasa fallo"
                    value={`${s.ai.failureRate}%`}
                    alert={aiFailureRate > 10}
                />
                <Metric label="Costo" value={`$${s.ai.totalCostUsd}`} />
                <Metric label="Tokens entrada" value={s.ai.totalTokensIn.toLocaleString()} />
                <Metric label="Tokens salida" value={s.ai.totalTokensOut.toLocaleString()} />
                <Metric label="Latencia prom." value={`${s.ai.avgLatencyMs}ms`} />
            </div>

            <div style={styles.divider} />

            {/* Errores + actividad */}
            <p style={styles.sectionLabel}>Servidor hoy</p>
            <div style={styles.metricsGrid}>
                <Metric
                    label="Errores"
                    value={s.errors.total}
                    alert={s.errors.total > 0}
                />
                <Metric label="Logins" value={s.logins} />
                <Metric label="Pagos" value={s.payments} />
            </div>

            {/* Últimos errores */}
            {s.errors.recent.length > 0 && (
                <>
                    <div style={styles.divider} />
                    <p style={styles.sectionLabel}>Últimos errores</p>
                    <div style={styles.errorList}>
                        {s.errors.recent.map((err, i) => (
                            <div key={i} style={styles.errorItem}>
                                <span style={styles.errorType}>{err.type}</span>
                                <span style={styles.errorMsg}>
                                    {(err.payload as Record<string, string>).message
                                        ?? (err.payload as Record<string, string>).error_message
                                        ?? "sin mensaje"}
                                </span>
                                <span style={styles.errorTime}>
                                    {new Date(err.at).toLocaleTimeString("es-CL")}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function Metric({
    label,
    value,
    alert = false,
}: {
    label: string;
    value: string | number;
    alert?: boolean;
}) {
    return (
        <div style={styles.metric}>
            <span style={styles.metricLabel}>{label}</span>
            <span style={{ ...styles.metricValue, color: alert ? "#f87171" : "#fff" }}>
                {value}
            </span>
        </div>
    );
}

// ─── Estilos ────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "#0f0f0f",
        padding: "32px 24px",
        fontFamily: "monospace",
    },
    centered: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f0f",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "32px",
    },
    title: {
        color: "#fff",
        fontSize: "20px",
        margin: 0,
    },
    subtitle: {
        color: "#555",
        fontSize: "12px",
        margin: "4px 0 0",
    },
    logoutBtn: {
        background: "transparent",
        border: "1px solid #333",
        color: "#666",
        padding: "6px 14px",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "13px",
        fontFamily: "monospace",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: "20px",
    },
    card: {
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "10px",
        padding: "24px",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "4px",
    },
    cardTitle: {
        color: "#fff",
        fontSize: "16px",
        margin: 0,
    },
    badge: {
        fontSize: "11px",
        padding: "3px 10px",
        borderRadius: "20px",
        fontWeight: 500,
    },
    tenantUrl: {
        color: "#444",
        fontSize: "12px",
        margin: "0 0 16px",
    },
    divider: {
        borderTop: "1px solid #2a2a2a",
        margin: "16px 0",
    },
    sectionLabel: {
        color: "#555",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        margin: "0 0 12px",
    },
    metricsGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px",
    },
    metric: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
    },
    metricLabel: {
        color: "#555",
        fontSize: "11px",
    },
    metricValue: {
        color: "#fff",
        fontSize: "15px",
        fontWeight: 500,
    },
    errorList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    errorItem: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "8px",
        background: "#0f0f0f",
        borderRadius: "6px",
        borderLeft: "2px solid #ef4444",
    },
    errorType: {
        color: "#f87171",
        fontSize: "11px",
    },
    errorMsg: {
        color: "#aaa",
        fontSize: "12px",
    },
    errorTime: {
        color: "#444",
        fontSize: "11px",
    },
};