import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Item, List, Project, ProjectBoard } from "~/lib/domain";

type DbData = {
  projects: Project[];
  lists: List[];
  items: Item[];
};

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function getDbFilePath() {
  // For local dev: write to repo directory.
  // Note: this is not suitable for serverless runtime persistence.
  return path.join(process.cwd(), "data", "db.json");
}

function emptyData(): DbData {
  return {
    projects: [],
    lists: [],
    items: [],
  };
}

class JsonDb {
  private writeQueue: Promise<void> = Promise.resolve();

  private async readData(): Promise<DbData> {
    const filePath = getDbFilePath();
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as DbData;
      return {
        ...emptyData(),
        ...parsed,
      };
    } catch (err: any) {
      if (err?.code === "ENOENT") return emptyData();
      throw err;
    }
  }

  private async writeData(data: DbData): Promise<void> {
    const filePath = getDbFilePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  }

  private async mutate<T>(fn: (data: DbData) => T | Promise<T>): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(async () => {
      const data = await this.readData();
      result = await fn(data);
      await this.writeData(data);
    });
    await this.writeQueue;
    return result;
  }

  async listProjects(): Promise<Project[]> {
    const data = await this.readData();
    return [...data.projects].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }

  async getProject(projectId: string): Promise<Project | null> {
    const data = await this.readData();
    return data.projects.find((p) => p.id === projectId) ?? null;
  }

  async createProject(input: {
    title: string;
    description: string;
  }): Promise<Project> {
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) throw new Error("Project title is required");

    return this.mutate((data) => {
      const createdAt = nowIso();
      const project: Project = {
        id: id(),
        title,
        description,
        createdAt,
        updatedAt: createdAt,
      };
      data.projects.push(project);
      return project;
    });
  }

  async updateProject(input: {
    projectId: string;
    patch: Partial<Pick<Project, "title" | "description">>;
  }): Promise<Project> {
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

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

  async getProjectBoard(projectId: string): Promise<ProjectBoard> {
    const data = await this.readData();
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) throw new Error("Project not found");

    const lists = data.lists
      .filter((l) => l.projectId === projectId)
      .sort((a, b) => a.order - b.order);

    const items = data.items
      .filter((i) => i.projectId === projectId)
      .sort((a, b) => {
        // Group by container (loose first), then order.
        const aKey = a.listId ?? "";
        const bKey = b.listId ?? "";
        if (aKey !== bKey) return aKey.localeCompare(bKey);
        if (a.order !== b.order) return a.order - b.order;
        return a.updatedAt.localeCompare(b.updatedAt);
      });

    return { project, lists, items };
  }

  private normalizeListOrders(data: DbData, projectId: string) {
    const lists = data.lists
      .filter((l) => l.projectId === projectId)
      .sort((a, b) => a.order - b.order);
    lists.forEach((l, idx) => {
      l.order = idx;
      l.updatedAt = nowIso();
    });
  }

  private normalizeItemOrders(
    data: DbData,
    projectId: string,
    listId: string | null
  ) {
    const items = data.items
      .filter((i) => i.projectId === projectId && i.listId === listId)
      .sort((a, b) => a.order - b.order);
    items.forEach((it, idx) => {
      it.order = idx;
      it.updatedAt = nowIso();
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

    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const createdAt = nowIso();
      const order =
        Math.max(
          -1,
          ...data.lists
            .filter((l) => l.projectId === input.projectId)
            .map((l) => l.order)
        ) + 1;
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

  async updateList(input: {
    projectId: string;
    listId: string;
    patch: Partial<Pick<List, "title" | "description">>;
  }) {
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const list = data.lists.find(
        (l) => l.id === input.listId && l.projectId === input.projectId
      );
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
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const list = data.lists.find(
        (l) => l.id === input.listId && l.projectId === input.projectId
      );
      if (!list) throw new Error("List not found");

      // Move items in this list to Loose.
      for (const item of data.items) {
        if (
          item.projectId === input.projectId &&
          item.listId === input.listId
        ) {
          item.listId = null;
          item.updatedAt = nowIso();
        }
      }

      data.lists = data.lists.filter(
        (l) => !(l.projectId === input.projectId && l.id === input.listId)
      );
      this.normalizeListOrders(data, input.projectId);
      this.normalizeItemOrders(data, input.projectId, null);
      project.updatedAt = nowIso();
    });
  }

  async reorderLists(input: {
    projectId: string;
    listIdsInOrder: string[];
  }): Promise<List[]> {
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const lists = data.lists.filter((l) => l.projectId === input.projectId);
      const idToList = new Map(lists.map((l) => [l.id, l] as const));

      input.listIdsInOrder.forEach((listId, idx) => {
        const list = idToList.get(listId);
        if (!list) return;
        list.order = idx;
        list.updatedAt = nowIso();
      });

      this.normalizeListOrders(data, input.projectId);
      project.updatedAt = nowIso();
      return data.lists
        .filter((l) => l.projectId === input.projectId)
        .sort((a, b) => a.order - b.order);
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

    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");
      if (input.listId) {
        const list = data.lists.find(
          (l) => l.id === input.listId && l.projectId === input.projectId
        );
        if (!list) throw new Error("List not found");
      }

      const createdAt = nowIso();
      const order =
        Math.max(
          -1,
          ...data.items
            .filter(
              (i) =>
                i.projectId === input.projectId && i.listId === input.listId
            )
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
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const item = data.items.find(
        (i) => i.id === input.itemId && i.projectId === input.projectId
      );
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
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const item = data.items.find(
        (i) => i.id === input.itemId && i.projectId === input.projectId
      );
      if (!item) throw new Error("Item not found");

      const sourceListId = item.listId;
      data.items = data.items.filter(
        (i) => !(i.projectId === input.projectId && i.id === input.itemId)
      );
      this.normalizeItemOrders(data, input.projectId, sourceListId);
      project.updatedAt = nowIso();
    });
  }

  async moveItem(input: {
    projectId: string;
    itemId: string;
    toListId: string | null;
    toIndex: number;
  }): Promise<Item> {
    return this.mutate((data) => {
      const project = data.projects.find((p) => p.id === input.projectId);
      if (!project) throw new Error("Project not found");

      const item = data.items.find(
        (i) => i.id === input.itemId && i.projectId === input.projectId
      );
      if (!item) throw new Error("Item not found");

      if (input.toListId) {
        const list = data.lists.find(
          (l) => l.id === input.toListId && l.projectId === input.projectId
        );
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
        this.normalizeItemOrders(data, input.projectId, fromListId);
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
