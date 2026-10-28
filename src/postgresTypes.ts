export type PostgresTypeOption = {
  value: string;
  label: string;
  description: string;
  aliases?: string[];
  modifier?: "length" | "precision" | "time";
  modifierPlaceholder?: string;
};

export type PostgresTypeGroup = {
  label: string;
  options: PostgresTypeOption[];
};

/**
 * Catálogo de tipos integrados de PostgreSQL 18 (última versión estable).
 * Los tipos de extensiones (citext, hstore, vector…) se aceptan mediante
 * la opción «Tipo personalizado», igual que los dominios creados por el usuario.
 */
export const POSTGRES_VERSION = "18.6";

export const POSTGRES_TYPE_GROUPS: PostgresTypeGroup[] = [
  {
    label: "Numéricos",
    options: [
      {
        value: "smallint",
        label: "smallint",
        description: "Entero de 2 bytes.",
        aliases: ["int2"],
      },
      {
        value: "integer",
        label: "integer",
        description: "Entero de 4 bytes.",
        aliases: ["int", "int4"],
      },
      { value: "bigint", label: "bigint", description: "Entero de 8 bytes.", aliases: ["int8"] },
      {
        value: "numeric",
        label: "numeric",
        description: "Número exacto con precisión y escala configurables.",
        aliases: ["decimal"],
        modifier: "precision",
        modifierPlaceholder: "10, 2",
      },
      {
        value: "real",
        label: "real",
        description: "Número de punto flotante de 4 bytes.",
        aliases: ["float4"],
      },
      {
        value: "double precision",
        label: "double precision",
        description: "Número de punto flotante de 8 bytes.",
        aliases: ["float", "float8"],
      },
      {
        value: "smallserial",
        label: "smallserial",
        description: "Entero pequeño autoincremental.",
        aliases: ["serial2"],
      },
      {
        value: "serial",
        label: "serial",
        description: "Entero autoincremental.",
        aliases: ["serial4"],
      },
      {
        value: "bigserial",
        label: "bigserial",
        description: "Entero grande autoincremental.",
        aliases: ["serial8"],
      },
      { value: "money", label: "money", description: "Cantidad monetaria con formato local." },
    ],
  },
  {
    label: "Texto y binarios",
    options: [
      {
        value: "character",
        label: "character",
        description: "Cadena de longitud fija.",
        aliases: ["char"],
        modifier: "length",
        modifierPlaceholder: "1",
      },
      {
        value: "character varying",
        label: "character varying",
        description: "Cadena de longitud variable.",
        aliases: ["varchar"],
        modifier: "length",
        modifierPlaceholder: "255",
      },
      { value: "text", label: "text", description: "Cadena de longitud variable sin límite." },
      {
        value: "bit",
        label: "bit",
        description: "Cadena de bits de longitud fija.",
        modifier: "length",
        modifierPlaceholder: "1",
      },
      {
        value: "bit varying",
        label: "bit varying",
        description: "Cadena de bits de longitud variable.",
        aliases: ["varbit"],
        modifier: "length",
        modifierPlaceholder: "8",
      },
      { value: "bytea", label: "bytea", description: "Datos binarios." },
    ],
  },
  {
    label: "Fecha y hora",
    options: [
      { value: "date", label: "date", description: "Fecha del calendario (sin hora)." },
      {
        value: "time without time zone",
        label: "time without time zone",
        description: "Hora del día sin zona horaria.",
        aliases: ["time"],
        modifier: "time",
        modifierPlaceholder: "6",
      },
      {
        value: "time with time zone",
        label: "time with time zone",
        description: "Hora del día con zona horaria.",
        aliases: ["timetz"],
        modifier: "time",
        modifierPlaceholder: "6",
      },
      {
        value: "timestamp without time zone",
        label: "timestamp without time zone",
        description: "Fecha y hora sin zona horaria.",
        aliases: ["timestamp"],
        modifier: "time",
        modifierPlaceholder: "6",
      },
      {
        value: "timestamp with time zone",
        label: "timestamp with time zone",
        description: "Fecha y hora con zona horaria.",
        aliases: ["timestamptz"],
        modifier: "time",
        modifierPlaceholder: "6",
      },
      { value: "interval", label: "interval", description: "Intervalo de tiempo." },
    ],
  },
  {
    label: "Booleanos y JSON",
    options: [
      { value: "boolean", label: "boolean", description: "Verdadero o falso.", aliases: ["bool"] },
      { value: "json", label: "json", description: "Texto JSON tal como se recibe." },
      { value: "jsonb", label: "jsonb", description: "JSON binario, indexable y eficiente." },
      {
        value: "jsonpath",
        label: "jsonpath",
        description: "Ruta de consulta sobre documentos JSON.",
      },
    ],
  },
  {
    label: "Identificadores y red",
    options: [
      { value: "uuid", label: "uuid", description: "Identificador único universal." },
      { value: "inet", label: "inet", description: "Dirección IPv4 o IPv6 con máscara opcional." },
      { value: "cidr", label: "cidr", description: "Bloque de red IPv4 o IPv6." },
      { value: "macaddr", label: "macaddr", description: "Dirección MAC de 6 bytes." },
      { value: "macaddr8", label: "macaddr8", description: "Dirección MAC de 8 bytes (EUI-64)." },
      { value: "xml", label: "xml", description: "Documento XML." },
    ],
  },
  {
    label: "Geométricos",
    options: [
      { value: "point", label: "point", description: "Punto en el plano." },
      { value: "line", label: "line", description: "Línea infinita en el plano." },
      { value: "lseg", label: "lseg", description: "Segmento de línea." },
      { value: "box", label: "box", description: "Caja rectangular." },
      { value: "path", label: "path", description: "Trayectoria geométrica." },
      { value: "polygon", label: "polygon", description: "Polígono cerrado." },
      { value: "circle", label: "circle", description: "Círculo en el plano." },
    ],
  },
  {
    label: "Búsqueda, rangos y otros",
    options: [
      { value: "tsvector", label: "tsvector", description: "Documento para búsqueda de texto." },
      { value: "tsquery", label: "tsquery", description: "Consulta de búsqueda de texto." },
      { value: "int4range", label: "int4range", description: "Rango de enteros de 4 bytes." },
      { value: "int8range", label: "int8range", description: "Rango de enteros de 8 bytes." },
      { value: "numrange", label: "numrange", description: "Rango numérico." },
      { value: "tsrange", label: "tsrange", description: "Rango de marcas de tiempo sin zona." },
      {
        value: "tstzrange",
        label: "tstzrange",
        description: "Rango de marcas de tiempo con zona.",
      },
      { value: "daterange", label: "daterange", description: "Rango de fechas." },
      { value: "int4multirange", label: "int4multirange", description: "Multirango de enteros." },
      {
        value: "int8multirange",
        label: "int8multirange",
        description: "Multirango de enteros largos.",
      },
      { value: "nummultirange", label: "nummultirange", description: "Multirango numérico." },
      {
        value: "tsmultirange",
        label: "tsmultirange",
        description: "Multirango de marcas de tiempo.",
      },
      {
        value: "tstzmultirange",
        label: "tstzmultirange",
        description: "Multirango de marcas de tiempo con zona.",
      },
      { value: "datemultirange", label: "datemultirange", description: "Multirango de fechas." },
      {
        value: "pg_lsn",
        label: "pg_lsn",
        description: "Número de secuencia de registro de PostgreSQL.",
      },
      {
        value: "pg_snapshot",
        label: "pg_snapshot",
        description: "Instantánea de identificadores de transacción.",
      },
      { value: "oid", label: "oid", description: "Identificador de objeto interno." },
    ],
  },
];

