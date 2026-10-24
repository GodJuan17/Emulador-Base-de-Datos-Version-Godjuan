import { useState } from "react";

export function DDLPreview({ source }: { source: string }) {
  const [message, setMessage] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setMessage("DDL copiado");
    } catch {
      setMessage("No se pudo copiar; selecciona el texto para copiarlo.");
    }
  };
  return (
    <section className="ddl-preview">
      <header>
        <div>
          <h2>DDL de PostgreSQL</h2>
          <p>Generado a partir de las entidades y relaciones del modelo.</p>
        </div>
        <div>
          <button type="button" onClick={() => void copy()}>
            Copiar
          </button>
        </div>
      </header>
      <textarea
        readOnly
        aria-label="DDL generado"
        value={source}
        placeholder="Añade una entidad para generar el DDL."
      />
      <small>{message || "El DDL se actualiza automáticamente."}</small>
    </section>
  );
}
