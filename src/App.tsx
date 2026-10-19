import { useMemo, useState } from "react";
import { toDiagram } from "./model";
import { Diagram } from "./Diagram";
import { Designer } from "./Designer";
import { generateDDL } from "./generateDDL";
import type { Table } from "./parser/ddlParser";
import { usePersistentState } from "./persistence";
export function App() {
  const [tables, setTables] = usePersistentState<Table[]>("sima.modelador.tables.v1", []); const [tab, setTab] = usePersistentState<"conceptual" | "logical" | "ddl">("sima.modelador.tab.v1", "conceptual"); const [minimum, setMinimum] = usePersistentState<0 | 1>("sima.modelador.minimum.v1", 1); const [names, setNames] = usePersistentState<Record<string, string>>("sima.modelador.relation-names.v1", {});
  const model = useMemo(() => toDiagram({ tables, warnings: [] }), [tables]);
  const outputDDL = useMemo(() => generateDDL(tables), [tables]);
  return <main className="app"><header className="topbar"><div className="brand-mark">M</div><div><p className="eyebrow">HERRAMIENTA DIDÁCTICA · MPM1999</p><h1>Diseña tu modelo de datos</h1></div><label className="minimum-control">Mínimo del lado N<select value={minimum} onChange={e => setMinimum(Number(e.target.value) as 0 | 1)}><option value={1}>1 · obligatorio</option><option value={0}>0 · opcional</option></select></label></header>
    <section className="workspace design-workspace"><aside className="editor design-editor"><Designer tables={tables} onChange={setTables}/></aside>
      <section className="visualizer"><nav className="tabs" role="tablist" aria-label="Modelos"><button role="tab" aria-selected={tab === "conceptual"} onClick={() => setTab("conceptual")}>Modelo conceptual <span>MER</span></button><button role="tab" aria-selected={tab === "logical"} onClick={() => setTab("logical")}>Modelo lógico</button><button role="tab" aria-selected={tab === "ddl"} onClick={() => setTab("ddl")}>DDL generado</button><span className="counts">{model.entities.length} entidades · {model.relations.length} relaciones</span></nav>{tab === "ddl" ? <DDLPreview source={outputDDL}/> : <Diagram model={model} conceptual={tab === "conceptual"} minimum={minimum} names={names} rename={(id, value) => setNames(p => ({ ...p, [id]: value }))}/>}</section></section>
    <section className={`warnings ${model.warnings.length ? "warning-state" : "clear-state"}`}><div className="warning-heading"><span className="warning-icon">{model.warnings.length ? "!" : "✓"}</span><div><h2>Advertencias <span>{model.warnings.length}</span></h2><p>{model.warnings.length ? "Revisa estos elementos que no se pudieron inferir por completo." : "Sin advertencias. El DDL reconocido se representó correctamente."}</p></div></div>{model.warnings.length > 0 && <ul>{model.warnings.map((warning, i) => <li key={`${i}-${warning}`}>{warning}</li>)}</ul>}</section>
    <footer className="page-foot">Las claves foráneas se muestran como relaciones en el MER. Selecciona un rombo para editar su nombre o un atributo para abrir sus propiedades. Usa ＋ Jerarquía para añadir un supertipo y sus subtipos. El modelo se guarda automáticamente en este navegador.</footer>
  </main>;
}

function DDLPreview({ source }: { source: string }) {
  const [message, setMessage] = useState("");
  const copy = async () => { try { await navigator.clipboard.writeText(source); setMessage("DDL copiado"); } catch { setMessage("No se pudo copiar; selecciona el texto para copiarlo."); } };
  const download = () => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([source], { type: "text/sql;charset=utf-8" })); link.download = "modelo.sql"; link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 1000); };
  return <section className="ddl-preview"><header><div><h2>DDL de PostgreSQL</h2><p>Generado a partir de las entidades y relaciones del modelo.</p></div><div><button type="button" onClick={() => void copy()}>Copiar</button><button type="button" onClick={download}>Descargar .sql</button></div></header><textarea readOnly aria-label="DDL generado" value={source} placeholder="Añade una entidad para generar el DDL."/><small>{message || "El DDL se actualiza automáticamente."}</small></section>;
}
