import { useLocation, useNavigate } from "@solidjs/router";
import { createMemo, type Accessor } from "solid-js";

export type ProjectBoardViewMode = "board" | "split" | "overview" | "table";
export type ProjectBoardListSort = "updated" | "alpha" | "items";
export type SortDir = "asc" | "desc";

function parseViewMode(raw: string | null | undefined): ProjectBoardViewMode {
  switch (String(raw ?? "").toLowerCase()) {
    case "split":
      return "split";
    case "overview":
      return "overview";
    case "table":
      return "table";
    case "board":
    default:
      return "board";
  }
}

function parseListSort(raw: string | null | undefined): ProjectBoardListSort {
  switch (String(raw ?? "").toLowerCase()) {
    case "alpha":
      return "alpha";
    case "items":
      return "items";
    case "updated":
    default:
      return "updated";
  }
}

function parseSortDir(raw: string | null | undefined): SortDir {
  return String(raw ?? "").toLowerCase() === "asc" ? "asc" : "desc";
}

export function createProjectBoardUrlState(projectId: Accessor<string>) {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = createMemo(() => new URLSearchParams(location.search));

  const view = createMemo<ProjectBoardViewMode>(() =>
    parseViewMode(searchParams().get("view"))
  );

  const q = createMemo(() => searchParams().get("q") ?? "");
  const sort = createMemo<ProjectBoardListSort>(() =>
    parseListSort(searchParams().get("sort"))
  );
  const dir = createMemo<SortDir>(() => parseSortDir(searchParams().get("dir")));

  // Selected list key: a list id, or "LOOSE" for unassigned items.
  const listId = createMemo(() => searchParams().get("listId"));

  const expanded = createMemo(() => {
    const raw = (searchParams().get("expanded") ?? "").trim();
    if (!raw) return new Set<string>();
    const parts = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    return new Set(parts);
  });

  const setSearch = (
    patch: Record<string, string | null | undefined>,
    opts?: { replace?: boolean }
  ) => {
    const sp = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(patch)) {
      const key = String(k);
      if (v == null || String(v).trim() === "") sp.delete(key);
      else sp.set(key, String(v));
    }
    const qs = sp.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ""}${location.hash ?? ""}`;
    navigate(url, { replace: opts?.replace ?? false });
  };

  const setView = (next: ProjectBoardViewMode, opts?: { replace?: boolean }) =>
    setSearch({ view: next }, { replace: opts?.replace ?? false });

  const setQ = (next: string) => setSearch({ q: next }, { replace: true });
  const setSort = (next: ProjectBoardListSort) =>
    setSearch({ sort: next }, { replace: true });
  const setDir = (next: SortDir) => setSearch({ dir: next }, { replace: true });

  const setListId = (next: string | null, opts?: { replace?: boolean }) =>
    setSearch({ listId: next }, { replace: opts?.replace ?? false });

  const openSplitFor = (key: string) =>
    setSearch({ view: "split", listId: key }, { replace: false });

  const toggleExpanded = (key: string) => {
    const next = new Set(expanded());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSearch(
      { expanded: next.size ? Array.from(next).join(",") : null },
      { replace: true }
    );
  };

  const clearExpanded = () => setSearch({ expanded: null }, { replace: true });

  return {
    projectId,
    setSearch,
    view,
    setView,
    q,
    setQ,
    sort,
    setSort,
    dir,
    setDir,
    listId,
    setListId,
    openSplitFor,
    expanded,
    toggleExpanded,
    clearExpanded,
  };
}


