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
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f0f0f",
            fontFamily: "monospace",
        }}>
            <div style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "40px",
                width: "100%",
                maxWidth: "360px",
            }}>
                <h1 style={{ color: "#fff", fontSize: "18px", marginBottom: "8px" }}>
                    Monitor
                </h1>
                <p style={{ color: "#666", fontSize: "13px", marginBottom: "32px" }}>
                    Acceso privado
                </p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: "#0f0f0f",
                            border: "1px solid #333",
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "14px",
                            boxSizing: "border-box",
                            outline: "none",
                            marginBottom: "12px",
                        }}
                    />

                    {error && (
                        <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password}
                        style={{
                            width: "100%",
                            padding: "10px",
                            background: loading || !password ? "#333" : "#fff",
                            color: loading || !password ? "#666" : "#000",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            cursor: loading || !password ? "not-allowed" : "pointer",
                            transition: "all 0.15s",
                        }}
                    >
                        {loading ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}