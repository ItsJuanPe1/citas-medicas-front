import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
});

/** Citas del medico autenticado. Base para HU03: aqui se agrega "Registrar consulta". */
export default function MiAgenda() {
    const toast = useToast();
    const [historial, setHistorial] = useState(false);
    const [citas, setCitas] = useState(null); // null = cargando

    useEffect(() => {
        let activo = true;
        api(`/medico/citas?historial=${historial}`)
            .then((d) => activo && setCitas(d))
            .catch((e) => {
                if (!activo) return;
                setCitas([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [historial, toast]);

    function cambiar(valor) {
        setHistorial(valor);
        setCitas(null);
    }

    return (
        <Shell>
            <div className="page-head">
                <h1>Mi agenda</h1>
                <p>{historial ? "Todas tus citas, las más recientes primero." : "Tus citas programadas desde hoy."}</p>
            </div>

            <div className="segmented" role="group" aria-label="Qué citas ver">
                <button type="button" aria-pressed={!historial} onClick={() => cambiar(false)}>Próximas</button>
                <button type="button" aria-pressed={historial} onClick={() => cambiar(true)}>Historial</button>
            </div>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col" className="plain-th">Fecha y hora</th>
                            <th scope="col" className="plain-th">Paciente</th>
                            <th scope="col" className="plain-th">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {citas === null &&
                            Array.from({ length: 4 }, (_, i) => (
                                <tr key={i}>
                                    {[45, 55, 30].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}
                                </tr>
                            ))}
                        {citas && citas.length === 0 && (
                            <tr>
                                <td colSpan={3}>
                                    <div className="state">
                                        <strong>{historial ? "Sin citas registradas" : "No tienes citas próximas"}</strong>
                                        <span>Cuando un paciente reserve contigo aparecerá aquí.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {citas && citas.map((c) => (
                            <tr key={c.idCita}>
                                <td className="cell-name">{fmtFecha.format(new Date(c.inicio))}</td>
                                <td>{c.paciente}<span className="cell-sub"> · {c.documento}</span></td>
                                <td><span className={`badge badge-${c.estado.toLowerCase()}`}>{c.estado}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Shell>
    );
}