export const POSTGRES_TYPES = POSTGRES_TYPE_GROUPS.flatMap((group) => group.options);

export type ParsedPostgresType = {
  base: string;
  modifier: string;
  isArray: boolean;
  custom: boolean;
  option?: PostgresTypeOption;
};

function normalizeTypeName(value: string): string {
  return value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findOption(value: string): PostgresTypeOption | undefined {
  const normalized = normalizeTypeName(value);
  return POSTGRES_TYPES.find(
    (option) =>
      option.value === normalized || (option.aliases ?? []).some((alias) => alias === normalized),
  );
}

export function parsePostgresType(value: string): ParsedPostgresType {
  const source = value.trim();
  const isArray = /\[\s*\]\s*$/.test(source);
  const withoutArray = source.replace(/\[\s*\]\s*$/, "").trim();
  const option = findOption(withoutArray);
  const modifierMatch = withoutArray.match(/\(([^)]*)\)/);
  return {
    base: option?.value ?? withoutArray.toLowerCase(),
    modifier: modifierMatch?.[1]?.trim() ?? "",
    isArray,
    custom: !option,
    option,
  };
}

export function formatPostgresType(base: string, modifier = "", isArray = false): string {
  const option = findOption(base);
  const canonical = option?.value ?? base.trim();
  if (!canonical) return isArray ? "[]" : "";
  const precision = modifier.trim() ? `(${modifier.trim()})` : "";
  const rendered = option ? canonical.toUpperCase() : canonical;
  return `${rendered}${precision}${isArray ? "[]" : ""}`;
}

export function describePostgresType(value: string): string {
  const parsed = parsePostgresType(value);
  if (!parsed.option) return "Tipo personalizado o dominio definido por el usuario.";
  return parsed.option.description;
}
