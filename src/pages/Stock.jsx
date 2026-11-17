import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

/** Stock de la farmacia: ver cantidades, medicamentos bajo el minimo y reponer. */
export default function Stock() {
    const toast = useToast();
    const [q, setQ] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filas, setFilas] = useState(null); // null = cargando
    const [intento, setIntento] = useState(0);
    const [abierto, setAbierto] = useState(null); // idMedicamento con el campo de reposicion abierto
    const [cant, setCant] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        api(`/farmacia/stock?q=${encodeURIComponent(busqueda)}`)
            .then((d) => activo && setFilas(d))
            .catch((e) => {
                if (!activo) return;
                setFilas([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [busqueda, intento, toast]);

    // Busqueda en vivo
    useEffect(() => {
        const t = setTimeout(() => setBusqueda(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    async function reponer(f) {
        setGuardando(true);
        try {
            const r = await api(`/farmacia/stock/${f.idMedicamento}/reposicion`, { method: "POST", body: { cantidad: Number(cant) } });
            toast.ok(`${f.medicamento}: ahora hay ${r.disponible} en stock.`);
            setAbierto(null);
            setCant("");
            setFilas(null);
            setIntento((n) => n + 1);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGuardando(false);
        }
    }

    const bajos = filas ? filas.filter((f) => f.disponible < f.minimo).length : 0;

    return (
        <Shell>
            <div className="page-head">
                <h1>Stock</h1>
                <p>{filas ? (bajos > 0 ? `${bajos} medicamentos por debajo del mínimo` : "Todo el stock está sobre el mínimo") : "Cargando…"}</p>
            </div>

            <div className="search-row toolbar">
                <input type="search" placeholder="Buscar medicamento" aria-label="Buscar medicamento" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col" className="plain-th">Medicamento</th>
                            <th scope="col" className="plain-th">Disponible</th>
                            <th scope="col" className="plain-th">Mínimo</th>
                            <th scope="col" className="plain-th"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filas === null &&
                            Array.from({ length: 6 }, (_, i) => (
                                <tr key={i}>{[50, 15, 15, 20].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}</tr>
                            ))}
                        {filas && filas.length === 0 && (
                            <tr><td colSpan={4}><div className="state"><strong>Sin resultados</strong><span>No hay medicamentos con ese nombre.</span></div></td></tr>
                        )}
                        {filas && filas.map((f) => {
                            const bajo = f.disponible < f.minimo;
                            return (
                                <tr key={f.idMedicamento}>
                                    <td>
                                        <span className="cell-name">{f.medicamento}</span>
                                        {f.presentacion && <span className="cell-sub"> · {f.presentacion}</span>}
                                    </td>
                                    <td>
                                        {f.disponible} {bajo && <span className="badge badge-cancelada">Bajo el mínimo</span>}
                                    </td>
                                    <td>{f.minimo}</td>
                                    <td className="cell-actions">
                                        {abierto === f.idMedicamento ? (
                                            <form className="search-row" onSubmit={(e) => { e.preventDefault(); if (Number(cant) >= 1) reponer(f); }}
                                                onKeyDown={(e) => e.key === "Escape" && !guardando && setAbierto(null)}>
                                                <input type="text" inputMode="numeric" maxLength={6} autoFocus placeholder="Cantidad" aria-label="Cantidad a reponer"
                                                    style={{ width: 100 }} value={cant} onChange={(e) => setCant(e.target.value.replace(/\D/g, ""))} />
                                                <button className="btn btn-primary" disabled={guardando || Number(cant) < 1}>{guardando ? "Guardando…" : "Reponer"}</button>
                                                <button type="button" className="link-btn" disabled={guardando} onClick={() => setAbierto(null)}>Cancelar</button>
                                            </form>
                                        ) : (
                                            <button type="button" className="link-btn" onClick={() => { setAbierto(f.idMedicamento); setCant(""); }}>Reponer</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Shell>
    );
}
