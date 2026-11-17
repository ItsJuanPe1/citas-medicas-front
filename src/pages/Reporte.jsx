import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hace = (dias) => { const d = new Date(); d.setDate(d.getDate() - dias); return iso(d); };

function Tile({ titulo, valor, ancho, children }) {
    return (
        <div style={{
            background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "14px 16px",
            gridColumn: ancho ? "1 / -1" : undefined
        }}>
            <div className="cell-sub">{titulo}</div>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 700 }}>{valor}</div>
            {children}
        </div>
    );
}

function Estado({ n, texto }) {
    return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>
            <strong style={{ color: "var(--ink)", fontSize: "var(--text-lg)" }}>{n}</strong>
            <span>{texto}</span>
        </div>
    );
}

/** HU10: resumen de citas atendidas, canceladas y recetas emitidas en un periodo. */
export default function Reporte() {
    const toast = useToast();
    const [desde, setDesde] = useState(hace(30));
    const [hasta, setHasta] = useState(iso(new Date()));
    const [datos, setDatos] = useState(null); // null = cargando

    const rangoValido = desde && hasta && desde <= hasta;

    useEffect(() => {
        if (!rangoValido) return;
        let activo = true;
        api(`/reportes/periodo?desde=${desde}&hasta=${hasta}`)
            .then((d) => activo && setDatos(d))
            .catch((e) => {
                if (!activo) return;
                setDatos(false);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [desde, hasta, rangoValido, toast]);

    function cambiar(setter) {
        return (e) => { setter(e.target.value); setDatos(null); };
    }

    function descargar() {
        const filas = [["Medico", "Especialidad", "Atendidas", "Canceladas", "No asistio", "Programadas", "Recetas"],
        ...datos.medicos.map((m) => [m.medico, m.especialidad, m.atendidas, m.canceladas, m.noAsistio, m.programadas, m.recetas])];
        const csv = filas.map((f) => f.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
        a.download = `reporte_${desde}_a_${hasta}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    const r = datos?.resumen;
    const totalCitas = r ? r.programadas + r.atendidas + r.canceladas + r.noAsistio : 0;

    return (
        <Shell>
            <div className="page-head">
                <h1>Reporte de atención y prescripción</h1>
                <p>Citas por estado y recetas emitidas en el periodo elegido.</p>
            </div>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end", marginBottom: 20 }}>
                <div className="field">
                    <label htmlFor="rp-desde">Desde</label>
                    <input id="rp-desde" type="date" max={hasta} value={desde} onChange={cambiar(setDesde)} />
                </div>
                <div className="field">
                    <label htmlFor="rp-hasta">Hasta</label>
                    <input id="rp-hasta" type="date" min={desde} value={hasta} onChange={cambiar(setHasta)} />
                </div>
                <button type="button" className="link-btn" onClick={() => { setDesde(hace(30)); setHasta(iso(new Date())); setDatos(null); }}>Últimos 30 días</button>
                <button type="button" className="link-btn" onClick={() => { setDesde(hace(90)); setHasta(iso(new Date())); setDatos(null); }}>Últimos 90 días</button>
            </div>

            {!rangoValido && <p className="cell-sub">La fecha final no puede ser anterior a la inicial.</p>}
            {rangoValido && datos === null && <p className="cell-sub">Calculando…</p>}

            {rangoValido && datos && (
                <>
                    <p className="cell-sub" style={{ marginBottom: 8 }}>{totalCitas} citas en el periodo</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 12 }}>
                        <Tile titulo="Atendidas" valor={r.atendidas} />
                        <Tile titulo="Canceladas" valor={r.canceladas} />
                        <Tile titulo="No asistió" valor={r.noAsistio} />
                        <Tile titulo="Programadas" valor={r.programadas} />
                        <Tile titulo="Recetas emitidas" valor={r.recetas} ancho>
                            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "6px 32px" }}>
                                <Estado n={r.recetasEntregadas} texto="Entregadas" />
                                <Estado n={r.recetasParciales} texto="Parcialmente entregadas" />
                                <Estado n={r.recetasNoEntregadas} texto="Sin entregar" />
                            </div>
                        </Tile>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 8px" }}>
                        <h2 style={{ fontSize: "var(--text-lg)", margin: 0 }}>Por médico</h2>
                        <button type="button" className="link-btn" disabled={datos.medicos.length === 0} onClick={descargar}>Descargar CSV</button>
                    </div>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col" className="plain-th">Médico</th>
                                    <th scope="col" className="plain-th">Atendidas</th>
                                    <th scope="col" className="plain-th">Canceladas</th>
                                    <th scope="col" className="plain-th">No asistió</th>
                                    <th scope="col" className="plain-th">Programadas</th>
                                    <th scope="col" className="plain-th">Recetas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos.medicos.length === 0 && (
                                    <tr><td colSpan={6}><div className="state"><strong>Sin datos</strong><span>No hay médicos registrados.</span></div></td></tr>
                                )}
                                {datos.medicos.map((m) => (
                                    <tr key={m.idMedico}>
                                        <td><span className="cell-name">{m.medico}</span><span className="cell-sub"> · {m.especialidad}</span></td>
                                        <td>{m.atendidas}</td>
                                        <td>{m.canceladas}</td>
                                        <td>{m.noAsistio}</td>
                                        <td>{m.programadas}</td>
                                        <td>{m.recetas}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Shell>
    );
}