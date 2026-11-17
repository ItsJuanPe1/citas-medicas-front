import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";

const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Registro publico de pacientes. Al terminar inicia sesion solo. */
export default function Registro() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [f, setF] = useState({
        documento: "", nombre: "", apellido: "", fechaNacimiento: "", telefono: "", email: "",
        username: "", password: "", confirmar: "",
    });
    const [verClave, setVerClave] = useState(false);
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const campo = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const noCoinciden = f.confirmar !== "" && f.password !== f.confirmar;
    const completo = f.documento && f.nombre.trim() && f.apellido.trim() && f.fechaNacimiento && f.username && f.password && f.password === f.confirmar;

    async function enviar(e) {
        e.preventDefault();
        setError(null);
        setEnviando(true);
        try {
            await api("/auth/registro", {
                method: "POST",
                body: {
                    documento: f.documento.trim(), nombre: f.nombre.trim(), apellido: f.apellido.trim(),
                    fechaNacimiento: f.fechaNacimiento, telefono: f.telefono.trim() || null, email: f.email.trim() || null,
                    username: f.username.trim().toLowerCase(), password: f.password,
                },
            });
            await login(f.username.trim().toLowerCase(), f.password);
            navigate("/");
        } catch (err) {
            setError(err.message);
            setEnviando(false);
        }
    }

    return (
        <div className="auth">
            <form className="auth-panel registro-panel" onSubmit={enviar}>
                <h1>Crear cuenta</h1>
                <p className="auth-sub">Registro de pacientes. Si eres médico o parte del personal, tu cuenta la crea el administrador.</p>

                <div className="registro-grid">
                    <div className="field">
                        <label htmlFor="r-nombre">Nombre</label>
                        <input id="r-nombre" type="text" maxLength={100} autoFocus value={f.nombre} onChange={campo("nombre")} />
                    </div>
                    <div className="field">
                        <label htmlFor="r-apellido">Apellido</label>
                        <input id="r-apellido" type="text" maxLength={100} value={f.apellido} onChange={campo("apellido")} />
                    </div>
                    <div className="field">
                        <label htmlFor="r-doc">Documento</label>
                        <input id="r-doc" type="text" inputMode="numeric" maxLength={20} value={f.documento}
                            onChange={(e) => campo("documento")({ target: { value: e.target.value.replace(/\D/g, "") } })} />
                    </div>
                    <div className="field">
                        <label htmlFor="r-nac">Fecha de nacimiento</label>
                        <input id="r-nac" type="date" max={hoy()} value={f.fechaNacimiento} onChange={campo("fechaNacimiento")} />
                    </div>
                    <div className="field">
                        <label htmlFor="r-tel">Teléfono (opcional)</label>
                        <input id="r-tel" type="tel" maxLength={20} value={f.telefono} onChange={campo("telefono")} />
                    </div>
                    <div className="field">
                        <label htmlFor="r-mail">Correo (opcional)</label>
                        <input id="r-mail" type="email" maxLength={150} value={f.email} onChange={campo("email")} />
                    </div>
                    <div className="field">
                        <label htmlFor="r-user">Usuario</label>
                        <input id="r-user" type="text" autoComplete="username" maxLength={30} value={f.username}
                            onChange={(e) => campo("username")({ target: { value: e.target.value.toLowerCase().replace(/\s/g, "") } })} />
                    </div>
                    <div className="field">
                        <label htmlFor="r-pass">Contraseña</label>
                        <div className="pass-wrap">
                            <input id="r-pass" type={verClave ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={campo("password")} />
                            <button type="button" className="pass-toggle" onClick={() => setVerClave((v) => !v)}
                                aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={verClave}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                                    <circle cx="12" cy="12" r="3" />
                                    {verClave && <path d="M4 4l16 16" />}
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="field">
                        <label htmlFor="r-conf">Repite la contraseña</label>
                        <input id="r-conf" type={verClave ? "text" : "password"} autoComplete="new-password" value={f.confirmar} onChange={campo("confirmar")} />
                    </div>
                </div>
                <p className="cell-sub">Usuario: minúsculas, números, punto o guion (mínimo 4). Contraseña: mínimo 8 caracteres con letras y números.</p>
                {noCoinciden && <p className="alert" role="alert">Las contraseñas no coinciden.</p>}
                {error && <p className="alert" role="alert">{error}</p>}

                <button className="btn btn-primary" disabled={!completo || enviando}>
                    {enviando ? "Creando cuenta…" : "Crear cuenta"}
                </button>
                <p className="auth-alt">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
            </form>
        </div>
    );
}
