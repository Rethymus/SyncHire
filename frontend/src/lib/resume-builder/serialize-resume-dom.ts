/**
 * DOM → extended-markdown serializer for the WYSIWYG editor.
 *
 * Walks the contentEditable's DOM (produced by {@link renderResumeMarkdown})
 * and reconstructs the extended-markdown source. Handles the common resume
 * structure: headings, paragraphs, bold/italic, links, lists, blockquotes,
 * horizontal rules, and the `:::` column containers + `icon:` glyphs.
 *
 * Round-trip is semantic, not byte-perfect: aliases collapse to canonical icon
 * keys and whitespace is normalized. That keeps the editor stable across mode
 * switches without surprising rewrites.
 */

const COL_ALIGN = /(?:^|\s)resume-col-(left|right|center)\b/;
const ICON_CLASS = /(?:^|\s)ri-([a-zA-Z0-9_-]+)\b/;

export function serializeResumeDom(root: HTMLElement): string {
  const body = serializeBlocks(root).trim();
  return body ? `${body}\n` : "";
}

function serializeBlocks(parent: Node): string {
  const blocks: string[] = [];
  parent.childNodes.forEach((child) => {
    const block = blockFromNode(child);
    if (block !== null && block !== "") {
      blocks.push(block);
    }
  });
  return blocks.join("\n\n");
}

function blockFromNode(node: Node): string | null {
  if (node.nodeType === (typeof Node !== "undefined" ? Node.TEXT_NODE : 3)) {
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    return text || null;
  }
  if (node.nodeType !== (typeof Node !== "undefined" ? Node.ELEMENT_NODE : 1)) {
    return null;
  }

  const el = node as HTMLElement;
  switch (el.tagName) {
    case "H1":
      return `# ${inline(el).trim()}`;
    case "H2":
      return `## ${inline(el).trim()}`;
    case "H3":
      return `### ${inline(el).trim()}`;
    case "H4":
      return `#### ${inline(el).trim()}`;
    case "H5":
      return `##### ${inline(el).trim()}`;
    case "H6":
      return `###### ${inline(el).trim()}`;
    case "P":
      return inline(el).trim();
    case "HR":
      return "---";
    case "BLOCKQUOTE": {
      const inner = serializeBlocks(el);
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }
    case "UL":
      return listItems(el, false);
    case "OL":
      return listItems(el, true);
    case "DIV": {
      if (el.classList.contains("resume-row")) {
        return serializeBlocks(el);
      }
      if (el.classList.contains("resume-col")) {
        const match = COL_ALIGN.exec(el.className);
        const align = match ? match[1] : "left";
        const inner = serializeBlocks(el).trim();
        return `::: ${align}\n${inner}\n:::`;
      }
      return serializeBlocks(el);
    }
    default:
      return inline(el).trim() || null;
  }
}

function listItems(el: HTMLElement, ordered: boolean): string {
  const items = Array.from(el.children).filter(
    (child) => (child as HTMLElement).tagName === "LI",
  ) as HTMLElement[];
  return items
    .map((li, index) => {
      const prefix = ordered ? `${index + 1}. ` : "- ";
      const text = inline(li).trim().replace(/\n/g, "\n  ");
      return `${prefix}${text}`;
    })
    .join("\n");
}

function inline(node: Node): string {
  let out = "";
  node.childNodes.forEach((child) => {
    out += inlineNode(child);
  });
  return out;
}

function inlineNode(node: Node): string {
  if (node.nodeType === (typeof Node !== "undefined" ? Node.TEXT_NODE : 3)) {
    return node.textContent || "";
  }
  if (node.nodeType !== (typeof Node !== "undefined" ? Node.ELEMENT_NODE : 1)) {
    return "";
  }

  const el = node as HTMLElement;
  switch (el.tagName) {
    case "BR":
      return "\n";
    case "STRONG":
    case "B":
      return `**${inline(el)}**`;
    case "EM":
    case "I":
      return `*${inline(el)}*`;
    case "DEL":
    case "S":
      return `~~${inline(el)}~~`;
    case "A": {
      const href = el.getAttribute("href") || "";
      const text = inline(el).trim();
      return href ? `[${text}](${href})` : text;
    }
    case "CODE":
      return `\`${el.textContent || ""}\``;
    case "SPAN": {
      const iconMatch = ICON_CLASS.exec(el.className);
      if (iconMatch) {
        return `icon:${iconMatch[1]} `;
      }
      return inline(el);
    }
    default:
      return inline(el);
  }
}
