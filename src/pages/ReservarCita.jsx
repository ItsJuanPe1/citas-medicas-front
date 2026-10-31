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

function Franja({ titulo, items, elegido, onElegir }) {
    if (items.length === 0) return null;
    return (
        <div className="period">
            <h3 className="period-title">{titulo}</h3>
            <div className="slot-grid">
                {items.map((h) => (
                    <button
                        key={h.idAgenda}
                        type="button"
                        className="slot"
                        aria-pressed={elegido?.idAgenda === h.idAgenda}
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
    const [horarios, setHorarios] = useState(null); // null = cargando
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
        api(`/agendas/disponibles?idMedico=${idMedico}`)
            .then((d) => activo && setHorarios(d))
            .catch((e) => {
                if (!activo) return;
                setHorarios([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [idMedico, intento, toast]);

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
        setHorarios(null);
        setElegido(null);
        setIntento((n) => n + 1);
    }

    function cambiarMedico(e) {
        setIdMedico(e.target.value);
        setHorarios(null);
        setDia(null);
        setElegido(null);
    }

    async function reservar() {
        setEnviando(true);
        try {
            await api("/citas", {
                method: "POST",
                body: { idAgenda: elegido.idAgenda, idPaciente: esRecepcion ? paciente.id : undefined },
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

                        {horarios === null && (
                            <div className="slot-grid" aria-busy="true">
                                {Array.from({ length: 8 }, (_, i) => <span key={i} className="skeleton slot-skel" />)}
                            </div>
                        )}

                        {horarios && dias.length === 0 && (
                            <div className="state">
                                <strong>Este médico no tiene horarios disponibles</strong>
                                <span>Prueba con otro médico o vuelve más tarde.</span>
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
                        ? `${elegido.nombre} ${elegido.apellido} · ${capitalizar(fmtDiaLargo.format(new Date(elegido.inicio)))}, ${fmtHora.format(new Date(elegido.inicio))}`
                        : "Ningún horario elegido"}
                </p>
                <button type="button" className="btn btn-primary" disabled={!puedeReservar} onClick={reservar}>
                    {enviando ? "Reservando…" : "Reservar cita"}
                </button>
            </div>
        </Shell>
    );
}
