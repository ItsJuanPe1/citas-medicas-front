import { useEffect, useState } from "react";
import { api } from "../api";
import Shell from "../components/Shell";
import { useToast } from "../components/toast";

const ROLES = {
    SUPERADMIN: "Superadmin", GERENTE: "Gerente", RECEPCIONISTA: "Recepcionista",
    MEDICO: "Médico", PACIENTE: "Paciente", FARMACEUTICO: "Farmacéutico",
};

function Dato({ titulo, valor }) {
    return (
        <div className="dato">
            <dt>{titulo}</dt>
            <dd>{valor || "—"}</dd>
        </div>
    );
}

export default function Perfil() {
    const toast = useToast();
    const [perfil, setPerfil] = useState(null); // null = cargando
    const [contacto, setContacto] = useState({ telefono: "", email: "" });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        let activo = true;
        api("/perfil")
            .then((p) => {
                if (!activo) return;
                setPerfil(p);
                setContacto({ telefono: p.telefono ?? "", email: p.email ?? "" });
            })
            .catch((e) => toast.error(e.message));
        return () => {
            activo = false;
        };
    }, [toast]);

    async function guardar(e) {
        e.preventDefault();
        setGuardando(true);
        try {
            await api("/perfil", { method: "PUT", body: contacto });
            toast.ok("Datos actualizados.");
            setPerfil((p) => ({ ...p, ...contacto }));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setGuardando(false);
        }
    }

    const cambio = perfil && (contacto.telefono !== (perfil.telefono ?? "") || contacto.email !== (perfil.email ?? ""));

    return (
        <Shell>
            <div className="page-head">
                <h1>Mi perfil</h1>
                <p>{perfil ? `${perfil.username} · ${ROLES[perfil.rol] ?? perfil.rol}` : "Cargando…"}</p>
            </div>

            {perfil && !perfil.editable && (
                <div className="state">
                    <strong>Tu usuario no tiene ficha personal</strong>
                    <span>Los usuarios administrativos solo tienen cuenta de acceso.</span>
                </div>
            )}

            {perfil && perfil.editable && (
                <div className="perfil-grid">
                    <section className="block">
                        <h2>Datos personales</h2>
                        <dl className="datos">
                            <Dato titulo="Nombre" valor={`${perfil.nombre} ${perfil.apellido}`} />
                            <Dato titulo="Documento" valor={perfil.documento} />
                            {perfil.especialidad && <Dato titulo="Especialidad" valor={perfil.especialidad} />}
                            {perfil.fechaNacimiento && <Dato titulo="Fecha de nacimiento" valor={perfil.fechaNacimiento} />}
                        </dl>
                        <p className="cell-sub">Si algún dato personal está mal, pide el cambio a la administración.</p>
                    </section>

                    <form className="block contacto-form" onSubmit={guardar}>
                        <h2>Contacto</h2>
                        <div className="field">
                            <label htmlFor="p-tel">Teléfono</label>
                            <input id="p-tel" type="text" inputMode="tel" maxLength={20} value={contacto.telefono}
                                onChange={(e) => setContacto((c) => ({ ...c, telefono: e.target.value }))} />
                        </div>
                        <div className="field">
                            <label htmlFor="p-mail">Correo</label>
                            <input id="p-mail" type="text" inputMode="email" autoComplete="email" maxLength={150} value={contacto.email}
                                onChange={(e) => setContacto((c) => ({ ...c, email: e.target.value }))} />
                        </div>
                        <div>
                            <button className="btn btn-primary" disabled={!cambio || guardando}>
                                {guardando ? "Guardando…" : "Guardar cambios"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </Shell>
    );
}
