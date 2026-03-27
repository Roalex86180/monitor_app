import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

export default function Login() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const { token } = await login(password);
            localStorage.setItem("monitor_token", token);
            navigate("/");
        } catch {
            setError("Contraseña incorrecta");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={s.page}>
            <div style={s.card} className="fade-up">
                <div style={s.logoRow}>
                    <div style={s.dot} />
                    <span style={s.logoText}>Monitor</span>
                </div>
                <p style={s.sub}>Panel de control privado</p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoFocus
                        style={s.input}
                        onFocus={e => (e.target.style.borderColor = "var(--text)")}
                        onBlur={e => (e.target.style.borderColor = "var(--border)")}
                    />
                    {error && <p style={s.error}>{error}</p>}
                    <button
                        type="submit"
                        disabled={loading || !password}
                        style={{
                            ...s.btn,
                            opacity: loading || !password ? 0.45 : 1,
                            cursor: loading || !password ? "not-allowed" : "pointer",
                        }}
                    >
                        {loading ? "Verificando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}

const s: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
    },
    card: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "48px 40px",
        width: "100%",
        maxWidth: "360px",
    },
    logoRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "8px",
    },
    dot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: "var(--green)",
    },
    logoText: {
        fontFamily: "'DM Serif Display', serif",
        fontSize: "22px",
        color: "var(--text)",
        letterSpacing: "-0.02em",
    },
    sub: {
        fontSize: "12px",
        color: "var(--text-3)",
        marginBottom: "36px",
        letterSpacing: "0.04em",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    input: {
        width: "100%",
        padding: "11px 14px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-2)",
        color: "var(--text)",
        fontSize: "14px",
        outline: "none",
        transition: "border-color 0.15s",
    },
    error: {
        fontSize: "12px",
        color: "var(--red)",
        letterSpacing: "0.02em",
    },
    btn: {
        padding: "11px",
        background: "var(--text)",
        color: "var(--bg)",
        border: "none",
        borderRadius: "var(--radius-sm)",
        fontSize: "13px",
        letterSpacing: "0.04em",
        transition: "opacity 0.15s",
        marginTop: "4px",
    },
};