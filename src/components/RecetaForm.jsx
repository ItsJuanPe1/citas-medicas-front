import { useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "./toast";

const nuevaLinea = () => ({ idMedicamento: "", cantidad: "1", dosis: "" });

const norm = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Buscador de medicamento: escribe parte del nombre y elige de la lista. value = id elegido ("" = ninguno). */
function MedicamentoPicker({ id, catalogo, usados, value, onChange, autoFocus }) {
    const [q, setQ] = useState("");
    const elegido = catalogo.find((m) => String(m.id) === value);

    if (elegido) {
        return (
            <p className="chosen" id={id}>
                <span>
                    <strong>{elegido.nombre}</strong>
                    <span className="cell-sub">{elegido.presentacion ? ` · ${elegido.presentacion}` : ""} · {elegido.disponible} en stock</span>
                </span>
                <button type="button" className="link-btn" onClick={() => { setQ(""); onChange(""); }}>Cambiar</button>
            </p>
        );
    }

    const t = norm(q.trim());
    const opciones = catalogo
        .filter((m) => !usados.has(String(m.id)) && (t === "" || norm(`${m.nombre} ${m.presentacion ?? ""}`).includes(t)))
        .slice(0, 8);

    return (
        <>
            <input id={id} type="search" placeholder="Escribe para buscar…" autoComplete="off" autoFocus={autoFocus}
                value={q} onChange={(e) => setQ(e.target.value)} />
            {opciones.length === 0 && <p className="cell-sub">No hay medicamentos con ese nombre.</p>}
            {opciones.length > 0 && (
                <ul className="pick-list">
                    {opciones.map((m) => (
                        <li key={m.id}>
                            <button type="button" onClick={() => onChange(String(m.id))}>
                                <strong>{m.nombre}</strong>
                                <span className="cell-sub">{m.presentacion ? `${m.presentacion} · ` : ""}{m.disponible} en stock</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

/** HU05: el medico receta medicamentos a partir de una consulta ya registrada. */
export default function RecetaForm({ idHistoria, onDone, onCancel }) {
    const toast = useToast();
    const [catalogo, setCatalogo] = useState(null); // null = cargando
    const [lineas, setLineas] = useState([nuevaLinea()]);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        api("/medicamentos")
            .then((d) => activo && setCatalogo(d))
            .catch((e) => {
                if (!activo) return;
                setCatalogo([]);
                toast.error(e.message);
            });
        return () => {
            activo = false;
        };
    }, [toast]);

    const cambiar = (i, k) => (e) =>
        setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: e.target.value } : l)));
    const quitar = (i) => setLineas((ls) => ls.filter((_, j) => j !== i));

    // un medicamento no puede repetirse: los ya elegidos en otras lineas no salen en la busqueda
    const usados = new Set(lineas.map((l) => l.idMedicamento).filter(Boolean));
    const completa = lineas.length > 0 && lineas.every((l) => l.idMedicamento && Number(l.cantidad) >= 1);

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/recetas", {
                method: "POST",
                body: {
                    idHistoria,
                    items: lineas.map((l) => ({
                        idMedicamento: Number(l.idMedicamento),
                        cantidad: Number(l.cantidad),
                        dosis: l.dosis.trim(),
                    })),
                },
            });
            toast.ok("Receta registrada.");
            onDone();
        } catch (err) {
            toast.error(err.message);
            setGuardando(false);
        }
    }

    return (
        <form
            className="consulta-form receta-form"
            onSubmit={guardar}
            onKeyDown={(e) => e.key === "Escape" && !guardando && onCancel()}
        >
            <h3>Receta</h3>
            {catalogo === null && <p className="cell-sub">Cargando medicamentos…</p>}
            {catalogo && lineas.map((l, i) => (
                <div className="receta-linea" key={i}>
                    <div className="field">
                        <label htmlFor={`rm-${i}`}>Medicamento</label>
                        <MedicamentoPicker id={`rm-${i}`} catalogo={catalogo} usados={usados} value={l.idMedicamento}
                            onChange={(v) => setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, idMedicamento: v } : x)))}
                            autoFocus={i === 0} />
                    </div>
                    <div className="field">
                        <label htmlFor={`rc-${i}`}>Cantidad</label>
                        <input id={`rc-${i}`} type="text" inputMode="numeric" maxLength={5} value={l.cantidad}
                            onChange={(e) => cambiar(i, "cantidad")({ target: { value: e.target.value.replace(/\D/g, "") } })} />
                    </div>
                    <div className="field">
                        <label htmlFor={`rd-${i}`}>Dosis</label>
                        <input id={`rd-${i}`} type="text" maxLength={100} placeholder="Ej.: 1 cada 8 horas" value={l.dosis}
                            onChange={cambiar(i, "dosis")} />
                    </div>
                    {lineas.length > 1 && (
                        <button type="button" className="link-btn link-danger receta-quitar" onClick={() => quitar(i)}>Quitar</button>
                    )}
                </div>
            ))}
            <div>
                <button type="button" className="link-btn"
                    disabled={!catalogo || lineas.length >= 20 || (catalogo && usados.size >= catalogo.length)}
                    onClick={() => setLineas((ls) => [...ls, nuevaLinea()])}>
                    + Agregar otro medicamento
                </button>
            </div>
            <div className="cancel-actions">
                <button className="btn btn-primary" disabled={guardando || !completa}>
                    {guardando ? "Guardando…" : "Guardar receta"}
                </button>
                <button type="button" className="link-btn" disabled={guardando} onClick={onCancel}>Volver</button>
            </div>
        </form>
    );
}
