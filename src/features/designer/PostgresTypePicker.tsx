import { useEffect, useId, useState } from "react";
import {
  POSTGRES_TYPE_GROUPS,
  POSTGRES_VERSION,
  describePostgresType,
  formatPostgresType,
  parsePostgresType,
} from "../../postgresTypes";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
};

export function PostgresTypePicker({
  value,
  onChange,
  label = "Tipo PostgreSQL",
  compact = false,
  className = "",
  disabled = false,
}: Props) {
  const parsed = parsePostgresType(value);
  const [customMode, setCustomMode] = useState(parsed.custom);
  const selectId = useId();
  const customId = useId();
  const modifierId = useId();

  useEffect(() => {
    setCustomMode(parsed.custom);
  }, [parsed.custom]);

  const selectedValue = customMode || parsed.custom ? "__custom" : parsed.base;
  const modifierEnabled = Boolean(parsed.option?.modifier) && !customMode && !parsed.custom;

  const chooseBase = (base: string) => {
    if (base === "__custom") {
      setCustomMode(true);
      return;
    }
    setCustomMode(false);
    const option = POSTGRES_TYPE_GROUPS.flatMap((group) => group.options).find(
      (candidate) => candidate.value === base,
    );
    const nextModifier = option?.modifier && option.value === parsed.base ? parsed.modifier : "";
    onChange(formatPostgresType(base, nextModifier, parsed.isArray));
  };

  const chooseCustom = (customValue: string) => {
    const arraySuffix = parsed.isArray ? "[]" : "";
    onChange(`${customValue}${arraySuffix}`);
  };

  const changeModifier = (modifier: string) => {
    onChange(formatPostgresType(parsed.base, modifier, parsed.isArray));
  };

  const toggleArray = (isArray: boolean) => {
    if (customMode || parsed.custom) {
      const current = value.replace(/\[\s*\]\s*$/, "");
      onChange(`${current}${isArray ? "[]" : ""}`);
      return;
    }
    onChange(formatPostgresType(parsed.base, parsed.modifier, isArray));
  };

  return (
    <div className={`pg-type-picker ${compact ? "compact" : ""} ${className}`.trim()}>
      <label className="form-field pg-type-select" htmlFor={selectId}>
        {label}
        <select
          id={selectId}
          value={selectedValue}
          disabled={disabled}
          onChange={(event) => chooseBase(event.target.value)}
          title={`Tipos integrados de PostgreSQL ${POSTGRES_VERSION}`}
        >
          {POSTGRES_TYPE_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="__custom">Otro tipo personalizado…</option>
        </select>
      </label>
      {!compact && modifierEnabled && (
        <label className="form-field pg-type-modifier" htmlFor={modifierId}>
          {parsed.option?.modifier === "precision" ? "Precisión y escala" : "Longitud / precisión"}
          <input
            id={modifierId}
            value={parsed.modifier}
            disabled={disabled}
            onChange={(event) => changeModifier(event.target.value)}
            placeholder={parsed.option?.modifierPlaceholder ?? "opcional"}
            inputMode="numeric"
          />
        </label>
      )}
      {(customMode || parsed.custom) && (
        <label className="form-field pg-type-custom" htmlFor={customId}>
          Tipo personalizado o dominio
          <input
            id={customId}
            value={customMode && !parsed.custom ? "" : value.replace(/\[\s*\]\s*$/, "")}
            disabled={disabled}
            onChange={(event) => chooseCustom(event.target.value)}
            placeholder="mi_dominio"
          />
        </label>
      )}
      <div className="pg-type-meta">
        <label className="pg-type-array">
          <input
            type="checkbox"
            checked={parsed.isArray}
            disabled={disabled}
            onChange={(event) => toggleArray(event.target.checked)}
          />
          Arreglo <code>[]</code>
        </label>
        {!compact && <small>{describePostgresType(value)}</small>}
      </div>
    </div>
  );
}
