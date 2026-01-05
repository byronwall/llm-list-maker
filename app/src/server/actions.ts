import { action } from "@solidjs/router";

import {
  reviewBoard,
  suggestItems,
  suggestLists,
  suggestReorg,
  suggestItemsAndLists,
} from "./ai";
export { aiHelp } from "./ai-help";
import { db } from "./db";
import { resolveIdLikeGitHash } from "./id-match";

export const createProject = action(
  async (input: { title: string; description: string }) => {
    "use server";
    return await db().createProject(input);
  },
  "projects:create"
);

export const importProjectJson = action(async (input: { jsonText: string }) => {
  "use server";
  return await db().importProjectJsonText(input.jsonText);
}, "projects:importJson");

export const updateProject = action(
  async (input: {
    projectId: string;
    patch: { title?: string; description?: string };
  }) => {
    "use server";
    return await db().updateProject(input);
  },
  "project:update"
);

export const deleteProject = action(async (input: { projectId: string }) => {
  "use server";
  await db().deleteProject(input);
}, "project:delete");

export const createList = action(
  async (input: { projectId: string; title: string; description: string }) => {
    "use server";
    return await db().createList(input);
  },
  "project:list:create"
);

export const duplicateList = action(
  async (input: { projectId: string; listId: string }) => {
    "use server";
    return await db().duplicateList(input);
  },
  "project:list:duplicate"
);

export const updateList = action(
  async (input: {
    projectId: string;
    listId: string;
    patch: { title?: string; description?: string };
  }) => {
    "use server";
    return await db().updateList(input);
  },
  "project:list:update"
);

export const deleteList = action(
  async (input: { projectId: string; listId: string }) => {
    "use server";
    await db().deleteList(input);
  },
  "project:list:delete"
);

export const reorderLists = action(
  async (input: { projectId: string; listIdsInOrder: string[] }) => {
    "use server";
    return await db().reorderLists(input);
  },
  "project:list:reorder"
);

export const createItem = action(
  async (input: {
    projectId: string;
    listId: string | null;
    label: string;
    description: string;
  }) => {
    "use server";
    return await db().createItem(input);
  },
  "project:item:create"
);

export const updateItem = action(
  async (input: {
    projectId: string;
    itemId: string;
    patch: { label?: string; description?: string };
  }) => {
    "use server";
    return await db().updateItem(input);
  },
  "project:item:update"
);

export const deleteItem = action(
  async (input: { projectId: string; itemId: string }) => {
    "use server";
    await db().deleteItem(input);
  },
  "project:item:delete"
);

export const moveItem = action(
  async (input: {
    projectId: string;
    itemId: string;
    toListId: string | null;
    toIndex: number;
  }) => {
    "use server";
    return await db().moveItem(input);
  },
  "project:item:move"
);

export const aiSuggestLists = action(async (input: { projectId: string }) => {
  "use server";
  const board = await db().getProjectBoard(input.projectId);
  const aiResult = await suggestLists({
    projectTitle: board.project.title,
    projectDescription: board.project.description,
    existingListTitles: board.lists.map((l) => l.title),
  });

  const existing = new Set(board.lists.map((l) => l.title.toLowerCase()));
  const created = [];

  const lists = (aiResult.object as any).lists as {
    title: string;
    description: string;
  }[];
  for (const l of lists) {
    const title = String(l?.title ?? "").trim();
    const description = String(l?.description ?? "").trim();
    if (!title) continue;
    if (existing.has(title.toLowerCase())) continue;
    created.push(
      await db().createList({ projectId: input.projectId, title, description })
    );
    existing.add(title.toLowerCase());
  }

  return { createdCount: created.length, created };
}, "project:ai:suggestLists");

export const aiSuggestItems = action(async (input: { projectId: string }) => {
  "use server";
  const board = await db().getProjectBoard(input.projectId);
  const aiResult = await suggestItems({
    projectTitle: board.project.title,
    projectDescription: board.project.description,
    lists: board.lists.map((l) => ({
      title: l.title,
      description: l.description,
    })),
    existingItemLabels: board.items.map((i) => i.label),
  });

  const existingLabels = new Set(board.items.map((i) => i.label.toLowerCase()));
  const listByTitle = new Map(
    board.lists.map((l) => [l.title.toLowerCase(), l] as const)
  );
  const created = [];

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

    created.push(
      await db().createItem({
        projectId: input.projectId,
        listId: list?.id ?? null,
        label,
        description,
      })
    );
    existingLabels.add(label.toLowerCase());
  }

  return { createdCount: created.length, created };
}, "project:ai:suggestItems");

export const aiReorganizeBoard = action(
  async (input: { projectId: string }) => {
    "use server";
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
    });

    const moves = (aiResult.object as any).moves as {
      itemId: string;
      targetListIdOrLoose: string;
      rationale: string;
    }[];
    const applied = [];
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
      // Skip no-ops; otherwise this can create silent reordering within the same container.
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
      applied.push({
        itemId: item.id,
        toListId,
        toIndex,
        rationale: m?.rationale ?? "",
      });
    }

    return { appliedCount: applied.length, applied };
  },
  "project:ai:reorganize"
);

export const aiReviewBoard = action(async (input: { projectId: string }) => {
  "use server";
  const board = await db().getProjectBoard(input.projectId);
  const listTitleById = new Map(
    board.lists.map((l) => [l.id, l.title] as const)
  );

  const aiResult = await reviewBoard({
    projectTitle: board.project.title,
    projectDescription: board.project.description,
    lists: board.lists.map((l) => ({
      title: l.title,
      description: l.description,
    })),
    items: board.items.map((i) => ({
      label: i.label,
      description: i.description,
      listTitleOrLoose: i.listId
        ? listTitleById.get(i.listId) ?? "Loose"
        : "Loose",
    })),
  });

  const obj = aiResult.object as any;
  return {
    commentary: String(obj?.commentary ?? ""),
    questions: (obj?.questions ?? []) as string[],
  };
}, "project:ai:review");

export const aiSuggestItemsAndLists = action(
  async (input: { projectId: string }) => {
    "use server";
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
    const createdLists = [];

    // Deduplicate new lists by title to avoid creating duplicates if AI hallucinates
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
      createdLists.push(created);
      existingListTitles.add(title.toLowerCase());
      // Map the temporary ID to the new DB ID
      if (l.id) {
        tempIdToRealId.set(l.id, created.id);
      }
    }

    // 2. Create items and link them
    const existingLabels = new Set(
      board.items.map((i) => i.label.toLowerCase())
    );
    const createdItems = [];
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

      createdItems.push(
        await db().createItem({
          projectId: input.projectId,
          listId: finalListId,
          label,
          description: it.description ?? "",
        })
      );
      existingLabels.add(label.toLowerCase());
    }

    return {
      createdListCount: createdLists.length,
      createdItemCount: createdItems.length,
      createdLists,
      createdItems,
    };
  },
  "project:ai:suggestItemsAndLists"
);
