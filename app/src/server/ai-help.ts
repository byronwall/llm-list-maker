import { action } from "@solidjs/router";

import {
  suggestItems,
  suggestLists,
  suggestReorg,
  suggestItemsAndLists,
  suggestCleanup,
} from "./ai";
import { db } from "./db";
import { resolveIdLikeGitHash } from "./id-match";

export const aiHelp = action(
  async (input: {
    projectId: string;
    userInput?: string;
    createLists: boolean;
    createItems: boolean;
    moveItemsAround: boolean;
    cleanupContent: boolean;
  }) => {
    "use server";

    const userInput = String(input.userInput ?? "").trim();

    let createdListsCount = 0;
    let createdItemsCount = 0;
    let movedItemsCount = 0;
    let cleanedCount = 0;

    // 0) Combined Lists + Items (Preferred "One Shot" Mode)
    if (input.createLists && input.createItems) {
      const board = await db().getProjectBoard(input.projectId);
      const aiResult = await suggestItemsAndLists({
        projectTitle: board.project.title,
        projectDescription: board.project.description,
        existingLists: board.lists.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
        })),
        existingItemLabels: board.items.map((i) => i.label),
        userInput,
      });

      const raw = aiResult.object as any;
      const newLists = (raw.newLists ?? []) as {
        id: string;
        title: string;
        description: string;
      }[];
      const items = (raw.items ?? []) as {
        label: string;
        description: string;
        listId: string;
      }[];

      // 1. Create new lists and track their real IDs
      const tempIdToRealId = new Map<string, string>();

      // Deduplicate new lists by title
      const existingListTitles = new Set(
        board.lists.map((l) => l.title.toLowerCase())
      );

      for (const l of newLists) {
        const title = String(l.title ?? "").trim();
        if (!title) continue;
        if (existingListTitles.has(title.toLowerCase())) continue;

        const created = await db().createList({
          projectId: input.projectId,
          title,
          description: l.description ?? "",
        });
        existingListTitles.add(title.toLowerCase());
        createdListsCount += 1;
        // Map the temporary ID to the new DB ID
        if (l.id) {
          tempIdToRealId.set(l.id, created.id);
        }
      }

      // 2. Create items and link them
      const existingLabels = new Set(
        board.items.map((i) => i.label.toLowerCase())
      );
      const listIds = board.lists.map((l) => l.id); // Valid existing list IDs

      for (const it of items) {
        const label = String(it.label ?? "").trim();
        if (!label) continue;
        if (existingLabels.has(label.toLowerCase())) continue;

        const rawListId = String(it.listId ?? "").trim();
        let finalListId: string | null = null;

        if (rawListId.toUpperCase() === "LOOSE") {
          finalListId = null;
        } else if (tempIdToRealId.has(rawListId)) {
          // It's a newly created list
          finalListId = tempIdToRealId.get(rawListId)!;
        } else {
          // Try to match an existing list
          const resolved = resolveIdLikeGitHash(rawListId, listIds);
          finalListId = resolved ?? null; // If not found, default to LOOSE (null)
        }

        await db().createItem({
          projectId: input.projectId,
          listId: finalListId,
          label,
          description: it.description ?? "",
        });
        existingLabels.add(label.toLowerCase());
        createdItemsCount += 1;
      }

      // Mark as handled so we don't run the individual steps
      input.createLists = false;
      input.createItems = false;
    }

    // 1) Create lists (only if not handled above)
    if (input.createLists) {
      const board = await db().getProjectBoard(input.projectId);
      const aiResult = await suggestLists({
        projectTitle: board.project.title,
        projectDescription: board.project.description,
        existingListTitles: board.lists.map((l) => l.title),
        userInput,
      });

      const existing = new Set(board.lists.map((l) => l.title.toLowerCase()));
      const lists = (aiResult.object as any).lists as {
        title: string;
        description: string;
      }[];
      for (const l of lists) {
        const title = String(l?.title ?? "").trim();
        const description = String(l?.description ?? "").trim();
        if (!title) continue;
        if (existing.has(title.toLowerCase())) continue;
        await db().createList({
          projectId: input.projectId,
          title,
          description,
        });
        existing.add(title.toLowerCase());
        createdListsCount += 1;
      }
    }

    // 2) Create items (optional) - uses latest board (including any new lists)
    if (input.createItems) {
      const board = await db().getProjectBoard(input.projectId);
      const existingLabels = new Set(
        board.items.map((i) => i.label.toLowerCase())
      );
      const aiResult = await suggestItems({
        projectTitle: board.project.title,
        projectDescription: board.project.description,
        lists: board.lists.map((l) => ({
          title: l.title,
          description: l.description,
        })),
        existingItemLabels: board.items.map((i) => i.label),
        userInput,
      });

      const listByTitle = new Map(
        board.lists.map((l) => [l.title.toLowerCase(), l] as const)
      );

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
        const list = isLoose
          ? null
          : listByTitle.get(listTitleOrLoose.toLowerCase()) ?? null;

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
        lists: board.lists.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
        })),
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
        const list = isLoose
          ? null
          : resolvedListId
            ? listById.get(resolvedListId) ?? null
            : null;
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

    // 4) Cleanup / Polish Content
    if (input.cleanupContent) {
      const board = await db().getProjectBoard(input.projectId);

      const aiResult = await suggestCleanup({
        projectTitle: board.project.title,
        projectDescription: board.project.description,
        lists: board.lists.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
        })),
        items: board.items.map((i) => ({
          id: i.id,
          label: i.label,
          description: i.description,
          listId: i.listId,
        })),
        userInput,
      });

      const res = aiResult.object as any;
      const listsToUpdate = (res.lists ?? []) as {
        id: string;
        title: string;
        description: string;
      }[];
      const itemsToUpdate = (res.items ?? []) as {
        id: string;
        label: string;
        description: string;
      }[];

      for (const l of listsToUpdate) {
        await db().updateList({
          projectId: input.projectId,
          listId: l.id,
          patch: { title: l.title, description: l.description },
        });
        cleanedCount++;
      }

      for (const i of itemsToUpdate) {
        await db().updateItem({
          projectId: input.projectId,
          itemId: i.id,
          patch: { label: i.label, description: i.description },
        });
        cleanedCount++;
      }
    }

    return {
      createdListsCount,
      createdItemsCount,
      movedItemsCount,
      cleanedCount,
    };
  },
  "project:ai:help"
);
