# Modelador DDL · PostgreSQL

Aplicación React y TypeScript para editar modelos entidad–relación, visualizar su traducción lógica y generar DDL para PostgreSQL.

## Desarrollo

Requisitos: Node.js compatible con Vite 7.

```sh
npm install
npm run dev
```

## Estructura

- `src/domain/`: modelo, operaciones de dominio, integridad y normalización. No depende de React ni del DOM.
- `src/state/`: estado consolidado, reducer, historial y migraciones de `localStorage`.
- `src/features/conceptual-diagram/`: layout, geometría, ruteo, vistas previas y nodos del diagrama conceptual.
- `src/features/designer/`: formularios, modales, vistas previas y estilos del diseñador.
- `src/features/export-pdf/`: rasterización SVG y construcción del documento PDF.
- `src/features/ddl-view/`: panel de DDL generado.
- `src/parser/ddlParser.ts`: lectura de `CREATE TABLE` y `ALTER TABLE ADD`.
- `src/generateDDL.ts`: generación de DDL a partir del modelo lógico y las jerarquías.
- `src/styles.css`, `src/mpm.css` y `src/designer.css`: manifiestos que importan estilos por área; `src/tokens.css` contiene los colores reutilizables.

## Reglas del modelo

- Las entidades fuertes se convierten en tablas con clave primaria; los atributos derivados no generan columnas y los multivaluados se normalizan en tablas aparte.
- Una relación 1:N coloca la FK en el lado N; una relación 1:1 usa una FK única en el lado de participación total; N:M genera una tabla asociativa.
- Las entidades débiles conservan su tipo de dependencia y generan cascada al borrar su entidad fuerte. Las jerarquías usan una tabla por subtipo con PK compartida como FK.
- Los nombres se comparan sin distinguir mayúsculas. La integridad valida PK, FK, tipos compatibles y nombres de restricciones.
- La normalización no inventa dependencias funcionales: 2FN y 3FN se comprueban solo con las dependencias declaradas por quien usa el modelo.

## Verificación

```sh
npm run lint
npm run format:check
npm run test
npm run build
```

Las pruebas de Vitest cubren el parser, las operaciones de dominio, el estado persistido, el historial y la generación DDL.
