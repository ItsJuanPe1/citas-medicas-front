import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { REGISTRAR_CONSULTA } from "../auth/roles";
import ConsultaForm from "../components/ConsultaForm";
import Shell from "../components/Shell";

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

export default function TodasCitas() {
    const { user } = useAuth();
    const puedeConsulta = REGISTRAR_CONSULTA.includes(user.rol); // superadmin
    const columnas = puedeConsulta ? 5 : 4;
    const [intento, setIntento] = useState(0);
    const [abierta, setAbierta] = useState(null);
    const [medicos, setMedicos] = useState([]);
    const [filtros, setFiltros] = useState({ estado: "", idMedico: "", desde: "", hasta: "" });
    const [citas, setCitas] = useState(null); // null = cargando
    const [error, setError] = useState(null);

    useEffect(() => {
        api("/medicos").then(setMedicos).catch(() => { });
    }, []);

    useEffect(() => {
        let activo = true;
        const p = new URLSearchParams();
        for (const [k, v] of Object.entries(filtros)) if (v) p.set(k, v);
        api(`/admin/citas?${p}`)
            .then((d) => activo && setCitas(d))
            .catch((e) => {
                if (!activo) return;
                setCitas([]);
                setError(e.message);
            });
        return () => {
            activo = false;
        };
    }, [filtros, intento]);

    function consultaGuardada() {
        setAbierta(null);
        setCitas(null);
        setIntento((n) => n + 1);
    }

    function cambiar(campo) {
        return (e) => {
            setFiltros((f) => ({ ...f, [campo]: e.target.value }));
            setCitas(null);
            setError(null);
        };
    }

    return (
        <Shell>
            <div className="page-head">
                <h1>Todas las citas</h1>
                <p>{citas ? `${citas.length} citas${citas.length === 200 ? " (se muestran las 200 más recientes)" : ""}` : "Cargando…"}</p>
            </div>

            <div className="filters">
                <div className="field">
                    <label htmlFor="f-estado">Estado</label>
                    <select id="f-estado" value={filtros.estado} onChange={cambiar("estado")}>
                        <option value="">Todos</option>
                        <option value="PROGRAMADA">Programada</option>
                        <option value="ATENDIDA">Atendida</option>
                        <option value="CANCELADA">Cancelada</option>
                        <option value="NO_ASISTIO">No asistió</option>
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="f-medico">Médico</label>
                    <select id="f-medico" value={filtros.idMedico} onChange={cambiar("idMedico")}>
                        <option value="">Todos</option>
                        {medicos.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.apellido}</option>)}
                    </select>
                </div>
                <div className="field">
                    <label htmlFor="f-desde">Desde</label>
                    <input id="f-desde" type="date" value={filtros.desde} onChange={cambiar("desde")} />
                </div>
                <div className="field">
                    <label htmlFor="f-hasta">Hasta</label>
                    <input id="f-hasta" type="date" value={filtros.hasta} onChange={cambiar("hasta")} />
                </div>
            </div>

            {error && <p className="alert" role="alert">{error}</p>}

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col" className="plain-th">Fecha y hora</th>
                            <th scope="col" className="plain-th">Paciente</th>
                            <th scope="col" className="plain-th">Médico</th>
                            <th scope="col" className="plain-th">Estado</th>
                            {puedeConsulta && <th scope="col" className="plain-th"><span className="sr-only">Acciones</span></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {citas === null &&
                            Array.from({ length: 5 }, (_, i) => (
                                <tr key={i}>
                                    {[45, 50, 50, 30, 20].slice(0, columnas).map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}
                                </tr>
                            ))}
                        {citas && citas.length === 0 && (
                            <tr>
                                <td colSpan={columnas}>
                                    <div className="state">
                                        <strong>Sin citas con estos filtros</strong>
                                        <span>Cambia o quita algún filtro.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {citas && citas.map((c) => (
                            <Fragment key={c.idCita}>
                                <tr>
                                    <td className="cell-name">{fmtFecha.format(new Date(c.inicio))}</td>
                                    <td>{c.paciente}<span className="cell-sub"> · {c.documento}</span></td>
                                    <td>{c.medico}<span className="cell-sub"> · {c.especialidad}</span></td>
                                    <td>
                                        <span className={`badge badge-${c.estado.toLowerCase()}`}>{c.estado}</span>
                                        {c.motivo && <span className="motivo">Motivo: {c.motivo}</span>}
                                    </td>
                                    {puedeConsulta && (
                                        <td className="cell-actions">
                                            {c.estado === "PROGRAMADA" && abierta !== c.idCita && (
                                                <button type="button" className="link-btn" onClick={() => setAbierta(c.idCita)}>
                                                    Registrar consulta
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                                {abierta === c.idCita && (
                                    <tr className="row-form">
                                        <td colSpan={columnas}>
                                            <ConsultaForm idCita={c.idCita} onDone={consultaGuardada} onCancel={() => setAbierta(null)} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </Shell>
    );
}
