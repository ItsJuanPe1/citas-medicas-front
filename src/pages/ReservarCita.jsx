import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { eligePaciente } from "../auth/roles";
import PacientePicker from "../components/PacientePicker";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const fmtDiaLargo = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });
const fmtDiaCorto = new Intl.DateTimeFormat("es-CO", { weekday: "short" });
const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const fmtRango = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long" });
const aFecha = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sumarDias = (k, n) => {
    const d = new Date(`${k}T00:00:00`);
    d.setDate(d.getDate() + n);
    return aFecha(d);
};

const DURACIONES = [15, 20, 30, 45, 60];
const DURACION_PACIENTE = 30; // el paciente no elige la duracion

const dosd = (n) => String(n).padStart(2, "0");
/** Date -> "2026-11-09T08:30:00" en hora local, sin zona (como la espera el back). */
const aLocalISO = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${dosd(d.getMonth() + 1)}-${dosd(d.getDate())}T${dosd(d.getHours())}:${dosd(d.getMinutes())}:00`;
};

function Franja({ titulo, items, elegido, onElegir }) {
    if (items.length === 0) return null;
    return (
        <div className="period">
            <h3 className="period-title">{titulo}</h3>
            <div className="slot-grid">
                {items.map((h) => (
                    <button
                        key={`${h.idAgenda}-${h.inicio}`}
                        type="button"
                        className="slot"
                        aria-pressed={elegido?.idAgenda === h.idAgenda && elegido?.inicio === h.inicio}
                        onClick={() => onElegir(h)}
                    >
                        <span className="slot-time">{fmtHora.format(new Date(h.inicio))}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function ReservarCita() {
    const { user } = useAuth();
    const toast = useToast();
    const esRecepcion = eligePaciente(user.rol);

    const [medicos, setMedicos] = useState([]);
    const [idMedico, setIdMedico] = useState("");
    const [agendas, setAgendas] = useState(null); // null = cargando
    const [duracion, setDuracion] = useState(DURACION_PACIENTE);
    const [ahora] = useState(() => Date.now());
    const hoy = useMemo(() => aFecha(new Date(ahora)), [ahora]);
    const [desde, setDesde] = useState(null); // null = hoy; si no, primer dia de la semana que se esta viendo
    const inicio = desde ?? hoy;
    const [intento, setIntento] = useState(0);
    const [dia, setDia] = useState(null);
    const [elegido, setElegido] = useState(null);
    const [paciente, setPaciente] = useState(null);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        api("/medicos").then(setMedicos).catch(() => { });
    }, []);

    useEffect(() => {
        if (!idMedico) return;
        let activo = true;
        api(`/agendas/disponibles?idMedico=${idMedico}&desde=${inicio}&dias=7`)
            .then((d) => activo && setAgendas(d))
            .catch((e) => {
                if (!activo) return;
                setAgendas([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [idMedico, inicio, intento, toast]);

    // Cada agenda es un rango de horas; se parte en citas de `duracion` minutos y se quitan los huecos ocupados.
    const horarios = useMemo(() => {
        if (agendas === null) return null;
        const paso = duracion * 60000;
        const libres = [];
        for (const a of agendas) {
            const ini = new Date(a.inicio).getTime();
            const fin = new Date(a.fin).getTime();
            const tramos = a.ocupados.map((o) => [new Date(o.inicio).getTime(), new Date(o.fin).getTime()]);
            for (let t = ini; t + paso <= fin; t += paso) {
                if (t <= ahora) continue;
                if (tramos.some(([oi, ofin]) => oi < t + paso && ofin > t)) continue;
                libres.push({ idAgenda: a.idAgenda, nombre: a.nombre, apellido: a.apellido, inicio: aLocalISO(t), fin: aLocalISO(t + paso) });
            }
        }
        return libres;
    }, [agendas, duracion, ahora]);

    // dia -> horarios de ese dia
    const porDia = useMemo(() => {
        const m = new Map();
        for (const h of horarios ?? []) {
            const k = h.inicio.slice(0, 10);
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(h);
        }
        return m;
    }, [horarios]);
    const dias = [...porDia.keys()];
    const diaActual = dias.includes(dia) ? dia : dias[0];
    const delDia = diaActual ? porDia.get(diaActual) : [];
    const manana = delDia.filter((h) => new Date(h.inicio).getHours() < 12);
    const tarde = delDia.filter((h) => new Date(h.inicio).getHours() >= 12);

    function recargar() {
        setAgendas(null);
        setElegido(null);
        setIntento((n) => n + 1);
    }

    function irA(fecha) {
        setDesde(fecha && fecha > hoy ? fecha : null);
        setAgendas(null);
        setDia(null);
        setElegido(null);
    }

    function cambiarMedico(e) {
        setDesde(null);
        setIdMedico(e.target.value);
        setAgendas(null);
        setDia(null);
        setElegido(null);
    }

    async function reservar() {
        setEnviando(true);
        try {
            await api("/citas", {
                method: "POST",
                body: { idAgenda: elegido.idAgenda, inicio: elegido.inicio, fin: elegido.fin, idPaciente: esRecepcion ? paciente.id : undefined },
            });
            toast.ok(`Cita reservada con ${elegido.nombre} ${elegido.apellido}, ${fmtDiaLargo.format(new Date(elegido.inicio))} a las ${fmtHora.format(new Date(elegido.inicio))}.`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setEnviando(false);
            recargar();
        }
    }

    const puedeReservar = elegido && (!esRecepcion || paciente) && !enviando;

    return (
        <Shell>
            <div className="page-head">
                <h1>Reservar cita</h1>
                <p>{esRecepcion ? "Elige el paciente, el médico y un horario." : "Elige un médico y un horario."}</p>
            </div>


            <div className="form-grid">
                {esRecepcion && (
                    <section className="block" aria-labelledby="t-paciente">
                        <h2 id="t-paciente">Paciente</h2>
                        <PacientePicker value={paciente} onChange={setPaciente} />
                    </section>
                )}

                <section className="block" aria-labelledby="t-medico">
                    <h2 id="t-medico">Médico</h2>
                    <div className="field" style={{ maxWidth: 420 }}>
                        <label htmlFor="medico" className="sr-only">Médico</label>
                        <select id="medico" value={idMedico} onChange={cambiarMedico}>
                            <option value="">Elige un médico</option>
                            {medicos.map((m) => (
                                <option key={m.id} value={m.id}>{m.nombre} {m.apellido} · {m.especialidad}</option>
                            ))}
                        </select>
                    </div>
                </section>

                {idMedico && (
                    <section className="block" aria-labelledby="t-horario">
                        <h2 id="t-horario">Día y hora</h2>

                        {esRecepcion ? (
                            <div className="field" style={{ maxWidth: 220, marginBottom: 12 }}>
                                <label htmlFor="duracion">Duración de la cita</label>
                                <select id="duracion" value={duracion} onChange={(e) => { setDuracion(Number(e.target.value)); setElegido(null); }}>
                                    {DURACIONES.map((n) => <option key={n} value={n}>{n} minutos</option>)}
                                </select>
                            </div>
                        ) : (
                            <p className="cell-sub" style={{ marginBottom: 12 }}>Cada cita dura {DURACION_PACIENTE} minutos.</p>
                        )}

                        <div className="semana-nav" role="group" aria-label="Semana">
                            <button type="button" className="btn" disabled={inicio <= hoy} onClick={() => irA(sumarDias(inicio, -7))}>← Semana anterior</button>
                            <strong>{fmtRango.format(new Date(`${inicio}T00:00:00`))} – {fmtRango.format(new Date(`${sumarDias(inicio, 6)}T00:00:00`))}</strong>
                            <button type="button" className="btn" onClick={() => irA(sumarDias(inicio, 7))}>Semana siguiente →</button>
                            <div className="field semana-fecha">
                                <label htmlFor="ir-fecha">Ir a una fecha</label>
                                <input id="ir-fecha" type="date" min={hoy} value={inicio} onChange={(e) => irA(e.target.value)} />
                            </div>
                        </div>

                        {horarios === null && (
                            <div className="slot-grid" aria-busy="true">
                                {Array.from({ length: 8 }, (_, i) => <span key={i} className="skeleton slot-skel" />)}
                            </div>
                        )}

                        {horarios && dias.length === 0 && (
                            <div className="state">
                                <strong>No hay espacios libres</strong>
                                <span>Prueba con otra duración, con otro médico, o mira otra semana o fecha con los botones de arriba.</span>
                            </div>
                        )}

                        {dias.length > 0 && (
                            <>
                                <div className="day-strip" role="group" aria-label="Día">
                                    {dias.map((k) => {
                                        const d = new Date(`${k}T00:00:00`);
                                        return (
                                            <button
                                                key={k}
                                                type="button"
                                                className="day-chip"
                                                aria-pressed={k === diaActual}
                                                onClick={() => { setDia(k); setElegido(null); }}
                                            >
                                                <span className="day-chip-wd">{fmtDiaCorto.format(d)}</span>
                                                <span className="day-chip-num">{d.getDate()}</span>
                                                <span className="day-chip-n">{porDia.get(k).length} libres</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <p className="day-heading">{capitalizar(fmtDiaLargo.format(new Date(`${diaActual}T00:00:00`)))}</p>
                                <Franja titulo="Mañana" items={manana} elegido={elegido} onElegir={setElegido} />
                                <Franja titulo="Tarde" items={tarde} elegido={elegido} onElegir={setElegido} />
                            </>
                        )}
                    </section>
                )}
            </div>

            <div className="actionbar">
                <p>
                    {elegido
                        ? `${elegido.nombre} ${elegido.apellido} · ${capitalizar(fmtDiaLargo.format(new Date(elegido.inicio)))}, ${fmtHora.format(new Date(elegido.inicio))} a ${fmtHora.format(new Date(elegido.fin))}`
                        : "Ningún horario elegido"}
                </p>
                <button type="button" className="btn btn-primary" disabled={!puedeReservar} onClick={reservar}>
                    {enviando ? "Reservando…" : "Reservar cita"}
                </button>
            </div>
        </Shell>
    );
}