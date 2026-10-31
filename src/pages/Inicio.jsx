import Shell from "../components/Shell";

/** Pantalla de paso para los roles que aun no tienen modulos (se reemplaza al terminar su HU). */
export default function Inicio() {
    return (
        <Shell>
            <div className="page-head">
                <h1>Inicio</h1>
                <p>Tu módulo todavía está en construcción.</p>
            </div>
            <div className="state table-wrap">
                <strong>Aún no hay pantallas para tu rol</strong>
                <span>Cuando estén listas aparecerán en el menú de arriba.</span>
            </div>
        </Shell>
    );
}
