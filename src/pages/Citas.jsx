import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { eligePaciente } from "../auth/roles";
import PacientePicker from "../components/PacientePicker";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

export default function Citas() {
  const { user } = useAuth();
  const toast = useToast();
  const esRecepcion = eligePaciente(user.rol);

  const [ahora] = useState(() => Date.now());
  const [paciente, setPaciente] = useState(null);
  const [citas, setCitas] = useState(null); // null = cargando
  const [intento, setIntento] = useState(0);
  const [confirmando, setConfirmando] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const necesitaPaciente = esRecepcion && !paciente;

  useEffect(() => {
    if (esRecepcion && !paciente) return;
    let activo = true;
    const query = esRecepcion ? `?idPaciente=${paciente.id}` : "";
    api(`/citas${query}`)
      .then((d) => activo && setCitas(d))
      .catch((e) => {
        if (!activo) return;
        setCitas([]);
        toast.error(e.message);
      });
    return () => {
      activo = false;
    };
  }, [esRecepcion, paciente, intento, toast]);

  function elegirPaciente(p) {
    setPaciente(p);
    setCitas(null);
    setConfirmando(null);
  }

  function abrirCancelacion(id) {
    setMotivo("");
    setConfirmando(id);
  }

  async function cancelar(id) {
    setCancelando(true);
    try {
      await api(`/citas/${id}/cancelar`, { method: "PUT", body: { motivo: motivo.trim() } });
      toast.ok("Cita cancelada. El horario quedó disponible de nuevo.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancelando(false);
      setConfirmando(null);
      setCitas(null);
      setIntento((n) => n + 1);
    }
  }

  return (
    <Shell>
      <div className="page-head">
        <h1>{esRecepcion ? "Citas del paciente" : "Mis citas"}</h1>
        <p>Consulta las citas y cancela las que ya no se necesiten.</p>
      </div>


      {esRecepcion && (
        <div className="block" style={{ marginBottom: 20 }}>
          <PacientePicker value={paciente} onChange={elegirPaciente} />
        </div>
      )}

      {necesitaPaciente ? (
        <div className="state table-wrap">
          <strong>Busca un paciente</strong>
          <span>Escribe su documento o nombre para ver sus citas.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col" className="plain-th">Fecha y hora</th>
                <th scope="col" className="plain-th">Médico</th>
                <th scope="col" className="plain-th">Estado</th>
                <th scope="col" className="plain-th"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {citas === null &&
                Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}>
                    {[45, 55, 30, 20].map((w, j) => (
                      <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>
                    ))}
                  </tr>
                ))}
              {citas && citas.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="state">
                      <strong>Sin citas</strong>
                      <span>Cuando se reserve una cita aparecerá aquí.</span>
                      <Link to="/citas/nueva" className="btn btn-primary btn-link">Reservar cita</Link>
                    </div>
                  </td>
                </tr>
              )}
              {citas && citas.map((c) => {
                const inicio = new Date(c.inicio);
                const cancelable = c.estado === "PROGRAMADA" && inicio.getTime() > ahora;
                return (
                  <Fragment key={c.idCita}>
                    <tr>
                      <td className="cell-name">{fmtFecha.format(inicio)}</td>
                      <td>
                        {c.nombre} {c.apellido}
                        <span className="cell-sub"> · {c.especialidad}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${c.estado.toLowerCase()}`}>{c.estado}</span>
                        {c.motivo && <span className="motivo">Motivo: {c.motivo}</span>}
                      </td>
                      <td className="cell-actions">
                        {cancelable && confirmando !== c.idCita && (
                          <button type="button" className="link-btn link-danger" onClick={() => abrirCancelacion(c.idCita)}>
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                    {confirmando === c.idCita && (
                      <tr className="row-confirm">
                        <td colSpan={4}>
                          <form
                            className="cancel-form"
                            onSubmit={(e) => { e.preventDefault(); cancelar(c.idCita); }}
                            onKeyDown={(e) => e.key === "Escape" && setConfirmando(null)}
                          >
                            <div className="field">
                              <label htmlFor={`motivo-${c.idCita}`}>Motivo de la cancelación</label>
                              <input
                                id={`motivo-${c.idCita}`}
                                type="text"
                                maxLength={255}
                                autoFocus
                                placeholder="Ej.: no puedo asistir ese día"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                              />
                            </div>
                            <div className="cancel-actions">
                              <button className="btn btn-danger" disabled={cancelando || motivo.trim().length < 5}>
                                {cancelando ? "Cancelando…" : "Confirmar cancelación"}
                              </button>
                              <button type="button" className="link-btn" disabled={cancelando} onClick={() => setConfirmando(null)}>
                                Volver
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
