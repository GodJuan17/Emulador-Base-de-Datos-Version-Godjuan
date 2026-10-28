import type { Dispatch, PointerEvent, SetStateAction, WheelEvent } from "react";
import type { Entity, RelationDraft } from "../../model";
import { INITIAL_VIEW, type CanvasPositions, type CanvasView } from "../../state/appState";
type Drag = { name: string; dx: number; dy: number } | null;
type Pan = { clientX: number; clientY: number; x: number; y: number } | null;
type Props = {
  conceptual: boolean;
  relationTool: boolean;
  relationStart: string | null;
  setRelationStart: Dispatch<SetStateAction<string | null>>;
  relationPointer: { x: number; y: number };
  setRelationPointer: Dispatch<SetStateAction<{ x: number; y: number }>>;
  drag: Drag;
  setDrag: Dispatch<SetStateAction<Drag>>;
  pan: Pan;
  setPan: Dispatch<SetStateAction<Pan>>;
  view: CanvasView;
  setView: Dispatch<SetStateAction<CanvasView>>;
  setPositions: Dispatch<SetStateAction<CanvasPositions>>;
  setRelationDraft: Dispatch<SetStateAction<RelationDraft | null>>;
};
export function useDiagramPointerHandlers({
  conceptual,
  relationTool,
  relationStart,
  setRelationStart,
  setRelationPointer,
  drag,
  setDrag,
  pan,
  setPan,
  view,
  setView,
  setPositions,
  setRelationDraft,
}: Props) {
  const move = (event: PointerEvent<SVGSVGElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    if (relationStart)
      setRelationPointer({
        x: view.x + ((event.clientX - r.left) / r.width) * view.width,
        y: view.y + ((event.clientY - r.top) / r.height) * view.height,
      });
    if (drag) {
      const x = view.x + ((event.clientX - r.left) / r.width) * view.width;
      const y = view.y + ((event.clientY - r.top) / r.height) * view.height;
      setPositions((p) => ({ ...p, [drag.name]: { x: x - drag.dx, y: y - drag.dy } }));
    } else if (pan) {
      setView((current) => ({
        ...current,
        x: pan.x - ((event.clientX - pan.clientX) / r.width) * current.width,
        y: pan.y - ((event.clientY - pan.clientY) / r.height) * current.height,
      }));
    }
  };

  const start = (event: PointerEvent<SVGGElement>, entity: Entity) => {
    event.stopPropagation();
    if (event.button !== 0) return;
    if (conceptual && relationTool) {
      setRelationStart(entity.table.name);
      const r = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
      if (r)
        setRelationPointer({
          x: view.x + ((event.clientX - r.left) / r.width) * view.width,
          y: view.y + ((event.clientY - r.top) / r.height) * view.height,
        });
      return;
    }
    const r = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!r) return;
    const x = view.x + ((event.clientX - r.left) / r.width) * view.width;
    const y = view.y + ((event.clientY - r.top) / r.height) * view.height;
    setDrag({ name: entity.table.name, dx: x - entity.x, dy: y - entity.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishRelation = (event: PointerEvent<SVGGElement>, entity: Entity) => {
    if (!relationStart) return;
    event.stopPropagation();
    setRelationDraft({
      source: relationStart,
      target: entity.table.name,
      participants: [relationStart, entity.table.name],
      name: `${relationStart}_${entity.table.name}`,
      kind: "1:N",
      mandatory: true,
    });
    setRelationStart(null);
  };

  const startPan = (event: PointerEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return;
    setPan({ clientX: event.clientX, clientY: event.clientY, x: view.x, y: view.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const endPointer = (event: PointerEvent<SVGSVGElement>) => {
    setDrag(null);
    setPan(null);
    if (relationStart && event.target === event.currentTarget) setRelationStart(null);
  };

  const zoom = (
    factor: number,
    anchorX = view.x + view.width / 2,
    anchorY = view.y + view.height / 2,
  ) => {
    setView((current) => {
      const width = Math.min(2200, Math.max(300, current.width * factor));
      const height = (width * INITIAL_VIEW.height) / INITIAL_VIEW.width;
      const ratio = width / current.width;
      return {
        x: anchorX - (anchorX - current.x) * ratio,
        y: anchorY - (anchorY - current.y) * ratio,
        width,
        height,
      };
    });
  };

  const wheelZoom = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const anchorX = view.x + ((event.clientX - rect.left) / rect.width) * view.width;
    const anchorY = view.y + ((event.clientY - rect.top) / rect.height) * view.height;
    // Pellizco (pinch) o Ctrl/Cmd + rueda: zoom anclado al cursor.
    if (event.ctrlKey || event.metaKey) {
      zoom(event.deltaY < 0 ? 0.9 : 1.1, anchorX, anchorY);
      return;
    }
    // Deslizamiento de dos dedos sobre el touchpad (o rueda): desplaza el lienzo
    // sin necesidad de mantener presionado el botón.
    const unit = event.deltaMode === 1 ? 40 : event.deltaMode === 2 ? rect.height / 2 : 1;
    const deltaX = event.deltaX * unit;
    const deltaY = event.deltaY * unit;
    setView((current) => ({
      ...current,
      x: current.x - (deltaX / rect.width) * current.width,
      y: current.y - (deltaY / rect.height) * current.height,
    }));
  };
  return { move, start, finishRelation, startPan, endPointer, wheelZoom };
}
