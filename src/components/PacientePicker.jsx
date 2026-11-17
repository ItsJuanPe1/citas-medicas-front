import { useEffect, useState } from "react";
import { api } from "../api";
import { useToast } from "./toast";

/** Buscador de paciente para la recepcionista. value = paciente elegido o null. */
export default function PacientePicker({ value, onChange }) {
    const toast = useToast();
    const [q, setQ] = useState("");
    const [nuevo, setNuevo] = useState(null); // formulario de paciente nuevo
    const [guardando, setGuardando] = useState(false);
    const [resultados, setResultados] = useState(null);
    const [error, setError] = useState(null);

    // Busqueda en vivo: con 2 o mas letras, 300 ms despues de la ultima
    useEffect(() => {
        let activo = true;
        const t = setTimeout(() => {
            const texto = q.trim();
            if (texto.length < 2) {
                setResultados(null);
                return;
            }
            api(`/pacientes?q=${encodeURIComponent(texto)}`)
                .then((d) => {
                    if (!activo) return;
                    setError(null);
                    setResultados(d);
                })
                .catch((err) => activo && setError(err.message));
        }, 300);
        return () => {
            activo = false;
            clearTimeout(t);
        };
    }, [q]);

    const campo = (k) => (e) => setNuevo((f) => ({ ...f, [k]: e.target.value }));
    const nuevoOk = nuevo && /^\d{5,20}$/.test(nuevo.documento) && nuevo.nombre.trim() && nuevo.apellido.trim();

    async function registrar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            const p = await api("/pacientes", {
                method: "POST",
                body: {
                    documento: nuevo.documento.trim(), nombre: nuevo.nombre.trim(), apellido: nuevo.apellido.trim(),
                    fechaNacimiento: nuevo.fechaNacimiento || null, telefono: nuevo.telefono.trim() || null, email: nuevo.email.trim() || null,
                },
            });
            toast.ok("Paciente registrado.");
            setNuevo(null);
            onChange(p);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGuardando(false);
        }
    }

    function cambiar() {
        onChange(null);
        setResultados(null);
    }

    if (value) {
        return (
            <p className="chosen">
                <span>
                    <strong>{value.nombre} {value.apellido}</strong>
                    <span className="cell-sub"> · {value.documento}</span>
                </span>
                <button type="button" className="link-btn" onClick={cambiar}>Cambiar</button>
            </p>
        );
    }

    if (nuevo) {
        return (
            <form className="block contacto-form" onSubmit={registrar} onKeyDown={(e) => e.key === "Escape" && !guardando && setNuevo(null)}>
                <h3>Registrar paciente nuevo</h3>
                <div className="field"><label htmlFor="pn-doc">Documento</label>
                    <input id="pn-doc" type="text" inputMode="numeric" maxLength={20} autoFocus value={nuevo.documento}
                        onChange={(e) => campo("documento")({ target: { value: e.target.value.replace(/\D/g, "") } })} /></div>
                <div className="field"><label htmlFor="pn-nom">Nombre</label>
                    <input id="pn-nom" type="text" maxLength={100} value={nuevo.nombre} onChange={campo("nombre")} /></div>
                <div className="field"><label htmlFor="pn-ape">Apellido</label>
                    <input id="pn-ape" type="text" maxLength={100} value={nuevo.apellido} onChange={campo("apellido")} /></div>
                <div className="field"><label htmlFor="pn-nac">Fecha de nacimiento (opcional)</label>
                    <input id="pn-nac" type="date" value={nuevo.fechaNacimiento} onChange={campo("fechaNacimiento")} /></div>
                <div className="field"><label htmlFor="pn-tel">Teléfono (opcional)</label>
                    <input id="pn-tel" type="tel" maxLength={20} value={nuevo.telefono} onChange={campo("telefono")} /></div>
                <div className="field"><label htmlFor="pn-mail">Correo (opcional)</label>
                    <input id="pn-mail" type="email" maxLength={150} value={nuevo.email} onChange={campo("email")} /></div>
                <div className="cancel-actions">
                    <button className="btn btn-primary" disabled={!nuevoOk || guardando}>{guardando ? "Guardando…" : "Registrar paciente"}</button>
                    <button type="button" className="link-btn" disabled={guardando} onClick={() => setNuevo(null)}>Volver</button>
                </div>
            </form>
        );
    }

    return (
        <>
            <form className="search-row" onSubmit={(e) => e.preventDefault()}>
                <input
                    type="search"
                    aria-label="Buscar paciente por documento o nombre"
                    placeholder="Escribe documento o nombre…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </form>
            {error && <p className="alert">{error}</p>}
            <p className="cell-sub">
                ¿No aparece?{" "}
                <button type="button" className="link-btn"
                    onClick={() => setNuevo({ documento: /^\d+$/.test(q.trim()) ? q.trim() : "", nombre: "", apellido: "", fechaNacimiento: "", telefono: "", email: "" })}>
                    Registrar paciente nuevo
                </button>
            </p>
            {resultados && resultados.length === 0 && <p className="cell-sub">No se encontraron pacientes.</p>}
            {resultados && resultados.length > 0 && (
                <ul className="pick-list">
                    {resultados.map((p) => (
                        <li key={p.id}>
                            <button type="button" onClick={() => onChange(p)}>
                                <strong>{p.nombre} {p.apellido}</strong>
                                <span className="cell-sub">{p.documento}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}
