import { action } from "@solidjs/router";

import { suggestItems, suggestLists, suggestReorg } from "./ai";
import { db } from "./db";

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

    let createdListsCount = 0;
    let createdItemsCount = 0;
    let movedItemsCount = 0;

    // 1) Create lists (optional)
    if (input.createLists) {
      const board = await db().getProjectBoard(input.projectId);
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

    // 2) Create items (optional) - uses latest board (including any new lists)
    if (input.createItems) {
      const board = await db().getProjectBoard(input.projectId);
      const aiResult = await suggestItems({
        projectTitle: board.project.title,
        projectDescription: board.project.description,
        lists: board.lists.map((l) => ({ title: l.title, description: l.description })),
        existingItemLabels: board.items.map((i) => i.label),
        userInput,
      });

      const existingLabels = new Set(board.items.map((i) => i.label.toLowerCase()));
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

    // 3) Move items around (optional) - reorganize existing items only
    if (input.moveItemsAround) {
      const board = await db().getProjectBoard(input.projectId);

      const listByTitle = new Map(board.lists.map((l) => [l.title.toLowerCase(), l] as const));
      const itemByLabel = new Map(board.items.map((i) => [i.label.toLowerCase(), i] as const));
      const destCounts = new Map<string, number>();

      // Initialize destination counts using current board.
      for (const item of board.items) {
        const key = item.listId ?? "LOOSE";
        destCounts.set(key, (destCounts.get(key) ?? 0) + 1);
      }

      const aiResult = await suggestReorg({
        projectTitle: board.project.title,
        projectDescription: board.project.description,
        lists: board.lists.map((l) => ({ title: l.title, description: l.description })),
        items: board.items.map((i) => ({
          label: i.label,
          description: i.description,
          listTitleOrLoose: i.listId ? board.lists.find((l) => l.id === i.listId)?.title ?? "Loose" : "Loose",
        })),
        userInput,
      });

      const moves = (aiResult.object as any).moves as {
        itemLabel: string;
        targetListTitleOrLoose: string;
        rationale?: string;
      }[];

      for (const m of moves) {
        const itemLabel = String(m?.itemLabel ?? "").trim();
        const target = String(m?.targetListTitleOrLoose ?? "").trim();
        if (!itemLabel || !target) continue;

        const item = itemByLabel.get(itemLabel.toLowerCase());
        if (!item) continue;

        const isLoose = target.toLowerCase() === "loose";
        const list = isLoose ? null : listByTitle.get(target.toLowerCase()) ?? null;
        const destKey = list?.id ?? "LOOSE";
        const toIndex = destCounts.get(destKey) ?? 0;

        await db().moveItem({
          projectId: input.projectId,
          itemId: item.id,
          toListId: list?.id ?? null,
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


