import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

export type ContextMenuItem = {
  label?: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onSelect?: () => void;
};

type Props = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  label?: string;
  onClose: () => void;
};

const MENU_MARGIN = 10;

export function ContextMenu({ x, y, items, label, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [position, setPosition] = useState({ left: x, top: y });
  const [activeIndex, setActiveIndex] = useState(-1);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(MENU_MARGIN, Math.min(x, window.innerWidth - rect.width - MENU_MARGIN)),
      top: Math.max(MENU_MARGIN, Math.min(y, window.innerHeight - rect.height - MENU_MARGIN)),
    });
  }, [x, y]);

  useEffect(() => {
    const firstEnabled = items.findIndex((item) => !item.separator && !item.disabled);
    setActiveIndex(firstEnabled);
    if (firstEnabled >= 0) itemRefs.current[firstEnabled]?.focus();

    const close = (event: Event) => {
      if (menuRef.current && event.target instanceof Node && menuRef.current.contains(event.target))
        return;
      onClose();
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", close, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [items, onClose]);

  const enabledIndexes = items
    .map((item, index) => (!item.separator && !item.disabled ? index : -1))
    .filter((index) => index >= 0);

  const focusAt = (index: number) => {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (!enabledIndexes.length) return;
    const current = enabledIndexes.indexOf(activeIndex);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next =
        current < 0
          ? enabledIndexes[direction > 0 ? 0 : enabledIndexes.length - 1]
          : enabledIndexes[(current + direction + enabledIndexes.length) % enabledIndexes.length];
      focusAt(next);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusAt(enabledIndexes[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusAt(enabledIndexes[enabledIndexes.length - 1]);
    }
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label={label ?? "Acciones del diagrama"}
      style={{ left: position.left, top: position.top }}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label && <div className="context-menu-label">{label}</div>}
      {items.map((item, index) =>
        item.separator ? (
          <div key={`separator-${index}`} className="context-menu-separator" role="separator" />
        ) : (
          <button
            key={`${item.label}-${index}`}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={item.danger ? "danger" : undefined}
            tabIndex={activeIndex === index ? 0 : -1}
            onFocus={() => setActiveIndex(index)}
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
          >
            <span className="context-menu-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="context-menu-text">{item.label}</span>
            {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}
