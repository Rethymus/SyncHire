export interface SimplePdfInput {
  title?: string;
  html?: string;
  plainText?: string;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const START_Y = 792;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const MAX_CHARS_PER_LINE = 92;
const MAX_LINES_PER_PAGE = 52;

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith("#x")) {
      return String.fromCharCode(Number.parseInt(normalized.slice(2), 16));
    }

    if (normalized.startsWith("#")) {
      return String.fromCharCode(Number.parseInt(normalized.slice(1), 10));
    }

    return ENTITY_MAP[normalized] ?? match;
  });
}

export function htmlToPlainText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<\/(h[1-6]|p|div|section|article|li|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toPdfSafeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLine(line: string) {
  if (line.length <= MAX_CHARS_PER_LINE) {
    return [line];
  }

  const words = line.split(/\s+/);
  const wrapped: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= MAX_CHARS_PER_LINE) {
      current = `${current} ${word}`;
    } else {
      wrapped.push(current);
      current = word;
    }
  }

  if (current) {
    wrapped.push(current);
  }

  return wrapped.flatMap((item) => {
    if (item.length <= MAX_CHARS_PER_LINE) {
      return [item];
    }

    const chunks: string[] = [];
    for (let index = 0; index < item.length; index += MAX_CHARS_PER_LINE) {
      chunks.push(item.slice(index, index + MAX_CHARS_PER_LINE));
    }
    return chunks;
  });
}

function paginate(text: string) {
  const lines = text
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trimEnd();
      return trimmed ? wrapLine(trimmed) : [""];
    });

  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += MAX_LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + MAX_LINES_PER_PAGE));
  }

  return pages.length > 0 ? pages : [[""]];
}

function buildContentStream(lines: string[]) {
  const body = lines
    .map((line) => `(${toPdfSafeText(line)}) Tj T*`)
    .join("\n");

  return [
    "BT",
    `/F1 ${FONT_SIZE} Tf`,
    `${LINE_HEIGHT} TL`,
    `${MARGIN_X} ${START_Y} Td`,
    body,
    "ET",
  ].join("\n");
}

function buildPdf(objects: string[]) {
  let offset = 0;
  const chunks: string[] = ["%PDF-1.4\n"];
  offset += chunks[0].length;
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = offset;
    const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`;
    chunks.push(chunk);
    offset += chunk.length;
  });

  const xrefOffset = offset;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((item) => `${item.toString().padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  chunks.push(xref);
  return Buffer.from(chunks.join(""), "binary");
}

export function createSimpleResumePdf(input: SimplePdfInput) {
  const text = [
    input.title?.trim(),
    input.plainText?.trim() || htmlToPlainText(input.html ?? ""),
  ]
    .filter(Boolean)
    .join("\n\n");
  const pages = paginate(text || "SyncHire Resume");
  const objects: string[] = [];
  const pageObjectIds = pages.map((_, index) => 4 + index * 2);
  const contentObjectIds = pages.map((_, index) => 5 + index * 2);

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  pages.forEach((pageLines, index) => {
    const contentObjectId = contentObjectIds[index];
    const stream = buildContentStream(pageLines);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    );
    objects.push(`<< /Length ${Buffer.byteLength(stream, "binary")} >>\nstream\n${stream}\nendstream`);
  });

  return buildPdf(objects);
}
