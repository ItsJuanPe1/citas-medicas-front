import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth-panel" onSubmit={onSubmit}>
        <h1>Citas médicas</h1>
        <p className="auth-sub">Ingresa con tu usuario del sistema.</p>

        <div className="field">
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="pass-wrap">
            <input
              id="password"
              type={verClave ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="pass-toggle"
              onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={verClave}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
                {verClave && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </div>
        </div>

        {error && <p className="alert" role="alert">{error}</p>}

        <button className="btn btn-primary" disabled={cargando || !username || !password}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
        <p className="auth-alt">¿Eres paciente y no tienes cuenta? <Link to="/registro">Regístrate</Link></p>
      </form>
    </div>
  );
}
