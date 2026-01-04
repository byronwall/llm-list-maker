import { action } from "@solidjs/router";

import { suggestItems, suggestItemsForList, suggestLists, suggestReorg } from "./ai";
import { db } from "./db";
import { resolveIdLikeGitHash } from "./id-match";

function parseYearRange(input: string): { startYear: number; endYear: number } | null {
  const s = String(input ?? "");
  const m = s.match(
    /\b(?:from\s+)?(\d{4})\s*(?:to|through|until|[-–—])\s*(\d{4})\b/i
  );
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < 1900 || a > 2100 || b < 1900 || b > 2100) return null;
  const startYear = Math.min(a, b);
  const endYear = Math.max(a, b);
  return { startYear, endYear };
}

function parseItemsPerList(input: string): number | null {
  const s = String(input ?? "");
  const m = s.match(/\b(\d{1,3})\s*(?:items|entries|cards)\s*(?:each|per\s+(?:year|list))\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  if (n < 1 || n > 50) return null;
  return Math.floor(n);
}

function isPerYearRequest(input: string): boolean {
  const s = String(input ?? "");
  return /\b(each\s+year|per\s+year|for\s+each\s+year)\b/i.test(s);
}

export const aiHelp = action(
  async (input: {
    projectId: string;
    userInput?: string;
    createLists: boolean;
    createItems: boolean;
    moveItemsAround: boolean;
  }) => {
    "use server";

    const userInput = String(input.userInput ?? "").trim();
    const yearRange = parseYearRange(userInput);
    const itemsPerList = parseItemsPerList(userInput);
    const wantsPerYear = !!yearRange && isPerYearRequest(userInput);

    let createdListsCount = 0;
    let createdItemsCount = 0;
    let movedItemsCount = 0;

    // 1) Create lists (optional)
    if (input.createLists) {
      const board = await db().getProjectBoard(input.projectId);

      // Special-case: if the user asks for a list per year in a range, do this deterministically.
      if (wantsPerYear && yearRange) {
        const existing = new Set(board.lists.map((l) => l.title.toLowerCase()));
        for (let y = yearRange.startYear; y <= yearRange.endYear; y += 1) {
          const title = String(y);
          if (existing.has(title.toLowerCase())) continue;
          await db().createList({
            projectId: input.projectId,
            title,
            description: "",
          });
          existing.add(title.toLowerCase());
          createdListsCount += 1;
        }
      } else {
        const aiResult = await suggestLists({
          projectTitle: board.project.title,
          projectDescription: board.project.description,
          existingListTitles: board.lists.map((l) => l.title),
          userInput,
        });

        const existing = new Set(board.lists.map((l) => l.title.toLowerCase()));
        const lists = (aiResult.object as any).lists as { title: string; description: string }[];
        for (const l of lists) {
          const title = String(l?.title ?? "").trim();
          const description = String(l?.description ?? "").trim();
          if (!title) continue;
          if (existing.has(title.toLowerCase())) continue;
          await db().createList({ projectId: input.projectId, title, description });
          existing.add(title.toLowerCase());
          createdListsCount += 1;
        }
      }
    }

    // 2) Create items (optional) - uses latest board (including any new lists)
    if (input.createItems) {
      const board = await db().getProjectBoard(input.projectId);
      const existingLabels = new Set(board.items.map((i) => i.label.toLowerCase()));

      // Special-case: if the user asks for N items per year in a year range, fill each year list.
      if (wantsPerYear && yearRange && itemsPerList) {
        const listByTitle = new Map(board.lists.map((l) => [l.title.toLowerCase(), l] as const));
        const itemCountByListId = new Map<string | null, number>();
        for (const it of board.items) {
          itemCountByListId.set(it.listId, (itemCountByListId.get(it.listId) ?? 0) + 1);
        }

        for (let y = yearRange.startYear; y <= yearRange.endYear; y += 1) {
          const yearTitle = String(y);
          const list = listByTitle.get(yearTitle.toLowerCase()) ?? null;
          if (!list) continue;

          const existingCount = itemCountByListId.get(list.id) ?? 0;
          let remaining = Math.max(0, itemsPerList - existingCount);
          if (remaining <= 0) continue;

          // Generate in small batches to keep outputs reliable.
          let attempts = 0;
          while (remaining > 0 && attempts < 8) {
            attempts += 1;
            const batchSize = Math.min(10, remaining);
            const aiResult = await suggestItemsForList({
              projectTitle: board.project.title,
              projectDescription: board.project.description,
              listTitle: list.title,
              listDescription: list.description,
              existingItemLabels: Array.from(existingLabels),
              userInput,
              maxItems: batchSize,
            });

            const items = (aiResult.object as any).items as { label: string; description: string }[];
            let createdThisBatch = 0;

            for (const it of items) {
              const label = String(it?.label ?? "").trim();
              const description = String(it?.description ?? "").trim();
              if (!label) continue;
              if (existingLabels.has(label.toLowerCase())) continue;

              await db().createItem({
                projectId: input.projectId,
                listId: list.id, // force into the year list
                label,
                description,
              });
              existingLabels.add(label.toLowerCase());
              createdItemsCount += 1;
              createdThisBatch += 1;
            }

            remaining = Math.max(0, remaining - createdThisBatch);
            itemCountByListId.set(list.id, (itemCountByListId.get(list.id) ?? 0) + createdThisBatch);

            // If we failed to create anything (duplicates, etc), avoid an infinite loop.
            if (createdThisBatch === 0) break;
          }
        }
      } else {
        const aiResult = await suggestItems({
          projectTitle: board.project.title,
          projectDescription: board.project.description,
          lists: board.lists.map((l) => ({ title: l.title, description: l.description })),
          existingItemLabels: board.items.map((i) => i.label),
          userInput,
        });

        const listByTitle = new Map(board.lists.map((l) => [l.title.toLowerCase(), l] as const));

        const items = (aiResult.object as any).items as {
          label: string;
          description: string;
          listTitleOrLoose: string;
        }[];

        for (const it of items) {
          const label = String(it?.label ?? "").trim();
          const description = String(it?.description ?? "").trim();
          const listTitleOrLoose = String(it?.listTitleOrLoose ?? "").trim();
          if (!label) continue;
          if (existingLabels.has(label.toLowerCase())) continue;

          const isLoose = listTitleOrLoose.toLowerCase() === "loose";
          const list = isLoose ? null : listByTitle.get(listTitleOrLoose.toLowerCase()) ?? null;

          await db().createItem({
            projectId: input.projectId,
            listId: list?.id ?? null,
            label,
            description,
          });
          existingLabels.add(label.toLowerCase());
          createdItemsCount += 1;
        }
      }
    }

    // 3) Move items around (optional) - reorganize existing items only
    if (input.moveItemsAround) {
      const board = await db().getProjectBoard(input.projectId);

      const listById = new Map(board.lists.map((l) => [l.id, l] as const));
      const itemById = new Map(board.items.map((i) => [i.id, i] as const));
      const listIds = board.lists.map((l) => l.id);
      const itemIds = board.items.map((i) => i.id);
      const destCounts = new Map<string, number>();

      // Initialize destination counts using current board.
      for (const item of board.items) {
        const key = item.listId ?? "LOOSE";
        destCounts.set(key, (destCounts.get(key) ?? 0) + 1);
      }

      const aiResult = await suggestReorg({
        projectTitle: board.project.title,
        projectDescription: board.project.description,
        lists: board.lists.map((l) => ({ id: l.id, title: l.title, description: l.description })),
        items: board.items.map((i) => ({
          id: i.id,
          label: i.label,
          description: i.description,
          listIdOrLoose: i.listId ?? "LOOSE",
        })),
        userInput,
      });

      const moves = (aiResult.object as any).moves as {
        itemId: string;
        targetListIdOrLoose: string;
        rationale: string;
      }[];

      for (const m of moves) {
        const itemId = String(m?.itemId ?? "").trim();
        const targetIdOrLoose = String(m?.targetListIdOrLoose ?? "").trim();
        if (!itemId || !targetIdOrLoose) continue;

        const resolvedItemId = resolveIdLikeGitHash(itemId, itemIds);
        if (!resolvedItemId) continue;
        const item = itemById.get(resolvedItemId);
        if (!item) continue;

        const isLoose = targetIdOrLoose.toUpperCase() === "LOOSE";
        const resolvedListId = isLoose
          ? null
          : resolveIdLikeGitHash(targetIdOrLoose, listIds);
        const list = isLoose ? null : (resolvedListId ? listById.get(resolvedListId) ?? null : null);
        if (!isLoose && !list) continue;

        const toListId = list?.id ?? null;
        if ((item.listId ?? null) === toListId) continue;

        const destKey = toListId ?? "LOOSE";
        const toIndex = destCounts.get(destKey) ?? 0;

        await db().moveItem({
          projectId: input.projectId,
          itemId: item.id,
          toListId,
          toIndex,
        });
        destCounts.set(destKey, toIndex + 1);
        movedItemsCount += 1;
      }
    }

    return { createdListsCount, createdItemsCount, movedItemsCount };
  },
  "project:ai:help",
);


