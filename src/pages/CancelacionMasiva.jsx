import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
const fmtDia = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** HU09: el administrador cancela todas las citas de un medico en una fecha por un imprevisto. */
export default function CancelacionMasiva() {
    const toast = useToast();
    const [medicos, setMedicos] = useState([]);
    const [idMedico, setIdMedico] = useState("");
    const [fecha, setFecha] = useState(hoyISO());
    const [motivo, setMotivo] = useState("");
    const [citas, setCitas] = useState(null); // null = sin consultar / cargando
    const [confirmando, setConfirmando] = useState(false);
    const [cancelando, setCancelando] = useState(false);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        api("/medicos").then(setMedicos).catch((e) => toast.error(e.message));
    }, [toast]);

    // Vista previa: cada vez que cambia el medico o la fecha
    useEffect(() => {
        if (!idMedico || !fecha || fecha < hoyISO()) return;
        let activo = true;
        api(`/admin/citas/cancelacion-masiva/previa?idMedico=${idMedico}&fecha=${fecha}`)
            .then((d) => activo && setCitas(d))
            .catch((e) => {
                if (!activo) return;
                setCitas([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [idMedico, fecha, intento, toast]);

    function cambiar(setter) {
        return (e) => {
            setter(e.target.value);
            setCitas(null);
            setConfirmando(false);
        };
    }

    const medico = medicos.find((m) => String(m.id) === idMedico);
    const motivoInvalido = motivo.trim().length > 0 && motivo.trim().length < 5;
    const fechaPasada = fecha < hoyISO();

    async function cancelar() {
        setCancelando(true);
        try {
            const r = await api("/admin/citas/cancelacion-masiva", {
                method: "POST",
                body: { idMedico: Number(idMedico), fecha, motivo: motivo.trim() },
            });
            toast.ok(r.canceladas === 0
                ? "No había citas programadas ese día. Se bloqueó su agenda."
                : `Se cancelaron ${r.canceladas} citas. La agenda de ese día quedó bloqueada.`);
            setConfirmando(false);
            setMotivo("");
            setCitas(null);
            setIntento((n) => n + 1);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCancelando(false);
        }
    }

    return (
        <Shell>
            <div className="page-head">
                <h1>Cancelación por inasistencia médica</h1>
                <p>Cancela todas las citas programadas de un médico en una fecha y bloquea su agenda de ese día.</p>
            </div>

            <div className="consulta-form" style={{ maxWidth: 560 }}>
                <div className="field">
                    <label htmlFor="cm-medico">Médico</label>
                    <select id="cm-medico" value={idMedico} onChange={cambiar(setIdMedico)}>
                        <option value="">Elige un médico…</option>
                        {medicos.map((m) => (
                            <option key={m.id} value={m.id}>{m.nombre} {m.apellido} · {m.especialidad}</option>
                        ))}
                    </select>
                </div>
                <div className="field" style={{ maxWidth: 220 }}>
                    <label htmlFor="cm-fecha">Fecha</label>
                    <input id="cm-fecha" type="date" min={hoyISO()} value={fecha} onChange={cambiar(setFecha)} />
                    {fechaPasada && <span className="cell-sub">Elige hoy o una fecha futura.</span>}
                </div>
                <div className="field">
                    <label htmlFor="cm-motivo">Motivo <span className="cell-sub">(opcional; lo ve el paciente)</span></label>
                    <input id="cm-motivo" type="text" maxLength={200} placeholder="Ej.: Incapacidad médica" value={motivo}
                        onChange={(e) => setMotivo(e.target.value)} />
                    {motivoInvalido && <span className="cell-sub">Mínimo 5 caracteres.</span>}
                </div>
            </div>

            {idMedico && !fechaPasada && (
                <div className="table-wrap" style={{ marginTop: 20 }}>
                    <table>
                        <thead>
                            <tr>
                                <th scope="col" className="plain-th">Hora</th>
                                <th scope="col" className="plain-th">Paciente</th>
                                <th scope="col" className="plain-th">Documento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {citas === null && Array.from({ length: 3 }, (_, i) => (
                                <tr key={i}>{[20, 50, 30].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}</tr>
                            ))}
                            {citas && citas.length === 0 && (
                                <tr><td colSpan={3}><div className="state"><strong>Sin citas programadas</strong><span>Ese día el médico no tiene citas por cancelar. Igual puedes bloquear su agenda.</span></div></td></tr>
                            )}
                            {citas && citas.map((c) => (
                                <tr key={c.idCita}>
                                    <td className="cell-name">{fmtHora.format(new Date(c.inicio))}</td>
                                    <td>{c.paciente}</td>
                                    <td>{c.documento}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {idMedico && !fechaPasada && citas && (
                <div style={{ marginTop: 16 }}>
                    {!confirmando ? (
                        <button type="button" className="btn btn-primary" disabled={motivoInvalido} onClick={() => setConfirmando(true)}>
                            {citas.length > 0 ? `Cancelar ${citas.length} citas` : "Bloquear agenda del día"}
                        </button>
                    ) : (
                        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !cancelando && setConfirmando(false)}>
                            <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cm-titulo"
                                onKeyDown={(e) => e.key === "Escape" && !cancelando && setConfirmando(false)}>
                                <h2 id="cm-titulo">Confirmar cancelación</h2>
                                <p>
                                    Se cancelarán <strong>{citas.length}</strong> citas de <strong>{medico?.nombre} {medico?.apellido}</strong> el{" "}
                                    {fmtDia.format(new Date(`${fecha}T00:00:00`))} y su agenda de ese día quedará bloqueada. No se puede deshacer.
                                </p>
                                <div className="cancel-actions">
                                    <button className="btn btn-primary" disabled={cancelando} onClick={cancelar}>
                                        {cancelando ? "Cancelando…" : "Sí, cancelar"}
                                    </button>
                                    <button type="button" className="link-btn" disabled={cancelando} onClick={() => setConfirmando(false)}>Volver</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Shell>
    );
}
