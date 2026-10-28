import { downloadPdfDocument } from "./pdfDocument";

export async function exportSvgAsPdf(svg: SVGSVGElement, filename: string, statement: string) {
  const root = document.documentElement;
  const previousTheme = root.dataset.theme;
  const previousColorScheme = root.style.colorScheme;
  // El PDF siempre se compone sobre fondo blanco: forzamos el tema claro
  // mientras se leen los estilos calculados del SVG.
  root.dataset.theme = "light";
  root.style.colorScheme = "light";
  try {
    await renderSvgAsPdf(svg, filename, statement);
  } finally {
    if (previousTheme) root.dataset.theme = previousTheme;
    else delete root.dataset.theme;
    root.style.colorScheme = previousColorScheme;
  }
}

async function renderSvgAsPdf(svg: SVGSVGElement, filename: string, statement: string) {
  const viewBoxValues = (svg.getAttribute("viewBox") ?? "0 0 720 465")
    .trim()
    .split(/[ ,]+/)
    .map(Number);
  const fallbackViewBox = {
    x: viewBoxValues[0] || 0,
    y: viewBoxValues[1] || 0,
    width: viewBoxValues[2] || 720,
    height: viewBoxValues[3] || 465,
  };
  let viewBox = fallbackViewBox;
  const uiControls = Array.from(svg.querySelectorAll(".collapse")).map((control) => ({
    control,
    visibility: (control as SVGElement).style.visibility,
  }));
  try {
    uiControls.forEach(({ control }) => {
      (control as SVGElement).style.visibility = "hidden";
    });
    const bounds = svg.getBBox();
    if (bounds.width > 0 && bounds.height > 0) {
      const padding = 48;
      viewBox = {
        x: bounds.x - padding,
        y: bounds.y - padding,
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      };
    }
  } catch {
    /* Usa el viewBox actual como respaldo. */
  } finally {
    uiControls.forEach(({ control, visibility }) => {
      (control as SVGElement).style.visibility = visibility;
    });
  }
  const outputScale = Math.min(2, 2800 / Math.max(viewBox.width, viewBox.height, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewBox.width * outputScale));
  canvas.height = Math.max(1, Math.ceil(viewBox.height * outputScale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no pudo generar la imagen del PDF.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.setTransform(
    outputScale,
    0,
    0,
    outputScale,
    -viewBox.x * outputScale,
    -viewBox.y * outputScale,
  );
  const drawNode = (node: Element) => {
    const tag = node.localName;
    if (
      ["defs", "title", "desc", "style", "marker"].includes(tag) ||
      node.classList.contains("collapse")
    )
      return;
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return;
    context.save();
    context.globalAlpha *= Number(style.opacity || 1);
    context.fillStyle = style.fill === "none" ? "transparent" : style.fill;
    context.strokeStyle = style.stroke === "none" ? "transparent" : style.stroke;
    context.lineWidth = Number.parseFloat(style.strokeWidth) || 1;
    context.lineCap = style.strokeLinecap as CanvasLineCap;
    context.lineJoin = style.strokeLinejoin as CanvasLineJoin;
    context.setLineDash(
      style.strokeDasharray === "none"
        ? []
        : style.strokeDasharray.split(/[ ,]+/).map(Number).filter(Number.isFinite),
    );
    const attr = (name: string, fallback = 0) => Number(node.getAttribute(name) ?? fallback);
    const fillAndStroke = (path: Path2D | undefined = undefined) => {
      if (style.fill !== "none") {
        if (path) context.fill(path);
        else context.fill();
      }
      if (style.stroke !== "none") {
        if (path) context.stroke(path);
        else context.stroke();
      }
    };
    if (tag === "g" || tag === "svg") {
      Array.from(node.children).forEach(drawNode);
    } else if (tag === "line") {
      const x1 = attr("x1"),
        y1 = attr("y1"),
        x2 = attr("x2"),
        y2 = attr("y2");
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      const angle = Math.atan2(y2 - y1, x2 - x1);
      if (style.markerEnd !== "none" && style.markerEnd.includes("multi-arrow")) {
        const length = 8,
          halfWidth = 4;
        const backward = angle + Math.PI;
        const baseX = x2 + Math.cos(backward) * length,
          baseY = y2 + Math.sin(backward) * length;
        const perpendicularX = Math.cos(backward + Math.PI / 2) * halfWidth,
          perpendicularY = Math.sin(backward + Math.PI / 2) * halfWidth;
        context.beginPath();
        context.moveTo(baseX + perpendicularX, baseY + perpendicularY);
        context.lineTo(x2, y2);
        context.moveTo(baseX, baseY);
        context.lineTo(x2, y2);
        context.moveTo(baseX - perpendicularX, baseY - perpendicularY);
        context.lineTo(x2, y2);
        context.stroke();
      } else if (style.markerEnd !== "none") {
        const size = 8;
        context.beginPath();
        context.moveTo(x2, y2);
        context.lineTo(x2 - size * Math.cos(angle - 0.45), y2 - size * Math.sin(angle - 0.45));
        context.lineTo(x2 - size * Math.cos(angle + 0.45), y2 - size * Math.sin(angle + 0.45));
        context.closePath();
        context.fillStyle = context.strokeStyle;
        context.fill();
      }
    } else if (tag === "rect") {
      const x = attr("x"),
        y = attr("y"),
        w = attr("width"),
        h = attr("height");
      context.beginPath();
      const radius = Math.min(attr("rx"), w / 2, h / 2);
      if (radius && "roundRect" in context) context.roundRect(x, y, w, h, radius);
      else context.rect(x, y, w, h);
      fillAndStroke();
    } else if (tag === "circle" || tag === "ellipse") {
      context.beginPath();
      context.ellipse(
        attr("cx"),
        attr("cy"),
        tag === "circle" ? attr("r") : attr("rx"),
        tag === "circle" ? attr("r") : attr("ry"),
        0,
        0,
        Math.PI * 2,
      );
      fillAndStroke();
    } else if (tag === "polygon" || tag === "polyline") {
      const points = (node.getAttribute("points") ?? "").trim().split(/[ ,]+/).map(Number);
      if (points.length >= 4) {
        context.beginPath();
        context.moveTo(points[0], points[1]);
        for (let i = 2; i + 1 < points.length; i += 2) context.lineTo(points[i], points[i + 1]);
        if (tag === "polygon") context.closePath();
        fillAndStroke();
      }
    } else if (tag === "path") {
      const data = node.getAttribute("d");
      if (data) {
        const path = new Path2D(data);
        fillAndStroke(path);
      }
    } else if (tag === "text") {
      const size = Number.parseFloat(style.fontSize) || 12;
      context.font = `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;
      context.textAlign =
        style.textAnchor === "middle" ? "center" : style.textAnchor === "end" ? "right" : "left";
      context.textBaseline = "alphabetic";
      const x = attr("x"),
        y = attr("y"),
        text = node.textContent ?? "";
      if (style.fill !== "none") context.fillText(text, x, y);
      if (style.stroke !== "none") context.strokeText(text, x, y);
    }
    context.restore();
  };
  Array.from(svg.children).forEach(drawNode);
  const statementCanvases: HTMLCanvasElement[] = [];
  if (statement.trim()) {
    const textCanvas = document.createElement("canvas");
    textCanvas.width = 1600;
    textCanvas.height = 1100;
    const textContext = textCanvas.getContext("2d");
    if (!textContext) throw new Error("El navegador no pudo preparar el enunciado para el PDF.");
    textContext.fillStyle = "#ffffff";
    textContext.fillRect(0, 0, textCanvas.width, textCanvas.height);
    textContext.font = "700 46px Arial, sans-serif";
    textContext.fillStyle = "#274959";
    textContext.fillText("Enunciado del ejercicio", 120, 140);
    textContext.strokeStyle = "#dce6e9";
    textContext.lineWidth = 3;
    textContext.beginPath();
    textContext.moveTo(120, 180);
    textContext.lineTo(1480, 180);
    textContext.stroke();
    textContext.font = "400 30px Arial, sans-serif";
    textContext.fillStyle = "#263943";
    const lines: string[] = [];
    for (const paragraph of statement.replace(/\r/g, "").split("\n")) {
      if (!paragraph.trim()) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && textContext.measureText(candidate).width > 1360) {
          lines.push(line);
          line = word;
        } else line = candidate;
      }
      if (line) lines.push(line);
    }
    const linesPerPage = 18;
    for (let start = 0; start < lines.length; start += linesPerPage) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = textCanvas.width;
      pageCanvas.height = textCanvas.height;
      const pageContext = pageCanvas.getContext("2d");
      if (!pageContext) throw new Error("El navegador no pudo preparar el enunciado para el PDF.");
      pageContext.fillStyle = "#ffffff";
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageContext.fillStyle = "#274959";
      pageContext.font = "700 46px Arial, sans-serif";
      pageContext.fillText(
        start ? "Enunciado del ejercicio (continuación)" : "Enunciado del ejercicio",
        120,
        140,
      );
      pageContext.strokeStyle = "#dce6e9";
      pageContext.lineWidth = 3;
      pageContext.beginPath();
      pageContext.moveTo(120, 180);
      pageContext.lineTo(1480, 180);
      pageContext.stroke();
      pageContext.fillStyle = "#263943";
      pageContext.font = "400 30px Arial, sans-serif";
      lines
        .slice(start, start + linesPerPage)
        .forEach((line, index) => pageContext.fillText(line, 120, 245 + index * 44));
      statementCanvases.push(pageCanvas);
    }
  }
  const solutionCanvas = document.createElement("canvas");
  solutionCanvas.width = 1600;
  solutionCanvas.height = 1100;
  const solutionContext = solutionCanvas.getContext("2d");
  if (!solutionContext) throw new Error("El navegador no pudo preparar la solución para el PDF.");
  solutionContext.fillStyle = "#ffffff";
  solutionContext.fillRect(0, 0, solutionCanvas.width, solutionCanvas.height);
  solutionContext.fillStyle = "#274959";
  solutionContext.font = "700 46px Arial, sans-serif";
  solutionContext.fillText(
    filename.includes("conceptual") ? "Solución · Modelo conceptual" : "Solución · Modelo lógico",
    120,
    140,
  );
  solutionContext.strokeStyle = "#dce6e9";
  solutionContext.lineWidth = 3;
  solutionContext.beginPath();
  solutionContext.moveTo(120, 180);
  solutionContext.lineTo(1480, 180);
  solutionContext.stroke();
  const diagramScale = Math.min(1400 / canvas.width, 820 / canvas.height);
  const diagramWidth = canvas.width * diagramScale,
    diagramHeight = canvas.height * diagramScale;
  solutionContext.drawImage(
    canvas,
    (1600 - diagramWidth) / 2,
    230 + (820 - diagramHeight) / 2,
    diagramWidth,
    diagramHeight,
  );
  downloadPdfDocument([...statementCanvases, solutionCanvas], filename);
}
