import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";
import { useAuth } from "../auth/AuthContext";

/** Cambio de contraseña. Si la clave es temporal, es obligatorio antes de usar el sistema. */
export default function CambiarClave() {
    const { user, claveCambiada } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [f, setF] = useState({ actual: "", nueva: "", confirmar: "" });
    const [ver, setVer] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const campo = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
    const noCoinciden = f.confirmar !== "" && f.nueva !== f.confirmar;
    const debil = f.nueva !== "" && (f.nueva.length < 8 || !/[A-Za-z]/.test(f.nueva) || !/[0-9]/.test(f.nueva));
    const completo = f.actual && f.nueva && f.nueva === f.confirmar && !debil;

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/cuenta/clave", { method: "PUT", body: { actual: f.actual, nueva: f.nueva } });
            claveCambiada();
            toast.ok("Contraseña actualizada.");
            navigate("/", { replace: true });
        } catch (err) {
            toast.error(err.message);
            setGuardando(false);
        }
    }

    return (
        <Shell>
            <div className="page-head">
                <h1>{user.debeCambiarClave ? "Cambia tu contraseña" : "Cambiar contraseña"}</h1>
                <p>{user.debeCambiarClave
                    ? "Tu contraseña es temporal. Elige una nueva para continuar."
                    : "Escribe tu contraseña actual y la nueva."}</p>
            </div>
            <form className="block contacto-form" onSubmit={guardar}>
                <div className="field">
                    <label htmlFor="c-actual">{user.debeCambiarClave ? "Contraseña temporal" : "Contraseña actual"}</label>
                    <input id="c-actual" type={ver ? "text" : "password"} autoComplete="current-password" autoFocus value={f.actual} onChange={campo("actual")} />
                </div>
                <div className="field">
                    <label htmlFor="c-nueva">Nueva contraseña</label>
                    <input id="c-nueva" type={ver ? "text" : "password"} autoComplete="new-password" value={f.nueva} onChange={campo("nueva")} />
                    <span className="cell-sub">Mínimo 8 caracteres, con letras y números.</span>
                    {debil && <span className="alert">La contraseña es muy débil.</span>}
                </div>
                <div className="field">
                    <label htmlFor="c-conf">Repite la nueva contraseña</label>
                    <input id="c-conf" type={ver ? "text" : "password"} autoComplete="new-password" value={f.confirmar} onChange={campo("confirmar")} />
                    {noCoinciden && <span className="alert">Las contraseñas no coinciden.</span>}
                </div>
                <label className="check-row"><input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseñas</label>
                <div>
                    <button className="btn btn-primary" disabled={!completo || guardando}>{guardando ? "Guardando…" : "Guardar contraseña"}</button>
                </div>
            </form>
        </Shell>
    );
}
