import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const fmtDia = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });
const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });

const hoy = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const aMinutos = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
};

/** El medico define sus franjas de cita. El superadmin elige de que medico. */
export default function Horario() {
    const { user } = useAuth();
    const toast = useToast();
    const esMedico = user.rol === "MEDICO";

    const [medicos, setMedicos] = useState([]);
    const [idMedico, setIdMedico] = useState("");
    const [franjas, setFranjas] = useState(null); // null = cargando
    const [intento, setIntento] = useState(0);
    const [form, setForm] = useState({ fecha: "", desde: "08:00", hasta: "12:00", duracion: "30" });
    const [guardando, setGuardando] = useState(false);
    const [quitando, setQuitando] = useState(null); // franja pendiente de confirmar

    const listo = esMedico || idMedico !== "";
    const query = esMedico ? "" : `?idMedico=${idMedico}`;

    useEffect(() => {
        if (!esMedico) api("/medicos").then(setMedicos).catch(() => { });
    }, [esMedico]);

    useEffect(() => {
        if (!listo) return;
        let activo = true;
        api(`/horario${query}`)
            .then((d) => activo && setFranjas(d))
            .catch((e) => {
                if (!activo) return;
                setFranjas([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [listo, query, intento, toast]);

    const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    function elegirMedico(e) {
        setIdMedico(e.target.value);
        setFranjas(null);
        setQuitando(null);
    }

    const minutos = form.desde && form.hasta ? aMinutos(form.hasta) - aMinutos(form.desde) : 0;
    const cuantas = Math.floor(minutos / Number(form.duracion));
    const formOk = listo && form.fecha && minutos > 0 && cuantas >= 1;

    async function crear(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            const r = await api("/horario", {
                method: "POST",
                body: {
                    idMedico: esMedico ? null : Number(idMedico),
                    fecha: form.fecha, desde: form.desde, hasta: form.hasta, duracion: Number(form.duracion),
                },
            });
            toast.ok(`Se crearon ${r.creadas} horarios.`);
            setFranjas(null);
            setIntento((n) => n + 1);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGuardando(false);
        }
    }

    async function quitar(f) {
        try {
            await api(`/horario/${f.idAgenda}`, { method: "DELETE" });
            toast.ok("Horario eliminado.");
            setQuitando(null);
            setFranjas(null);
            setIntento((n) => n + 1);
        } catch (err) {
            toast.error(err.message);
            setQuitando(null);
        }
    }

    return (
        <Shell>
            <div className="page-head">
                <h1>{esMedico ? "Mi horario" : "Horarios de médicos"}</h1>
                <p>Define cuándo atiendes. Cada franja es una cita que los pacientes pueden reservar.</p>
            </div>

            {!esMedico && (
                <div className="toolbar field">
                    <label htmlFor="h-medico">Médico</label>
                    <select id="h-medico" value={idMedico} onChange={elegirMedico}>
                        <option value="">Elige un médico…</option>
                        {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                    </select>
                </div>
            )}

            <form className="horario-form" onSubmit={crear}>
                <div className="field">
                    <label htmlFor="h-fecha">Fecha</label>
                    <input id="h-fecha" type="date" min={hoy()} value={form.fecha} onChange={campo("fecha")} />
                </div>
                <div className="field">
                    <label htmlFor="h-desde">Desde</label>
                    <input id="h-desde" type="time" step="300" value={form.desde} onChange={campo("desde")} />
                </div>
                <div className="field">
                    <label htmlFor="h-hasta">Hasta</label>
                    <input id="h-hasta" type="time" step="300" value={form.hasta} onChange={campo("hasta")} />
                </div>
                <div className="field">
                    <label htmlFor="h-dur">Duración de cada cita</label>
                    <select id="h-dur" value={form.duracion} onChange={campo("duracion")}>
                        {[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n} minutos</option>)}
                    </select>
                </div>
                <div className="horario-submit">
                    <button className="btn btn-primary" disabled={!formOk || guardando}>
                        {guardando ? "Creando…" : cuantas >= 1 ? `Crear ${cuantas} horarios` : "Crear horarios"}
                    </button>
                </div>
            </form>

            {!listo && (
                <div className="state"><strong>Elige un médico</strong><span>Verás sus horarios y podrás crear nuevos.</span></div>
            )}

            {listo && (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col" className="plain-th">Día</th>
                                <th scope="col" className="plain-th">Hora</th>
                                <th scope="col" className="plain-th">Estado</th>
                                <th scope="col" className="plain-th"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {franjas === null &&
                                Array.from({ length: 4 }, (_, i) => (
                                    <tr key={i}>{[40, 25, 30, 15].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}</tr>
                                ))}
                            {franjas && franjas.length === 0 && (
                                <tr><td colSpan={4}>
                                    <div className="state">
                                        <strong>Sin horarios próximos</strong>
                                        <span>Crea franjas con el formulario de arriba.</span>
                                    </div>
                                </td></tr>
                            )}
                            {franjas && franjas.map((f) => {
                                const libre = f.estado === "DISPONIBLE";
                                return (
                                    <tr key={f.idAgenda} className={quitando === f.idAgenda ? "row-confirm" : undefined}>
                                        <td className="cell-name">{fmtDia.format(new Date(f.inicio))}</td>
                                        <td className="nowrap">{fmtHora.format(new Date(f.inicio))} – {fmtHora.format(new Date(f.fin))}</td>
                                        <td>
                                            <span className={`badge badge-${f.estado.toLowerCase()}`}>{libre ? "Libre" : "Con cita"}</span>
                                            {f.paciente && <span className="cell-sub"> · {f.paciente}</span>}
                                        </td>
                                        <td className="cell-actions">
                                            {libre && quitando !== f.idAgenda && (
                                                <button type="button" className="link-btn link-danger" onClick={() => setQuitando(f.idAgenda)}>Quitar</button>
                                            )}
                                            {quitando === f.idAgenda && (
                                                <span className="confirm">
                                                    ¿Quitar este horario?
                                                    <button type="button" className="btn btn-danger" onClick={() => quitar(f)}>Quitar</button>
                                                    <button type="button" className="link-btn" onClick={() => setQuitando(null)}>No</button>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Shell>
    );
}
