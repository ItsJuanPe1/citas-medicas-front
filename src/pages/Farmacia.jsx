import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const fmtFecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

/** Confirmacion de entrega: el farmaceutico elige cuantas unidades entrega (puede ser parcial). */
function EntregaModal({ p, entregando, onConfirmar, onCancelar }) {
    const max = Math.min(p.pendiente, p.stock);
    const [cant, setCant] = useState(String(max));
    const n = Number(cant);
    const valida = Number.isInteger(n) && n >= 1 && n <= max;
    const quedan = p.pendiente - (valida ? n : 0);

    return (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !entregando && onCancelar()}>
            <form
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="entrega-titulo"
                onSubmit={(e) => { e.preventDefault(); if (valida) onConfirmar(n); }}
                onKeyDown={(e) => e.key === "Escape" && !entregando && onCancelar()}
            >
                <h2 id="entrega-titulo">Confirmar entrega</h2>
                <p>
                    <strong>{p.medicamento}</strong>{p.presentacion && <span className="cell-sub"> · {p.presentacion}</span>}
                    <span className="motivo">Paciente: {p.paciente} · {p.documento}</span>
                    <span className="motivo">Pendiente: {p.pendiente} de {p.cantidad} · Stock: {p.stock}</span>
                </p>
                <div className="field" style={{ maxWidth: 200 }}>
                    <label htmlFor="entrega-cant">Unidades a entregar (máx. {max})</label>
                    <input id="entrega-cant" type="text" inputMode="numeric" maxLength={5} autoFocus value={cant}
                        onChange={(e) => setCant(e.target.value.replace(/\D/g, ""))} />
                </div>
                {valida && quedan > 0 && <p className="cell-sub">Quedarán {quedan} pendientes de entregar.</p>}
                {valida && quedan === 0 && <p className="cell-sub">Con esto se completa la entrega.</p>}
                <div className="cancel-actions">
                    <button className="btn btn-primary" disabled={!valida || entregando}>
                        {entregando ? "Entregando…" : "Confirmar entrega"}
                    </button>
                    <button type="button" className="link-btn" disabled={entregando} onClick={onCancelar}>Cancelar</button>
                </div>
            </form>
        </div>
    );
}

/** HU05: el farmaceutico entrega los medicamentos recetados y se descuenta el stock. */
export default function Farmacia() {
    const toast = useToast();
    const [documento, setDocumento] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [pendientes, setPendientes] = useState(null); // null = cargando
    const [intento, setIntento] = useState(0);
    const [entregando, setEntregando] = useState(null);
    const [modal, setModal] = useState(null); // pendiente que se esta confirmando

    useEffect(() => {
        let activo = true;
        api(`/farmacia/pendientes${busqueda ? `?documento=${encodeURIComponent(busqueda)}` : ""}`)
            .then((d) => activo && setPendientes(d))
            .catch((e) => {
                if (!activo) return;
                setPendientes([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [busqueda, intento, toast]);

    function buscar(e) {
        e.preventDefault();
        setPendientes(null);
        setBusqueda(documento.trim());
    }

    async function entregar(p, cantidad) {
        setEntregando(p.idDetalle);
        try {
            const r = await api(`/farmacia/entregas/${p.idDetalle}`, { method: "POST", body: { cantidad } });
            toast.ok(
                r.pendientes === 0
                    ? `${p.medicamento}: entregado completo (${r.entregadas}).`
                    : `${p.medicamento}: se entregaron ${r.entregadas}; quedan ${r.pendientes} pendientes.`
            );
            setPendientes(null);
            setIntento((n) => n + 1);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setEntregando(null);
            setModal(null);
        }
    }

    return (
        <Shell>
            <div className="page-head">
                <h1>Farmacia</h1>
                <p>{pendientes ? `${pendientes.length} medicamentos por entregar` : "Cargando…"}</p>
            </div>

            <form className="search-row toolbar" onSubmit={buscar}>
                <input type="search" placeholder="Documento del paciente" aria-label="Documento del paciente"
                    value={documento} onChange={(e) => setDocumento(e.target.value)} />
                <button className="btn btn-secondary">Buscar</button>
            </form>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th scope="col" className="plain-th">Paciente</th>
                            <th scope="col" className="plain-th">Medicamento</th>
                            <th scope="col" className="plain-th">Pendiente</th>
                            <th scope="col" className="plain-th">Stock</th>
                            <th scope="col" className="plain-th"><span className="sr-only">Acciones</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendientes === null &&
                            Array.from({ length: 5 }, (_, i) => (
                                <tr key={i}>{[40, 45, 15, 12, 18].map((w, j) => <td key={j}><span className="skeleton" style={{ width: `${w}%` }} /></td>)}</tr>
                            ))}
                        {pendientes && pendientes.length === 0 && (
                            <tr><td colSpan={5}>
                                <div className="state">
                                    <strong>No hay medicamentos pendientes</strong>
                                    <span>{busqueda ? "Ese paciente no tiene entregas por hacer." : "Cuando un médico emita una receta aparecerá aquí."}</span>
                                </div>
                            </td></tr>
                        )}
                        {pendientes && pendientes.map((p) => {
                            const sinStock = p.stock <= 0;
                            return (
                                <tr key={p.idDetalle}>
                                    <td>
                                        <span className="cell-name">{p.paciente}</span>
                                        <span className="cell-sub"> · {p.documento}</span>
                                        <span className="motivo">Receta del {fmtFecha.format(new Date(p.emitida))}</span>
                                    </td>
                                    <td>
                                        {p.medicamento}
                                        {p.presentacion && <span className="cell-sub"> · {p.presentacion}</span>}
                                        {p.dosis && <span className="motivo">{p.dosis}</span>}
                                    </td>
                                    <td className="nowrap">{p.pendiente} de {p.cantidad}</td>
                                    <td className="nowrap">
                                        {sinStock ? <span className="badge badge-cancelada">Sin stock</span> : p.stock}
                                    </td>
                                    <td className="cell-actions">
                                        <button type="button" className="btn btn-primary"
                                            disabled={sinStock || entregando !== null}
                                            onClick={() => setModal(p)}>
                                            {p.stock < p.pendiente && !sinStock ? "Entregar parcial" : "Entregar"}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {modal && (
                <EntregaModal p={modal} entregando={entregando !== null}
                    onConfirmar={(n) => entregar(modal, n)} onCancelar={() => setModal(null)} />
            )}
        </Shell>
    );
}
