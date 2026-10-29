import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
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

type MenuPosition = { left: number; top: number; width: number; maxHeight: number };

const MENU_HEIGHT = 320;
const MENU_MIN_WIDTH = 260;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const customId = useId();
  const modifierId = useId();

  useEffect(() => {
    setCustomMode(parsed.custom);
  }, [parsed.custom]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onScroll = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>("button[role='option']");
    const selected =
      Array.from(buttons ?? []).find((button) => button.getAttribute("aria-selected") === "true") ??
      buttons?.[0];
    selected?.focus({ preventScroll: true });
  }, [menuOpen]);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, MENU_MIN_WIDTH);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUp = spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = Math.min(MENU_HEIGHT, openUp ? spaceAbove : spaceBelow);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const top = openUp ? rect.top - maxHeight - 4 : rect.bottom + 4;
    setMenuPosition({ left, top, width, maxHeight });
    setMenuOpen(true);
  };

  const toggleMenu = () => {
    if (disabled) return;
    if (menuOpen) setMenuOpen(false);
    else openMenu();
  };

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      setMenuOpen(false);
      return;
    }
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("button[role='option']") ?? [],
    );
    if (!buttons.length) return;
    const current = document.activeElement as HTMLElement | null;
    const index = current ? buttons.indexOf(current as HTMLButtonElement) : -1;
    let next: number;
    if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
    else if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next].focus();
    buttons[next].scrollIntoView({ block: "nearest" });
  };

  const modifierEnabled = Boolean(parsed.option?.modifier) && !customMode && !parsed.custom;
  const triggerLabel =
    customMode || parsed.custom
      ? value || "Tipo personalizado…"
      : (parsed.option?.label ?? parsed.base).toUpperCase();

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
      <label className="form-field pg-type-select">
        {label}
        <button
          ref={triggerRef}
          type="button"
          className="pg-type-trigger"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          title={`Tipos integrados de PostgreSQL ${POSTGRES_VERSION}`}
          onClick={toggleMenu}
        >
          <span className="pg-type-trigger-value">{triggerLabel}</span>
          <span className="pg-type-trigger-chevron" aria-hidden="true">
            ▾
          </span>
        </button>
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
      {menuOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="pg-type-menu"
            role="listbox"
            aria-label="Tipos de PostgreSQL"
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            onKeyDown={onMenuKeyDown}
          >
            <div className="pg-type-menu-scroll">
              {POSTGRES_TYPE_GROUPS.map((group) => (
                <div className="pg-type-group" key={group.label}>
                  <div className="pg-type-group-label" role="presentation">
                    {group.label}
                  </div>
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={!parsed.custom && parsed.base === option.value}
                      title={option.description}
                      className={
                        !parsed.custom && parsed.base === option.value ? "selected" : undefined
                      }
                      onClick={() => {
                        chooseBase(option.value);
                        setMenuOpen(false);
                      }}
                    >
                      <span className="pg-type-option-name">{option.label}</span>
                      {option.aliases && option.aliases.length > 0 && (
                        <span className="pg-type-option-alias">{option.aliases.join(", ")}</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
              <div className="pg-type-group">
                <div className="pg-type-group-label" role="presentation">
                  Personalizado
                </div>
                <button
                  type="button"
                  role="option"
                  aria-selected={customMode || parsed.custom}
                  className={customMode || parsed.custom ? "selected custom" : "custom"}
                  onClick={() => {
                    chooseBase("__custom");
                    setMenuOpen(false);
                  }}
                >
                  <span className="pg-type-option-name">Otro tipo personalizado…</span>
                </button>
              </div>
            </div>
            <div className="pg-type-menu-footer">PostgreSQL {POSTGRES_VERSION}</div>
          </div>,
          document.body,
        )}
    </div>
  );
}
