export function downloadPdfDocument(pageCanvases: HTMLCanvasElement[], filename: string) {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 24;
  const encode = (value: string) => new TextEncoder().encode(value);
  const joinBytes = (...parts: Uint8Array[]) => {
    const joined = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let position = 0;
    for (const part of parts) {
      joined.set(part, position);
      position += part.length;
    }
    return joined;
  };
  const images = pageCanvases.map((pageCanvas) => ({
    width: pageCanvas.width,
    height: pageCanvas.height,
    jpeg: Uint8Array.from(atob(pageCanvas.toDataURL("image/jpeg", 0.96).split(",")[1]), (char) =>
      char.charCodeAt(0),
    ),
  }));
  const objects = [
    encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
    encode(
      [
        "2 0 obj\n<< /Type /Pages /Kids [",
        images.map((_, index) => `${3 + index * 3} 0 R`).join(" "),
        `] /Count ${images.length} >>\nendobj\n`,
      ].join(""),
    ),
  ];
  images.forEach((image, index) => {
    const pageId = 3 + index * 3,
      imageId = pageId + 1,
      contentId = pageId + 2;
    const scale = Math.min(
      (pageWidth - margin * 2) / image.width,
      (pageHeight - margin * 2) / image.height,
    );
    const drawWidth = image.width * scale,
      drawHeight = image.height * scale;
    const drawX = (pageWidth - drawWidth) / 2,
      drawY = (pageHeight - drawHeight) / 2;
    const imageMatrix =
      `${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ` +
      `${drawX.toFixed(2)} ${drawY.toFixed(2)}`;
    const content = encode(`q\n${imageMatrix} cm\n/Im${index} Do\nQ\n`);
    const pageObject = [
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R `,
      `/MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources `,
      `<< /XObject << /Im${index} ${imageId} 0 R >> >> `,
      `/Contents ${contentId} 0 R >>\nendobj\n`,
    ].join("");
    objects.push(encode(pageObject));
    const imageDictionary = [
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image `,
      `/Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB `,
      `/BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`,
    ].join("");
    objects.push(joinBytes(encode(imageDictionary), image.jpeg, encode("\nendstream\nendobj\n")));
    objects.push(
      joinBytes(
        encode(`${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n`),
        content,
        encode("endstream\nendobj\n"),
      ),
    );
  });
  const header = encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  let offset = header.length;
  const offsets = objects.map((object) => {
    const current = offset;
    offset += object.length;
    return current;
  });
  const xrefOffset = offset;
  const xrefEntries = offsets
    .map((value) => `${String(value).padStart(10, "0")} 00000 n \n`)
    .join("");
  const xref = encode(
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xrefEntries}` +
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`,
  );
  const pdfBytes = new Uint8Array(
    header.length + objects.reduce((total, part) => total + part.length, 0) + xref.length,
  );
  let writeAt = 0;
  for (const part of [header, ...objects, xref]) {
    pdfBytes.set(part, writeAt);
    writeAt += part.length;
  }
  const pdf = new Blob([pdfBytes.buffer], { type: "application/pdf" });
  const pdfUrl = URL.createObjectURL(pdf);
  const link = document.createElement("a");
  link.href = pdfUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
}
