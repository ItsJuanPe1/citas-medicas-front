import { Fragment, useEffect, useState } from "react";
import { api } from "../api";
import ConsultaForm from "../components/ConsultaForm";
import RecetaForm from "../components/RecetaForm";
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
    const [intento, setIntento] = useState(0);
    const [ahora, setAhora] = useState(() => Date.now());
    const [abierta, setAbierta] = useState(null); // { id, tipo: "consulta" | "receta" } del formulario abierto

    // Reloj: el boton "Registrar consulta" aparece solo cuando llega la hora de la cita
    useEffect(() => {
        const t = setInterval(() => setAhora(Date.now()), 30_000);
        return () => clearInterval(t);
    }, []);

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
    }, [historial, intento, toast]);

    function cambiar(valor) {
        setHistorial(valor);
        setAbierta(null);
        setCitas(null);
    }

    function formGuardado() {
        setAbierta(null);
        setCitas(null);
        setIntento((n) => n + 1);
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
                            <th scope="col" className="plain-th"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {citas === null &&
                            Array.from({ length: 4 }, (_, i) => (
                                <tr key={i}>
                                    {[45, 55, 30, 20].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}
                                </tr>
                            ))}
                        {citas && citas.length === 0 && (
                            <tr>
                                <td colSpan={4}>
                                    <div className="state">
                                        <strong>{historial ? "Sin citas registradas" : "No tienes citas próximas"}</strong>
                                        <span>Cuando un paciente reserve contigo aparecerá aquí.</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {citas && citas.map((c) => (
                            <Fragment key={c.idCita}>
                                <tr>
                                    <td className="cell-name">{fmtFecha.format(new Date(c.inicio))}</td>
                                    <td>
                                        {c.paciente}<span className="cell-sub"> · {c.documento}</span>
                                        {c.diagnostico && <span className="motivo"><strong>Diagnóstico:</strong> {c.diagnostico}</span>}
                                        {c.notas && <span className="motivo">{c.notas}</span>}
                                        {c.receta && <span className="motivo"><strong>Receta ({c.estadoReceta?.toLowerCase()}):</strong> {c.receta}</span>}
                                    </td>
                                    <td><span className={`badge badge-${c.estado.toLowerCase()}`}>{c.estado}</span></td>
                                    <td className="cell-actions">
                                        {c.estado === "PROGRAMADA" && new Date(c.inicio).getTime() > ahora && (
                                            <span className="cell-sub">Disponible desde la hora de la cita</span>
                                        )}
                                        {c.estado === "PROGRAMADA" && new Date(c.inicio).getTime() <= ahora && abierta?.id !== c.idCita && (
                                            <button type="button" className="link-btn" onClick={() => setAbierta({ id: c.idCita, tipo: "consulta" })}>
                                                Registrar consulta
                                            </button>
                                        )}
                                        {c.estado === "ATENDIDA" && c.idHistoria && !c.receta && abierta?.id !== c.idCita && (
                                            <button type="button" className="link-btn" onClick={() => setAbierta({ id: c.idCita, tipo: "receta" })}>
                                                Recetar
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {abierta?.id === c.idCita && (
                                    <tr className="row-form">
                                        <td colSpan={4}>
                                            {abierta.tipo === "consulta"
                                                ? <ConsultaForm idCita={c.idCita} onDone={formGuardado} onCancel={() => setAbierta(null)} />
                                                : <RecetaForm idHistoria={c.idHistoria} onDone={formGuardado} onCancel={() => setAbierta(null)} />}
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
