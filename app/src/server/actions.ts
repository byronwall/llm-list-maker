import { action } from "@solidjs/router";

import { reviewBoard, suggestItems, suggestLists, suggestReorg } from "./ai";
export { aiHelp } from "./ai-help";
import { db } from "./db";

export const createProject = action(async (input: { title: string; description: string }) => {
  "use server";
  return await db().createProject(input);
}, "projects:create");

export const importProjectJson = action(async (input: { jsonText: string }) => {
  "use server";
  return await db().importProjectJsonText(input.jsonText);
}, "projects:importJson");

export const updateProject = action(
  async (input: { projectId: string; patch: { title?: string; description?: string } }) => {
    "use server";
    return await db().updateProject(input);
  },
  "project:update",
);

export const createList = action(async (input: { projectId: string; title: string; description: string }) => {
  "use server";
  return await db().createList(input);
}, "project:list:create");

export const updateList = action(
  async (input: { projectId: string; listId: string; patch: { title?: string; description?: string } }) => {
    "use server";
    return await db().updateList(input);
  },
  "project:list:update",
);

export const deleteList = action(async (input: { projectId: string; listId: string }) => {
  "use server";
  await db().deleteList(input);
}, "project:list:delete");

export const reorderLists = action(async (input: { projectId: string; listIdsInOrder: string[] }) => {
  "use server";
  return await db().reorderLists(input);
}, "project:list:reorder");

export const createItem = action(
  async (input: { projectId: string; listId: string | null; label: string; description: string }) => {
    "use server";
    return await db().createItem(input);
  },
  "project:item:create",
);

export const updateItem = action(
  async (input: { projectId: string; itemId: string; patch: { label?: string; description?: string } }) => {
    "use server";
    return await db().updateItem(input);
  },
  "project:item:update",
);

export const deleteItem = action(async (input: { projectId: string; itemId: string }) => {
  "use server";
  await db().deleteItem(input);
}, "project:item:delete");

export const moveItem = action(
  async (input: { projectId: string; itemId: string; toListId: string | null; toIndex: number }) => {
    "use server";
    return await db().moveItem(input);
  },
  "project:item:move",
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

  const lists = (aiResult.object as any).lists as { title: string; description: string }[];
  for (const l of lists) {
    const title = String(l?.title ?? "").trim();
    const description = String(l?.description ?? "").trim();
    if (!title) continue;
    if (existing.has(title.toLowerCase())) continue;
    created.push(await db().createList({ projectId: input.projectId, title, description }));
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
    lists: board.lists.map((l) => ({ title: l.title, description: l.description })),
    existingItemLabels: board.items.map((i) => i.label),
  });

  const existingLabels = new Set(board.items.map((i) => i.label.toLowerCase()));
  const listByTitle = new Map(board.lists.map((l) => [l.title.toLowerCase(), l] as const));
  const created = [];

  const items = (aiResult.object as any).items as { label: string; description: string; listTitleOrLoose: string }[];
  for (const it of items) {
    const label = String(it?.label ?? "").trim();
    const description = String(it?.description ?? "").trim();
    const listTitleOrLoose = String(it?.listTitleOrLoose ?? "").trim();
    if (!label) continue;
    if (existingLabels.has(label.toLowerCase())) continue;

    const isLoose = listTitleOrLoose.toLowerCase() === "loose";
    const list = isLoose ? null : listByTitle.get(listTitleOrLoose.toLowerCase()) ?? null;

    created.push(
      await db().createItem({
        projectId: input.projectId,
        listId: list?.id ?? null,
        label,
        description,
      }),
    );
    existingLabels.add(label.toLowerCase());
  }

  return { createdCount: created.length, created };
}, "project:ai:suggestItems");

export const aiReorganizeBoard = action(async (input: { projectId: string }) => {
  "use server";
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
  });

  const moves = (aiResult.object as any).moves as { itemLabel: string; targetListTitleOrLoose: string; rationale?: string }[];
  const applied = [];
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
    applied.push({ itemId: item.id, toListId: list?.id ?? null, toIndex, rationale: m?.rationale ?? null });
  }

  return { appliedCount: applied.length, applied };
}, "project:ai:reorganize");

export const aiReviewBoard = action(async (input: { projectId: string }) => {
  "use server";
  const board = await db().getProjectBoard(input.projectId);
  const listTitleById = new Map(board.lists.map((l) => [l.id, l.title] as const));

  const aiResult = await reviewBoard({
    projectTitle: board.project.title,
    projectDescription: board.project.description,
    lists: board.lists.map((l) => ({ title: l.title, description: l.description })),
    items: board.items.map((i) => ({
      label: i.label,
      description: i.description,
      listTitleOrLoose: i.listId ? listTitleById.get(i.listId) ?? "Loose" : "Loose",
    })),
  });

  const obj = aiResult.object as any;
  return { commentary: String(obj?.commentary ?? ""), questions: (obj?.questions ?? []) as string[] };
}, "project:ai:review");


