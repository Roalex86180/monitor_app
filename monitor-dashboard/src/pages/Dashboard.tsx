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
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    function handleLogout() {
        localStorage.removeItem("monitor_token");
        navigate("/login");
    }

    if (loading) return (
        <div style={s.centered}>
            <div style={s.spinner} />
        </div>
    );

    if (error) return (
        <div style={s.centered}>
            <p style={{ color: "var(--red)", fontSize: "13px" }}>{error}</p>
        </div>
    );

    return (
        <div style={s.page}>
            {/* Header */}
            <header style={s.header}>
                <div style={s.headerLeft}>
                    <div style={s.logoRow}>
                        <div style={s.dot} />
                        <span style={s.logoText}>Monitor</span>
                    </div>
                    <span style={s.headerMeta}>
                        {summaries.length} {summaries.length === 1 ? "instancia" : "instancias"} —{" "}
                        {generatedAt
                            ? new Date(generatedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                    </span>
                </div>
                <button onClick={handleLogout} style={s.logoutBtn}>
                    Salir
                </button>
            </header>

            {/* Cards */}
            <main style={s.main}>
                {summaries.map((s, i) => (
                    <TenantCard key={s.tenant.id} summary={s} index={i} />
                ))}
            </main>
        </div>
    );
}

function TenantCard({ summary: d, index }: { summary: TenantSummary; index: number }) {
    const failRate = parseFloat(d.ai.failureRate);
    const hasErrors = d.errors.total > 0;
    const hasFails = d.ai.queriesFailed > 0;

    return (
        <div
            className="fade-up"
            style={{ ...card.root, animationDelay: `${index * 80}ms` }}
        >
            {/* Cabecera de la card */}
            <div style={card.top}>
                <div>
                    <h2 style={card.name}>{d.tenant.name}</h2>
                    <a
                        href={d.tenant.url}
                        target="_blank"
                        rel="noreferrer"
                        style={card.url}
                    >
                        {d.tenant.url.replace("https://", "")}
                    </a>
                </div>
                <span style={{
                    ...card.badge,
                    background: d.uptime.isOnline ? "var(--green-bg)" : "var(--red-bg)",
                    color: d.uptime.isOnline ? "var(--green)" : "var(--red)",
                    borderColor: d.uptime.isOnline ? "#b6e4cc" : "#f0c4be",
                }}>
                    {d.uptime.isOnline ? "Online" : "Offline"}
                </span>
            </div>

            <div style={card.divider} />

            {/* Métricas principales — números grandes */}
            <div style={card.bigGrid}>
                <BigMetric
                    label="Consultas IA"
                    value={d.ai.queriesSuccess + d.ai.queriesFailed}
                />
                <BigMetric
                    label="Costo hoy"
                    value={`$${d.ai.totalCostUsd}`}
                />
                <BigMetric
                    label="Latencia"
                    value={d.ai.avgLatencyMs > 0 ? `${(d.ai.avgLatencyMs / 1000).toFixed(1)}s` : "—"}
                />
                <BigMetric
                    label="Logins"
                    value={d.logins}
                />
            </div>

            <div style={card.divider} />

            {/* Fila de estado */}
            <div style={card.statusRow}>
                <StatusPill
                    label="Fallos IA"
                    value={d.ai.queriesFailed}
                    rate={`${d.ai.failureRate}%`}
                    alert={hasFails}
                />
                <StatusPill
                    label="Errores servidor"
                    value={d.errors.total}
                    alert={hasErrors}
                />
                <StatusPill
                    label="Pagos"
                    value={d.payments}
                    alert={false}
                    positive
                />
            </div>

            {/* Tokens */}
            <div style={card.tokenRow}>
                <span style={card.tokenLabel}>tokens entrada</span>
                <span style={card.tokenValue}>{d.ai.totalTokensIn.toLocaleString("es-CL")}</span>
                <span style={{ ...card.tokenLabel, marginLeft: "16px" }}>salida</span>
                <span style={card.tokenValue}>{d.ai.totalTokensOut.toLocaleString("es-CL")}</span>
                {failRate > 10 && (
                    <span style={card.alertBadge}>tasa fallo alta</span>
                )}
            </div>

            {/* Últimos errores */}
            {d.errors.recent.length > 0 && (
                <>
                    <div style={card.divider} />
                    <p style={card.sectionLabel}>Últimos errores</p>
                    <div style={card.errorList}>
                        {d.errors.recent.map((err, i) => (
                            <div key={i} style={card.errorItem}>
                                <div style={card.errorTop}>
                                    <span style={card.errorType}>{err.type}</span>
                                    <span style={card.errorTime}>
                                        {new Date(err.at).toLocaleTimeString("es-CL", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                        })}
                                    </span>
                                </div>
                                <p style={card.errorMsg}>
                                    {(err.payload as Record<string, string>).message ??
                                        (err.payload as Record<string, string>).error_message ??
                                        "sin mensaje"}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function BigMetric({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={bm.root}>
            <span style={bm.value}>{value}</span>
            <span style={bm.label}>{label}</span>
        </div>
    );
}

function StatusPill({
    label,
    value,
    rate,
    alert,
    positive,
}: {
    label: string;
    value: number;
    rate?: string;
    alert: boolean;
    positive?: boolean;
}) {
    const bg = alert
        ? "var(--red-bg)"
        : positive && value > 0
            ? "var(--green-bg)"
            : "var(--surface-2)";
    const color = alert
        ? "var(--red)"
        : positive && value > 0
            ? "var(--green)"
            : "var(--text-2)";

    return (
        <div style={{ ...sp.root, background: bg, color }}>
            <span style={sp.value}>{value}{rate ? ` (${rate})` : ""}</span>
            <span style={sp.label}>{label}</span>
        </div>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "var(--bg)",
        padding: "0 0 48px",
    },
    centered: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
    },
    spinner: {
        width: "20px",
        height: "20px",
        border: "2px solid var(--border)",
        borderTopColor: "var(--text)",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        position: "sticky" as const,
        top: 0,
        zIndex: 10,
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "20px",
    },
    logoRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    dot: {
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: "var(--green)",
    },
    logoText: {
        fontFamily: "'DM Serif Display', serif",
        fontSize: "19px",
        color: "var(--text)",
        letterSpacing: "-0.02em",
    },
    headerMeta: {
        fontSize: "12px",
        color: "var(--text-3)",
        letterSpacing: "0.03em",
    },
    logoutBtn: {
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
        padding: "7px 16px",
        borderRadius: "var(--radius-sm)",
        fontSize: "12px",
        letterSpacing: "0.03em",
        transition: "border-color 0.15s",
    },
    main: {
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
        gap: "20px",
    },
};

const card: Record<string, React.CSSProperties> = {
    root: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "28px",
        opacity: 0,
    },
    top: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "20px",
    },
    name: {
        fontFamily: "'DM Serif Display', serif",
        fontSize: "20px",
        color: "var(--text)",
        letterSpacing: "-0.02em",
        marginBottom: "4px",
    },
    url: {
        fontSize: "11px",
        color: "var(--text-3)",
        textDecoration: "none",
        letterSpacing: "0.02em",
    },
    badge: {
        fontSize: "11px",
        padding: "4px 12px",
        borderRadius: "20px",
        border: "1px solid",
        letterSpacing: "0.04em",
        fontWeight: 500,
    },
    divider: {
        borderTop: "1px solid var(--border)",
        margin: "20px 0",
    },
    bigGrid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "16px",
    },
    statusRow: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: "8px",
        marginBottom: "12px",
    },
    tokenRow: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap" as const,
        marginTop: "8px",
    },
    tokenLabel: {
        fontSize: "11px",
        color: "var(--text-3)",
        letterSpacing: "0.03em",
    },
    tokenValue: {
        fontSize: "12px",
        color: "var(--text-2)",
        fontWeight: 500,
    },
    alertBadge: {
        marginLeft: "auto",
        fontSize: "10px",
        background: "var(--amber-bg)",
        color: "var(--amber)",
        padding: "2px 8px",
        borderRadius: "20px",
        letterSpacing: "0.04em",
    },
    sectionLabel: {
        fontSize: "11px",
        color: "var(--text-3)",
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        marginBottom: "10px",
    },
    errorList: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "8px",
    },
    errorItem: {
        padding: "10px 12px",
        background: "var(--red-bg)",
        borderRadius: "var(--radius-sm)",
        borderLeft: "3px solid var(--red)",
    },
    errorTop: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "4px",
    },
    errorType: {
        fontSize: "11px",
        color: "var(--red)",
        fontWeight: 500,
        letterSpacing: "0.03em",
    },
    errorTime: {
        fontSize: "11px",
        color: "var(--text-3)",
    },
    errorMsg: {
        fontSize: "12px",
        color: "var(--text-2)",
        lineHeight: 1.5,
    },
};

const bm: Record<string, React.CSSProperties> = {
    root: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "4px",
    },
    value: {
        fontFamily: "'DM Serif Display', serif",
        fontSize: "28px",
        color: "var(--text)",
        letterSpacing: "-0.03em",
        lineHeight: 1,
    },
    label: {
        fontSize: "11px",
        color: "var(--text-3)",
        letterSpacing: "0.04em",
    },
};

const sp: Record<string, React.CSSProperties> = {
    root: {
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        display: "flex",
        flexDirection: "column" as const,
        gap: "3px",
    },
    value: {
        fontSize: "15px",
        fontWeight: 500,
        letterSpacing: "-0.01em",
    },
    label: {
        fontSize: "10px",
        opacity: 0.7,
        letterSpacing: "0.03em",
    },
};