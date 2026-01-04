import type { Item, List, ProjectBoard } from "~/lib/domain";

export function sanitizeFilename(raw: string) {
  const safe = (raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return safe || "export";
}

export function formatItemMarkdownLine(
  item: Pick<Item, "label" | "description">
) {
  const title = String(item.label ?? "").trim();
  const desc = String(item.description ?? "").trim();
  return `${title} -- ${desc}`.trimEnd();
}

export function listToMarkdown(args: {
  title: string;
  description?: string | null;
  items: Pick<Item, "label" | "description" | "order">[];
}) {
  const lines: string[] = [];
  lines.push(`## ${args.title || "Untitled list"}`.trimEnd());
  if ((args.description ?? "").trim()) {
    lines.push("");
    lines.push(String(args.description).trim());
  }
  lines.push("");

  const items = [...args.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (items.length === 0) {
    lines.push("_No items._");
  } else {
    for (const it of items) {
      lines.push(`- ${formatItemMarkdownLine(it)}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function singleListToMarkdown(args: {
  title: string;
  description?: string | null;
  items: Pick<Item, "label" | "description" | "order">[];
}) {
  const lines: string[] = [];
  lines.push(`# ${args.title || "Untitled list"}`.trimEnd());
  if ((args.description ?? "").trim()) {
    lines.push("");
    lines.push(String(args.description).trim());
  }
  lines.push("");

  const items = [...args.items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (items.length === 0) {
    lines.push("_No items._");
  } else {
    for (const it of items) {
      lines.push(`- ${formatItemMarkdownLine(it)}`);
    }
  }

  lines.push("");
  return lines.join("\n").trimEnd() + "\n";
}

export function projectBoardToMarkdown(board: ProjectBoard) {
  const lines: string[] = [];

  lines.push(`# ${board.project.title || "Untitled project"}`.trimEnd());
  if ((board.project.description ?? "").trim()) {
    lines.push("");
    lines.push(String(board.project.description).trim());
  }
  lines.push("");

  const lists = [...(board.lists ?? [])].sort((a, b) => a.order - b.order);
  const items = [...(board.items ?? [])].sort((a, b) => a.order - b.order);

  const itemsByListId = new Map<string | null, Item[]>();
  for (const it of items) {
    const arr = itemsByListId.get(it.listId) ?? [];
    arr.push(it);
    itemsByListId.set(it.listId, arr);
  }

  const loose = itemsByListId.get(null) ?? [];
  if (loose.length > 0) {
    lines.push(
      listToMarkdown({ title: "Loose", description: "", items: loose })
    );
  }

  for (const list of lists) {
    lines.push(
      listToMarkdown({
        title: list.title,
        description: list.description,
        items: itemsByListId.get(list.id) ?? [],
      })
    );
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function downloadTextFile(args: {
  filename: string;
  text: string;
  mime?: string;
}) {
  const blob = new Blob([args.text], {
    type: args.mime ?? "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = args.filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers / non-secure contexts.
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.left = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}
