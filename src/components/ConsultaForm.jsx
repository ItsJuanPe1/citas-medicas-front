import { useState } from "react";
import { api } from "../api";
import { useToast } from "./toast";

/** Formulario de HU03: diagnostico y notas de una cita. onDone() se llama al guardar. */
export default function ConsultaForm({ idCita, onDone, onCancel }) {
    const toast = useToast();
    const [diagnostico, setDiagnostico] = useState("");
    const [notas, setNotas] = useState("");
    const [guardando, setGuardando] = useState(false);

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/historias", {
                method: "POST",
                body: { idCita, diagnostico: diagnostico.trim(), notas: notas.trim() },
            });
            toast.ok("Consulta registrada. La cita quedó como ATENDIDA.");
            onDone();
        } catch (err) {
            toast.error(err.message);
            setGuardando(false);
        }
    }

    return (
        <form
            className="consulta-form"
            onSubmit={guardar}
            onKeyDown={(e) => e.key === "Escape" && !guardando && onCancel()}
        >
            <div className="field">
                <label htmlFor={`dx-${idCita}`}>Diagnóstico</label>
                <input
                    id={`dx-${idCita}`}
                    type="text"
                    maxLength={2000}
                    autoFocus
                    placeholder="Ej.: Gripa común"
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                />
            </div>
            <div className="field">
                <label htmlFor={`notas-${idCita}`}>Notas médicas <span className="cell-sub">(opcional)</span></label>
                <textarea
                    id={`notas-${idCita}`}
                    maxLength={4000}
                    rows={4}
                    placeholder="Observaciones, indicaciones, próximos controles…"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                />
            </div>
            <div className="cancel-actions">
                <button className="btn btn-primary" disabled={guardando || diagnostico.trim().length < 3}>
                    {guardando ? "Guardando…" : "Guardar consulta"}
                </button>
                <button type="button" className="link-btn" disabled={guardando} onClick={onCancel}>
                    Volver
                </button>
            </div>
        </form>
    );
}
