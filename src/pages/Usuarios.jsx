import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";
import { useAuth } from "../auth/AuthContext";

const ROLES_PERSONAL = [
    ["MEDICO", "Médico"], ["FARMACEUTICO", "Farmacéutico"], ["RECEPCIONISTA", "Recepcionista"], ["GERENTE", "Gerente"],
];
const NOMBRE_ROL = { SUPERADMIN: "Superadmin", PACIENTE: "Paciente", ...Object.fromEntries(ROLES_PERSONAL) };

const vacio = { rol: "MEDICO", documento: "", nombre: "", apellido: "", idEspecialidad: "", telefono: "", email: "", username: "", password: "" };

/** El superadmin crea personal, activa/desactiva cuentas y restablece contraseñas. */
export default function Usuarios() {
    const { user } = useAuth();
    const toast = useToast();
    const [lista, setLista] = useState(null); // null = cargando
    const [especialidades, setEspecialidades] = useState([]);
    const [q, setQ] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [intento, setIntento] = useState(0);
    const [nuevo, setNuevo] = useState(null); // formulario abierto
    const [guardando, setGuardando] = useState(false);
    const [clave, setClave] = useState(null); // { id, valor }

    // Busqueda en vivo: espera 300 ms despues de la ultima letra
    useEffect(() => {
        const t = setTimeout(() => setBusqueda(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        api("/admin/especialidades").then(setEspecialidades).catch(() => { });
    }, []);

    useEffect(() => {
        let activo = true;
        api(`/admin/usuarios${busqueda ? `?q=${encodeURIComponent(busqueda)}` : ""}`)
            .then((d) => activo && setLista(d))
            .catch((e) => {
                if (!activo) return;
                setLista([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [busqueda, intento, toast]);

    const recargar = () => { setLista(null); setIntento((n) => n + 1); };
    const campo = (k) => (e) => setNuevo((f) => ({ ...f, [k]: e.target.value }));
    const conFicha = nuevo && (nuevo.rol === "MEDICO" || nuevo.rol === "FARMACEUTICO");
    const nuevoOk = nuevo && nuevo.username && nuevo.password &&
        (!conFicha || (nuevo.documento && nuevo.nombre.trim() && nuevo.apellido.trim())) &&
        (nuevo.rol !== "MEDICO" || nuevo.idEspecialidad);

    async function crear(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/admin/usuarios", {
                method: "POST",
                body: {
                    ...nuevo,
                    idEspecialidad: nuevo.rol === "MEDICO" ? Number(nuevo.idEspecialidad) : null,
                    username: nuevo.username.trim().toLowerCase(),
                    telefono: nuevo.telefono.trim() || null,
                    email: nuevo.email.trim() || null,
                },
            });
            toast.ok(`Usuario ${nuevo.username.trim().toLowerCase()} creado.`);
            setNuevo(null);
            recargar();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarEstado(u) {
        try {
            await api(`/admin/usuarios/${u.idUsuario}/estado`, { method: "PUT", body: { estado: u.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO" } });
            toast.ok(u.estado === "ACTIVO" ? "Cuenta desactivada." : "Cuenta activada.");
            recargar();
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function restablecer(e) {
        e.preventDefault();
        try {
            await api(`/admin/usuarios/${clave.id}/clave`, { method: "PUT", body: { password: clave.valor } });
            toast.ok("Contraseña temporal asignada. La persona deberá cambiarla al ingresar.");
            setClave(null);
        } catch (err) {
            toast.error(err.message);
        }
    }

    return (
        <Shell>
            <div className="page-head">
                <h1>Usuarios</h1>
                <p>Crea cuentas del personal, activa o desactiva accesos y restablece contraseñas. Las contraseñas que asignas son temporales: cada persona debe cambiarla en su primer ingreso. Los pacientes se registran solos o con la recepcionista.</p>
            </div>

            <form className="search-row toolbar" onSubmit={(e) => { e.preventDefault(); setBusqueda(q.trim()); }}>
                <input type="search" placeholder="Usuario, nombre o rol" aria-label="Buscar usuario" value={q} onChange={(e) => setQ(e.target.value)} />
                {!nuevo && <button type="button" className="btn btn-primary" onClick={() => setNuevo({ ...vacio })}>Nuevo usuario</button>}
            </form>

            {nuevo && (
                <form className="consulta-form" onSubmit={crear} onKeyDown={(e) => e.key === "Escape" && !guardando && setNuevo(null)}>
                    <h3>Nuevo usuario</h3>
                    <div className="usuario-grid">
                        <div className="field">
                            <label htmlFor="u-rol">Rol</label>
                            <select id="u-rol" value={nuevo.rol} onChange={campo("rol")}>
                                {ROLES_PERSONAL.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                            </select>
                        </div>
                        {conFicha && (
                            <>
                                <div className="field"><label htmlFor="u-nom">Nombre</label><input id="u-nom" type="text" maxLength={100} value={nuevo.nombre} onChange={campo("nombre")} /></div>
                                <div className="field"><label htmlFor="u-ape">Apellido</label><input id="u-ape" type="text" maxLength={100} value={nuevo.apellido} onChange={campo("apellido")} /></div>
                                <div className="field">
                                    <label htmlFor="u-doc">Documento</label>
                                    <input id="u-doc" type="text" inputMode="numeric" maxLength={20} value={nuevo.documento}
                                        onChange={(e) => campo("documento")({ target: { value: e.target.value.replace(/\D/g, "") } })} />
                                </div>
                                {nuevo.rol === "MEDICO" && (
                                    <div className="field">
                                        <label htmlFor="u-esp">Especialidad</label>
                                        <select id="u-esp" value={nuevo.idEspecialidad} onChange={campo("idEspecialidad")}>
                                            <option value="">Elige…</option>
                                            {especialidades.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div className="field"><label htmlFor="u-tel">Teléfono (opcional)</label><input id="u-tel" type="tel" maxLength={20} value={nuevo.telefono} onChange={campo("telefono")} /></div>
                                <div className="field"><label htmlFor="u-mail">Correo (opcional)</label><input id="u-mail" type="email" maxLength={150} value={nuevo.email} onChange={campo("email")} /></div>
                            </>
                        )}
                        <div className="field">
                            <label htmlFor="u-user">Usuario</label>
                            <input id="u-user" type="text" maxLength={30} autoComplete="off" value={nuevo.username}
                                onChange={(e) => campo("username")({ target: { value: e.target.value.toLowerCase().replace(/\s/g, "") } })} />
                        </div>
                        <div className="field">
                            <label htmlFor="u-pass">Contraseña temporal (deberá cambiarla al ingresar)</label>
                            <input id="u-pass" type="text" autoComplete="off" value={nuevo.password} onChange={campo("password")} />
                        </div>
                    </div>
                    <p className="cell-sub">Usuario: minúsculas, números, punto o guion (mínimo 4). Contraseña: mínimo 8 con letras y números.</p>
                    <div className="cancel-actions">
                        <button className="btn btn-primary" disabled={!nuevoOk || guardando}>{guardando ? "Creando…" : "Crear usuario"}</button>
                        <button type="button" className="link-btn" disabled={guardando} onClick={() => setNuevo(null)}>Cancelar</button>
                    </div>
                </form>
            )}

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col" className="plain-th">Usuario</th>
                            <th scope="col" className="plain-th">Nombre</th>
                            <th scope="col" className="plain-th">Rol</th>
                            <th scope="col" className="plain-th">Estado</th>
                            <th scope="col" className="plain-th"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {lista === null &&
                            Array.from({ length: 5 }, (_, i) => (
                                <tr key={i}>{[25, 35, 20, 15, 25].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}</tr>
                            ))}
                        {lista && lista.length === 0 && (
                            <tr><td colSpan={5}><div className="state"><strong>Sin resultados</strong><span>Prueba con otra búsqueda.</span></div></td></tr>
                        )}
                        {lista && lista.map((u) => (
                            <tr key={u.idUsuario} className={clave?.id === u.idUsuario ? "row-confirm" : undefined}>
                                <td className="cell-name">{u.username}</td>
                                <td>{u.nombre ?? <span className="cell-sub">—</span>}</td>
                                <td>{NOMBRE_ROL[u.rol] ?? u.rol}</td>
                                <td><span className={`badge badge-${u.estado === "ACTIVO" ? "disponible" : "cancelada"}`}>{u.estado === "ACTIVO" ? "Activo" : "Inactivo"}</span></td>
                                <td className="cell-actions">
                                    {clave?.id === u.idUsuario ? (
                                        <form className="confirm" onSubmit={restablecer} onKeyDown={(e) => e.key === "Escape" && setClave(null)}>
                                            <input type="text" aria-label="Contraseña temporal" placeholder="Contraseña temporal" autoFocus value={clave.valor}
                                                onChange={(e) => setClave({ id: u.idUsuario, valor: e.target.value })} />
                                            <button className="btn btn-primary" disabled={clave.valor.length < 8}>Guardar</button>
                                            <button type="button" className="link-btn" onClick={() => setClave(null)}>No</button>
                                        </form>
                                    ) : (
                                        <div className="acciones">
                                            <button type="button" className="link-btn" onClick={() => setClave({ id: u.idUsuario, valor: "" })}>Restablecer clave</button>
                                            {u.username !== user.username && (
                                                <button type="button" className={`link-btn${u.estado === "ACTIVO" ? " link-danger" : ""}`} onClick={() => cambiarEstado(u)}>
                                                    {u.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Shell>
    );
}
