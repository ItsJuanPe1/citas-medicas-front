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

const DIAS = [
    ["LUNES", "Lunes"], ["MARTES", "Martes"], ["MIERCOLES", "Miércoles"], ["JUEVES", "Jueves"],
    ["VIERNES", "Viernes"], ["SABADO", "Sábado"], ["DOMINGO", "Domingo"],
];

/** El medico define su horario semanal (se repite cada semana). El superadmin elige de que medico. */
export default function Horario() {
    const { user } = useAuth();
    const toast = useToast();
    const esMedico = user.rol === "MEDICO";

    const [medicos, setMedicos] = useState([]);
    const [idMedico, setIdMedico] = useState("");
    const [semanal, setSemanal] = useState(null); // null = cargando; [{dia, desde, hasta}]
    const [guardandoSem, setGuardandoSem] = useState(false);
    const [franjas, setFranjas] = useState(null); // null = cargando
    const [intento, setIntento] = useState(0);
    const [form, setForm] = useState({ fecha: "", desde: "08:00", hasta: "12:00" });
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

    useEffect(() => {
        if (!listo) return;
        let activo = true;
        api(`/horario/semanal${query}`)
            .then((d) => activo && setSemanal(d))
            .catch((e) => {
                if (!activo) return;
                setSemanal([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [listo, query, toast]);

    const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    function elegirMedico(e) {
        setIdMedico(e.target.value);
        setFranjas(null);
        setSemanal(null);
        setQuitando(null);
    }

    const cambiarBloque = (i, k, v) => setSemanal((b) => b.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
    const quitarBloque = (i) => setSemanal((b) => b.filter((_, j) => j !== i));
    const agregarBloque = (dia) => setSemanal((b) => [...b, { dia, desde: "16:00", hasta: "19:00" }]);

    const semanalOk = semanal && semanal.every((b) => b.desde && b.hasta && aMinutos(b.hasta) - aMinutos(b.desde) >= 30);

    async function guardarSemanal() {
        setGuardandoSem(true);
        try {
            const r = await api("/horario/semanal", {
                method: "PUT",
                body: { idMedico: esMedico ? null : Number(idMedico), bloques: semanal },
            });
            toast.ok(`Horario semanal guardado. Se repetirá cada semana (se crearon ${r.creadas} agendas).`);
            setFranjas(null);
            setIntento((n) => n + 1);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGuardandoSem(false);
        }
    }

    const minutos = form.desde && form.hasta ? aMinutos(form.hasta) - aMinutos(form.desde) : 0;
    const formOk = listo && form.fecha && minutos >= 30;

    async function crear(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/horario", {
                method: "POST",
                body: {
                    idMedico: esMedico ? null : Number(idMedico),
                    fecha: form.fecha, desde: form.desde, hasta: form.hasta,
                },
            });
            toast.ok("Horario creado. Los pacientes ya pueden reservar dentro de ese rango.");
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
                <p>Define qué días y horas atiendes cada semana (por ejemplo, martes de 4:00 a 7:00 pm). Los pacientes reservan citas dentro de cada rango.</p>
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

            {listo && (
                <section className="semanal" aria-labelledby="h-semanal">
                    <h2 id="h-semanal">Horario semanal</h2>
                    <p className="cell-sub">Lo que atiendes todas las semanas, sin fecha de fin. Puedes cambiarlo cuando quieras: al guardar se rehacen los días futuros sin citas; los que ya tienen citas no se tocan.</p>
                    {semanal === null && <div className="state"><span>Cargando…</span></div>}
                    {semanal && (
                        <>
                            <div className="semanal-dias">
                                {DIAS.map(([clave, nombre]) => {
                                    const del = semanal.map((b, i) => ({ ...b, i })).filter((b) => b.dia === clave);
                                    return (
                                        <div className="semanal-dia" key={clave}>
                                            <div className="semanal-nombre">{nombre}</div>
                                            <div className="semanal-bloques">
                                                {del.length === 0 && <span className="cell-sub">No atiende</span>}
                                                {del.map((b) => (
                                                    <div className="semanal-bloque" key={b.i}>
                                                        <input aria-label={`${nombre} desde`} type="time" step="300" value={b.desde} onChange={(e) => cambiarBloque(b.i, "desde", e.target.value)} />
                                                        <span>–</span>
                                                        <input aria-label={`${nombre} hasta`} type="time" step="300" value={b.hasta} onChange={(e) => cambiarBloque(b.i, "hasta", e.target.value)} />
                                                        <button type="button" className="link-btn link-danger" onClick={() => quitarBloque(b.i)}>Quitar</button>
                                                    </div>
                                                ))}
                                                <button type="button" className="link-btn" onClick={() => agregarBloque(clave)}>+ Agregar horas</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button type="button" className="btn btn-primary" disabled={!semanalOk || guardandoSem} onClick={guardarSemanal}>
                                {guardandoSem ? "Guardando…" : "Guardar horario semanal"}
                            </button>
                        </>
                    )}
                </section>
            )}

            <h2 className="semanal-sub">Agregar un día puntual</h2>
            <p className="cell-sub">Para una excepción de una sola fecha, fuera de tu horario semanal.</p>
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
                <div className="horario-submit">
                    <button className="btn btn-primary" disabled={!formOk || guardando}>
                        {guardando ? "Creando…" : "Crear horario"}
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
                                <th scope="col" className="plain-th">Citas</th>
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
                                        <span>Guarda tu horario semanal para generarlos.</span>
                                    </div>
                                </td></tr>
                            )}
                            {franjas && franjas.map((f) => {
                                const completa = f.estado !== "DISPONIBLE";
                                return (
                                    <tr key={f.idAgenda} className={quitando === f.idAgenda ? "row-confirm" : undefined}>
                                        <td className="cell-name">{fmtDia.format(new Date(f.inicio))}</td>
                                        <td className="nowrap">{fmtHora.format(new Date(f.inicio))} – {fmtHora.format(new Date(f.fin))}</td>
                                        <td>
                                            <span className={`badge badge-${f.estado.toLowerCase()}`}>{completa ? "Completo" : "Con espacio"}</span>
                                            <span className="cell-sub"> · {f.citas === 0 ? "sin citas" : `${f.citas} ${f.citas === 1 ? "cita" : "citas"}`}</span>
                                        </td>
                                        <td className="cell-actions">
                                            {f.citasTotales === 0 && quitando !== f.idAgenda && (
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
