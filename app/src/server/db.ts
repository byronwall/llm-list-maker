import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import type {
  Item,
  List,
  Project,
  ProjectBoard,
  ProjectSummary,
} from "~/lib/domain";

type LegacyDbData = {
  projects: Project[];
  lists: List[];
  items: Item[];
};

export type ProjectFileData = ProjectBoard;

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function getLegacyDbFilePath() {
  return path.join(process.cwd(), "data", "db.json");
}

function getProjectsDirPath() {
  return path.join(process.cwd(), "data", "projects");
}

class JsonDb {
  private writeQueue: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | null = null;

  private ensureInitialized(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.migrateLegacyDbIfNeeded();
    return this.initPromise;
  }

  private async listProjectFileIds(): Promise<string[]> {
    const dir = getProjectsDirPath();
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .filter((n) => n.endsWith(".json"))
        .map((n) => n.slice(0, -".json".length));
    } catch (err: any) {
      if (err?.code === "ENOENT") return [];
      throw err;
    }
  }

  private getProjectFilePath(projectId: string) {
    return path.join(getProjectsDirPath(), `${projectId}.json`);
  }

  private async readProjectFile(
    projectId: string
  ): Promise<ProjectFileData | null> {
    const filePath = this.getProjectFilePath(projectId);
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as any;
      return this.coerceProjectFile(parsed, projectId);
    } catch (err: any) {
      if (err?.code === "ENOENT") return null;
      throw err;
    }
  }

  private async writeProjectFile(
    projectId: string,
    data: ProjectFileData
  ): Promise<void> {
    const filePath = this.getProjectFilePath(projectId);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  private async mutateProject<T>(
    projectId: string,
    fn: (data: ProjectFileData) => T | Promise<T>
  ): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(async () => {
      await this.ensureInitialized();
      const data = await this.readProjectFile(projectId);
      if (!data) throw new Error("Project not found");
      result = await fn(data);
      await this.writeProjectFile(projectId, data);
    });
    await this.writeQueue;
    return result;
  }

  private coerceProjectFile(
    input: any,
    projectIdHint?: string
  ): ProjectFileData {
    const now = nowIso();
    const projectId = String(input?.project?.id ?? projectIdHint ?? id());

    const project: Project = {
      id: projectId,
      title: String(input?.project?.title ?? "").trim(),
      description: String(input?.project?.description ?? ""),
      createdAt: String(input?.project?.createdAt ?? now),
      updatedAt: String(
        input?.project?.updatedAt ?? input?.project?.createdAt ?? now
      ),
    };
    if (!project.title) project.title = "Untitled project";

    const lists: List[] = Array.isArray(input?.lists) ? input.lists : [];
    const items: Item[] = Array.isArray(input?.items) ? input.items : [];

    const normalizedLists: List[] = lists.map((l: any, idx: number) => ({
      id: String(l?.id ?? id()),
      projectId,
      title: String(l?.title ?? "").trim() || `List ${idx + 1}`,
      description: String(l?.description ?? ""),
      order: Number.isFinite(Number(l?.order)) ? Number(l.order) : idx,
      createdAt: String(l?.createdAt ?? now),
      updatedAt: String(l?.updatedAt ?? l?.createdAt ?? now),
    }));

    const listIds = new Set(normalizedLists.map((l) => l.id));
    const normalizedItems: Item[] = items.map((it: any, idx: number) => ({
      id: String(it?.id ?? id()),
      projectId,
      listId: it?.listId == null ? null : String(it.listId),
      label: String(it?.label ?? "").trim() || `Item ${idx + 1}`,
      description: String(it?.description ?? ""),
      order: Number.isFinite(Number(it?.order)) ? Number(it.order) : idx,
      createdAt: String(it?.createdAt ?? now),
      updatedAt: String(it?.updatedAt ?? it?.createdAt ?? now),
    }));

    // Ensure listId references are valid; otherwise treat as Loose.
    for (const it of normalizedItems) {
      if (it.listId && !listIds.has(it.listId)) it.listId = null;
    }

    return {
      project,
      lists: normalizedLists.sort((a, b) => a.order - b.order),
      items: normalizedItems.sort((a, b) => {
        const aKey = a.listId ?? "";
        const bKey = b.listId ?? "";
        if (aKey !== bKey) return aKey.localeCompare(bKey);
        if (a.order !== b.order) return a.order - b.order;
        return a.updatedAt.localeCompare(b.updatedAt);
      }),
    };
  }

  private async migrateLegacyDbIfNeeded(): Promise<void> {
    const dir = getProjectsDirPath();
    const existingIds = await this.listProjectFileIds();
    if (existingIds.length > 0) return;

    const legacyPath = getLegacyDbFilePath();
    let legacyRaw: string;
    try {
      legacyRaw = await readFile(legacyPath, "utf8");
    } catch (err: any) {
      if (err?.code === "ENOENT") return;
      throw err;
    }

    let legacy: LegacyDbData;
    try {
      legacy = JSON.parse(legacyRaw) as LegacyDbData;
    } catch {
      // If the legacy file is not valid JSON, do not attempt migration.
      return;
    }

    const projects = Array.isArray(legacy?.projects) ? legacy.projects : [];
    const lists = Array.isArray(legacy?.lists) ? legacy.lists : [];
    const items = Array.isArray(legacy?.items) ? legacy.items : [];

    if (projects.length === 0) return;

    await mkdir(dir, { recursive: true });
    for (const p of projects) {
      const projectId = String((p as any)?.id ?? id());
      const board: ProjectFileData = {
        project: {
          id: projectId,
          title: String((p as any)?.title ?? "Untitled project"),
          description: String((p as any)?.description ?? ""),
          createdAt: String((p as any)?.createdAt ?? nowIso()),
          updatedAt: String(
            (p as any)?.updatedAt ?? (p as any)?.createdAt ?? nowIso()
          ),
        },
        lists: lists
          .filter((l) => String((l as any)?.projectId ?? "") === projectId)
          .map((l) => ({
            ...l,
            projectId,
          }))
          .sort((a, b) => a.order - b.order),
        items: items
          .filter((it) => String((it as any)?.projectId ?? "") === projectId)
          .map((it) => ({
            ...it,
            projectId,
          }))
          .sort((a, b) => {
            const aKey = a.listId ?? "";
            const bKey = b.listId ?? "";
            if (aKey !== bKey) return aKey.localeCompare(bKey);
            if (a.order !== b.order) return a.order - b.order;
            return a.updatedAt.localeCompare(b.updatedAt);
          }),
      };
      await this.writeProjectFile(projectId, board);
    }

    // Leave a backup of the old file so data is preserved.
    try {
      await rename(
        legacyPath,
        path.join(path.dirname(legacyPath), "db.legacy.json")
      );
    } catch {
      // If rename fails (e.g. backup exists), keep the old file as-is.
    }
  }

  async importProjectJsonText(
    jsonText: string
  ): Promise<{ importedProjectIds: string[] }> {
    await this.ensureInitialized();
    const parsed = JSON.parse(jsonText) as any;

    const importedProjectIds: string[] = [];

    const importOne = async (rawBoard: any) => {
      // Coerce to our canonical shape.
      const coerced = this.coerceProjectFile(rawBoard);

      // Avoid overwriting an existing project file: if the ID exists, mint a new one.
      const existing = await this.readProjectFile(coerced.project.id);
      let finalProjectId = coerced.project.id;
      if (existing) {
        finalProjectId = id();
        coerced.project.id = finalProjectId;
        coerced.lists = coerced.lists.map((l) => ({
          ...l,
          projectId: finalProjectId,
        }));
        coerced.items = coerced.items.map((it) => ({
          ...it,
          projectId: finalProjectId,
        }));
      }

      await this.writeProjectFile(finalProjectId, coerced);
      importedProjectIds.push(finalProjectId);
    };

    const importManyLegacy = async (legacy: LegacyDbData) => {
      const projects = Array.isArray(legacy?.projects) ? legacy.projects : [];
      const lists = Array.isArray(legacy?.lists) ? legacy.lists : [];
      const items = Array.isArray(legacy?.items) ? legacy.items : [];

      for (const p of projects) {
        const projectId = String((p as any)?.id ?? id());
        const board: ProjectFileData = {
          project: {
            id: projectId,
            title: String((p as any)?.title ?? "Untitled project"),
            description: String((p as any)?.description ?? ""),
            createdAt: String((p as any)?.createdAt ?? nowIso()),
            updatedAt: String(
              (p as any)?.updatedAt ?? (p as any)?.createdAt ?? nowIso()
            ),
          },
          lists: lists
            .filter((l) => String((l as any)?.projectId ?? "") === projectId)
            .map((l) => ({ ...l, projectId }))
            .sort((a, b) => a.order - b.order),
          items: items
            .filter((it) => String((it as any)?.projectId ?? "") === projectId)
            .map((it) => ({ ...it, projectId }))
            .sort((a, b) => {
              const aKey = a.listId ?? "";
              const bKey = b.listId ?? "";
              if (aKey !== bKey) return aKey.localeCompare(bKey);
              if (a.order !== b.order) return a.order - b.order;
              return a.updatedAt.localeCompare(b.updatedAt);
            }),
        };

        await importOne(board);
      }
    };

    // Serialize imports via the write queue.
    this.writeQueue = this.writeQueue.then(async () => {
      if (parsed && typeof parsed === "object" && "project" in parsed) {
        await importOne(parsed);
        return;
      }
      if (parsed && typeof parsed === "object" && "projects" in parsed) {
        await importManyLegacy(parsed as LegacyDbData);
        return;
      }
      throw new Error(
        "Unsupported JSON format. Expected a project JSON or legacy db JSON."
      );
    });

    await this.writeQueue;
    return { importedProjectIds };
  }

  async listProjects(): Promise<Project[]> {
    await this.ensureInitialized();
    const ids = await this.listProjectFileIds();
    const projects: Project[] = [];
    for (const projectId of ids) {
      const board = await this.readProjectFile(projectId);
      if (board) projects.push(board.project);
    }
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listProjectSummaries(): Promise<ProjectSummary[]> {
    await this.ensureInitialized();
    const ids = await this.listProjectFileIds();
    const summaries: ProjectSummary[] = [];
    for (const projectId of ids) {
      const board = await this.readProjectFile(projectId);
      if (!board) continue;
      summaries.push({
        ...board.project,
        listCount: board.lists.length,
        itemCount: board.items.length,
      });
    }
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getProject(projectId: string): Promise<Project | null> {
    await this.ensureInitialized();
    const board = await this.readProjectFile(projectId);
    return board?.project ?? null;
  }

  async createProject(input: {
    title: string;
    description: string;
  }): Promise<Project> {
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) throw new Error("Project title is required");
    await this.ensureInitialized();

    const createdAt = nowIso();
    const project: Project = {
      id: id(),
      title,
      description,
      createdAt,
      updatedAt: createdAt,
    };

    // Serialize project creation with the write queue.
    this.writeQueue = this.writeQueue.then(async () => {
      const board: ProjectFileData = { project, lists: [], items: [] };
      await this.writeProjectFile(project.id, board);
    });
    await this.writeQueue;
    return project;
  }

  async updateProject(input: {
    projectId: string;
    patch: Partial<Pick<Project, "title" | "description">>;
  }): Promise<Project> {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const patch: any = { ...input.patch };
      if (typeof patch.title === "string") patch.title = patch.title.trim();
      if (typeof patch.description === "string")
        patch.description = patch.description.trim();
      if (patch.title === "") throw new Error("Project title is required");

      Object.assign(project, patch);
      project.updatedAt = nowIso();
      return project;
    });
  }

  async deleteProject(input: { projectId: string }): Promise<void> {
    // Serialize deletes via the write queue to avoid racing with other writes.
    this.writeQueue = this.writeQueue.then(async () => {
      await this.ensureInitialized();
      const filePath = this.getProjectFilePath(input.projectId);
      try {
        await unlink(filePath);
      } catch (err: any) {
        if (err?.code === "ENOENT") throw new Error("Project not found");
        throw err;
      }
    });
    await this.writeQueue;
  }

  async getProjectBoard(projectId: string): Promise<ProjectBoard> {
    await this.ensureInitialized();
    const board = await this.readProjectFile(projectId);
    if (!board) throw new Error("Project not found");
    return board;
  }

  private normalizeListOrders(data: ProjectFileData) {
    data.lists
      .sort((a, b) => a.order - b.order)
      .forEach((l, idx) => {
        l.order = idx;
      });
  }

  private normalizeItemOrders(data: ProjectFileData, listId: string | null) {
    data.items
      .filter((i) => i.listId === listId)
      .sort((a, b) => a.order - b.order)
      .forEach((it, idx) => {
        it.order = idx;
      });
  }

  async createList(input: {
    projectId: string;
    title: string;
    description: string;
  }): Promise<List> {
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) throw new Error("List title is required");

    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const createdAt = nowIso();
      const order = Math.max(-1, ...data.lists.map((l) => l.order)) + 1;
      const list: List = {
        id: id(),
        projectId: input.projectId,
        title,
        description,
        order,
        createdAt,
        updatedAt: createdAt,
      };
      data.lists.push(list);
      project.updatedAt = nowIso();
      return list;
    });
  }

  async duplicateList(input: {
    projectId: string;
    listId: string;
  }): Promise<{ list: List; duplicatedItemCount: number }> {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const src = data.lists.find((l) => l.id === input.listId);
      if (!src) throw new Error("List not found");

      const now = nowIso();
      const existingTitles = new Set(
        data.lists.map((l) => l.title.trim().toLowerCase())
      );

      const base = (src.title || "Untitled list").trim();
      let title = `${base} (copy)`;
      let n = 2;
      while (existingTitles.has(title.toLowerCase())) {
        title = `${base} (copy ${n})`;
        n += 1;
      }

      const order = Math.max(-1, ...data.lists.map((l) => l.order)) + 1;
      const list: List = {
        id: id(),
        projectId: input.projectId,
        title,
        description: src.description ?? "",
        order,
        createdAt: now,
        updatedAt: now,
      };
      data.lists.push(list);

      const srcItems = data.items
        .filter((it) => it.listId === src.id)
        .sort((a, b) => a.order - b.order);
      for (const it of srcItems) {
        data.items.push({
          id: id(),
          projectId: input.projectId,
          listId: list.id,
          label: it.label,
          description: it.description ?? "",
          order: it.order,
          createdAt: now,
          updatedAt: now,
        });
      }
      this.normalizeItemOrders(data, list.id);

      project.updatedAt = nowIso();
      return { list, duplicatedItemCount: srcItems.length };
    });
  }

  async updateList(input: {
    projectId: string;
    listId: string;
    patch: Partial<Pick<List, "title" | "description">>;
  }) {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const list = data.lists.find((l) => l.id === input.listId);
      if (!list) throw new Error("List not found");

      const patch: any = { ...input.patch };
      if (typeof patch.title === "string") patch.title = patch.title.trim();
      if (typeof patch.description === "string")
        patch.description = patch.description.trim();
      if (patch.title === "") throw new Error("List title is required");

      Object.assign(list, patch);
      list.updatedAt = nowIso();
      project.updatedAt = nowIso();
      return list;
    });
  }

  async deleteList(input: {
    projectId: string;
    listId: string;
  }): Promise<void> {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const list = data.lists.find((l) => l.id === input.listId);
      if (!list) throw new Error("List not found");

      // Move items in this list to Loose.
      for (const item of data.items) {
        if (item.listId === input.listId) {
          item.listId = null;
          item.updatedAt = nowIso();
        }
      }

      data.lists = data.lists.filter((l) => l.id !== input.listId);
      this.normalizeListOrders(data);
      this.normalizeItemOrders(data, null);
      project.updatedAt = nowIso();
    });
  }

  async reorderLists(input: {
    projectId: string;
    listIdsInOrder: string[];
  }): Promise<List[]> {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const idToList = new Map(data.lists.map((l) => [l.id, l] as const));

      input.listIdsInOrder.forEach((listId, idx) => {
        const list = idToList.get(listId);
        if (!list) return;
        list.order = idx;
        list.updatedAt = nowIso();
      });

      this.normalizeListOrders(data);
      project.updatedAt = nowIso();
      return [...data.lists].sort((a, b) => a.order - b.order);
    });
  }

  async createItem(input: {
    projectId: string;
    listId: string | null;
    label: string;
    description: string;
  }): Promise<Item> {
    const label = input.label.trim();
    const description = input.description.trim();
    if (!label) throw new Error("Item label is required");

    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      if (input.listId) {
        const list = data.lists.find((l) => l.id === input.listId);
        if (!list) throw new Error("List not found");
      }

      const createdAt = nowIso();
      const order =
        Math.max(
          -1,
          ...data.items
            .filter((i) => i.listId === input.listId)
            .map((i) => i.order)
        ) + 1;
      const item: Item = {
        id: id(),
        projectId: input.projectId,
        listId: input.listId,
        label,
        description,
        order,
        createdAt,
        updatedAt: createdAt,
      };
      data.items.push(item);
      project.updatedAt = nowIso();
      return item;
    });
  }

  async updateItem(input: {
    projectId: string;
    itemId: string;
    patch: Partial<Pick<Item, "label" | "description">>;
  }): Promise<Item> {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const item = data.items.find((i) => i.id === input.itemId);
      if (!item) throw new Error("Item not found");

      const patch: any = { ...input.patch };
      if (typeof patch.label === "string") patch.label = patch.label.trim();
      if (typeof patch.description === "string")
        patch.description = patch.description.trim();
      if (patch.label === "") throw new Error("Item label is required");

      Object.assign(item, patch);
      item.updatedAt = nowIso();
      project.updatedAt = nowIso();
      return item;
    });
  }

  async deleteItem(input: {
    projectId: string;
    itemId: string;
  }): Promise<void> {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const item = data.items.find((i) => i.id === input.itemId);
      if (!item) throw new Error("Item not found");

      const sourceListId = item.listId;
      data.items = data.items.filter((i) => i.id !== input.itemId);
      this.normalizeItemOrders(data, sourceListId);
      project.updatedAt = nowIso();
    });
  }

  async moveItem(input: {
    projectId: string;
    itemId: string;
    toListId: string | null;
    toIndex: number;
  }): Promise<Item> {
    return this.mutateProject(input.projectId, (data) => {
      const project = data.project;
      const item = data.items.find((i) => i.id === input.itemId);
      if (!item) throw new Error("Item not found");

      if (input.toListId) {
        const list = data.lists.find((l) => l.id === input.toListId);
        if (!list) throw new Error("List not found");
      }

      const fromListId = item.listId;
      const toListId = input.toListId;

      // Remove item from its source ordering by temporarily setting to a sentinel order.
      item.listId = toListId;
      item.order = Number.MAX_SAFE_INTEGER;
      item.updatedAt = nowIso();

      // Build destination list, insert at index, then renumber.
      const destItems = data.items
        .filter(
          (i) =>
            i.projectId === input.projectId &&
            i.listId === toListId &&
            i.id !== item.id
        )
        .sort((a, b) => a.order - b.order);
      const insertAt = Math.max(
        0,
        Math.min(destItems.length, Math.floor(input.toIndex))
      );
      destItems.splice(insertAt, 0, item);
      destItems.forEach((it, idx) => {
        it.order = idx;
        it.updatedAt = nowIso();
      });

      // Renumber the source container too (if different).
      if (fromListId !== toListId) {
        this.normalizeItemOrders(data, fromListId);
      }

      project.updatedAt = nowIso();
      return item;
    });
  }
}

let singleton: JsonDb | null = null;

export function db() {
  if (!singleton) singleton = new JsonDb();
  return singleton;
}
