import { createMemo, type Accessor } from "solid-js";
import type { Item, List } from "~/lib/domain";
import { listKey } from "~/lib/projects/board-utils";
import type { ProjectBoardController } from "./project-board-context";
import type { ProjectBoardListSort } from "./project-board-url-state";

export type ListIndexEntry = {
  key: string; // list id, or "LOOSE"
  listId: string | null;
  title: string;
  description: string;
  updatedAt: string;
  itemCount: number;
  previewItems: Item[];
  list: List | null;
};

function maxIso(a: string, b: string) {
  return a.localeCompare(b) >= 0 ? a : b;
}

export function createListIndexEntries(args: {
  pb: ProjectBoardController;
  q: Accessor<string>;
  sort: Accessor<ProjectBoardListSort>;
  dir?: Accessor<"asc" | "desc">;
}) {
  const qNorm = createMemo(() => args.q().trim().toLowerCase());

  const entries = createMemo<ListIndexEntry[]>(() => {
    const board = args.pb.board();
    if (!board) return [];

    const itemsByKey = args.pb.itemsByListId();
    const lists = args.pb.lists();

    const out: ListIndexEntry[] = [];

    const looseItems = itemsByKey.get("LOOSE") ?? [];
    if (looseItems.length > 0) {
      const updatedAt = looseItems.reduce(
        (acc, it) => maxIso(acc, it.updatedAt),
        board.project.updatedAt
      );
      out.push({
        key: "LOOSE",
        listId: null,
        title: "Loose",
        description: "Unassigned items live here.",
        updatedAt,
        itemCount: looseItems.length,
        previewItems: looseItems.slice(0, 5),
        list: null,
      });
    }

    for (const l of lists) {
      const key = listKey(l.id);
      const items = itemsByKey.get(key) ?? [];
      out.push({
        key,
        listId: l.id,
        title: l.title,
        description: l.description,
        updatedAt: l.updatedAt,
        itemCount: items.length,
        previewItems: items.slice(0, 5),
        list: l,
      });
    }

    const query = qNorm();
    const filtered =
      query.length === 0
        ? out
        : out.filter((e) => {
            if (e.title.toLowerCase().includes(query)) return true;
            if (String(e.description ?? "").toLowerCase().includes(query))
              return true;
            // Optional: item-content search (best-effort; already in memory).
            const all = itemsByKey.get(e.key) ?? [];
            for (const it of all) {
              if (it.label.toLowerCase().includes(query)) return true;
              if (String(it.description ?? "").toLowerCase().includes(query))
                return true;
            }
            return false;
          });

    const s = args.sort();
    const dir = args.dir ? args.dir() : "desc";
    const dirMult = dir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (s === "alpha") return dirMult * a.title.localeCompare(b.title);
      if (s === "items")
        return (
          dirMult * (a.itemCount - b.itemCount) ||
          a.title.localeCompare(b.title)
        );
      // updated
      return (
        dirMult * a.updatedAt.localeCompare(b.updatedAt) ||
        a.title.localeCompare(b.title)
      );
    });

    return filtered;
  });

  const firstKey = createMemo(() => entries()[0]?.key ?? null);

  return { entries, firstKey };
}


