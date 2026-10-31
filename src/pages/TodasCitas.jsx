import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

export default function TodasCitas() {
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
    }, [filtros]);

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
                        </tr>
                    </thead>
                    <tbody>
                        {citas === null &&
                            Array.from({ length: 5 }, (_, i) => (
                                <tr key={i}>
                                    {[45, 50, 50, 30].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}
                                </tr>
                            ))}
                        {citas && citas.length === 0 && (
                            <tr>
                                <td colSpan={4}>
                                    <div className="state">
                                        <strong>Sin citas con estos filtros</strong>
                                        <span>Cambia o quita algún filtro.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {citas && citas.map((c) => (
                            <tr key={c.idCita}>
                                <td className="cell-name">{fmtFecha.format(new Date(c.inicio))}</td>
                                <td>{c.paciente}<span className="cell-sub"> · {c.documento}</span></td>
                                <td>{c.medico}<span className="cell-sub"> · {c.especialidad}</span></td>
                                <td>
                                    <span className={`badge badge-${c.estado.toLowerCase()}`}>{c.estado}</span>
                                    {c.motivo && <span className="motivo">Motivo: {c.motivo}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Shell>
    );
}
