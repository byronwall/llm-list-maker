import { createAsync, revalidate, useAction } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  type Accessor,
} from "solid-js";
import type { Item, List, ProjectBoard } from "~/lib/domain";
import { listKey } from "~/lib/projects/board-utils";
import { aiHelp } from "~/server/ai-help";
import {
  aiReviewBoard,
  createItem,
  createList,
  deleteProject,
  deleteItem,
  deleteList,
  duplicateList,
  moveItem,
  reorderLists,
  updateItem,
  updateList,
  updateProject,
} from "~/server/actions";
import { getProjectBoard } from "~/server/queries";
import type { ProjectBoardController } from "./project-board-context";

export function createProjectBoardController(
  projectId: Accessor<string>
): ProjectBoardController {
  const board = createAsync(() => getProjectBoard(projectId()));
  const [boardSnapshot, setBoardSnapshot] = createSignal<ProjectBoard>();

  createEffect(() => {
    if (board.latest) setBoardSnapshot(board.latest);
  });

  const refresh = async () => {
    await revalidate(getProjectBoard.keyFor(projectId()));
  };

  const runCreateList = useAction(createList);
  const runDuplicateList = useAction(duplicateList);
  const runUpdateList = useAction(updateList);
  const runDeleteList = useAction(deleteList);
  const runReorderLists = useAction(reorderLists);

  const runUpdateProject = useAction(updateProject);
  const runDeleteProject = useAction(deleteProject);

  const runCreateItem = useAction(createItem);
  const runUpdateItem = useAction(updateItem);
  const runDeleteItem = useAction(deleteItem);
  const runMoveItem = useAction(moveItem);

  const runAiHelp = useAction(aiHelp);
  const runAiReview = useAction(aiReviewBoard);

  const b = () => boardSnapshot();

  const lists = () => b()?.lists ?? [];
  const items = () => b()?.items ?? [];

  // Project editing
  const [isEditingProject, setIsEditingProject] = createSignal(false);
  const [editingProjectTitle, setEditingProjectTitle] = createSignal("");
  const [editingProjectDesc, setEditingProjectDesc] = createSignal("");

  createEffect(() => {
    if (!b()) return;
    if (isEditingProject()) return;
    setEditingProjectTitle(b()!.project.title);
    setEditingProjectDesc(b()!.project.description ?? "");
  });

  const startEditProject = () => {
    if (!b()) return;
    setEditingProjectTitle(b()!.project.title);
    setEditingProjectDesc(b()!.project.description ?? "");
    setIsEditingProject(true);
  };

  const cancelEditProject = () => {
    setIsEditingProject(false);
    if (!b()) return;
    setEditingProjectTitle(b()!.project.title);
    setEditingProjectDesc(b()!.project.description ?? "");
  };

  const saveEditProject = async () => {
    await runUpdateProject({
      projectId: projectId(),
      patch: {
        title: editingProjectTitle().trim(),
        description: editingProjectDesc().trim(),
      },
    });
    setIsEditingProject(false);
    await refresh();
  };

  const deleteProjectFn = async () => {
    await runDeleteProject({ projectId: projectId() });
  };

  // List editing
  const [editingListId, setEditingListId] = createSignal<string | null>(null);
  const [editingListTitle, setEditingListTitle] = createSignal("");
  const [editingListDesc, setEditingListDesc] = createSignal("");

  const startEditList = (list: List) => {
    setEditingListId(list.id);
    setEditingListTitle(list.title);
    setEditingListDesc(list.description ?? "");
  };

  const cancelEditList = () => {
    setEditingListId(null);
    setEditingListTitle("");
    setEditingListDesc("");
  };

  const saveEditList = async () => {
    const listId = editingListId();
    if (!listId) return;
    await runUpdateList({
      projectId: projectId(),
      listId,
      patch: {
        title: editingListTitle().trim(),
        description: editingListDesc().trim(),
      },
    });
    cancelEditList();
    await refresh();
  };

  const createListFn = async (args: { title: string; description: string }) => {
    await runCreateList({
      projectId: projectId(),
      title: args.title.trim(),
      description: args.description.trim(),
    });
    await refresh();
  };

  const duplicateListFn = async (listId: string) => {
    const res = await runDuplicateList({ projectId: projectId(), listId });
    await refresh();
    return res;
  };

  const deleteListFn = async (listId: string) => {
    await runDeleteList({ projectId: projectId(), listId });
    await refresh();
  };

  // New item form (shared across columns)
  const [addingItemListId, setAddingItemListId] = createSignal<string | null>(
    null
  );
  const [newItemLabel, setNewItemLabel] = createSignal("");
  const [newItemDesc, setNewItemDesc] = createSignal("");

  const openAddItem = (listId: string | null) => {
    setAddingItemListId(listId);
    setNewItemLabel("");
    setNewItemDesc("");
  };

  const cancelAddItem = () => {
    setAddingItemListId(null);
    setNewItemLabel("");
    setNewItemDesc("");
  };

  const createItemFor = async () => {
    const label = newItemLabel().trim();
    const description = newItemDesc().trim();
    if (!label) return;
    await runCreateItem({
      projectId: projectId(),
      listId: addingItemListId(),
      label,
      description,
    });
    cancelAddItem();
    await refresh();
  };

  const createItemDirect = async (args: {
    listId: string | null;
    label: string;
    description?: string;
  }) => {
    const label = String(args.label ?? "").trim();
    const description = String(args.description ?? "").trim();
    if (!label) return;
    await runCreateItem({
      projectId: projectId(),
      listId: args.listId ?? null,
      label,
      description,
    });
    await refresh();
  };

  // Item editing
  const [editingItemId, setEditingItemId] = createSignal<string | null>(null);
  const [editingItemLabel, setEditingItemLabel] = createSignal("");
  const [editingItemDesc, setEditingItemDesc] = createSignal("");

  const startEditItem = (item: Item) => {
    setEditingItemId(item.id);
    setEditingItemLabel(item.label);
    setEditingItemDesc(item.description ?? "");
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditingItemLabel("");
    setEditingItemDesc("");
  };

  const saveEditItem = async () => {
    const itemId = editingItemId();
    if (!itemId) return;
    await runUpdateItem({
      projectId: projectId(),
      itemId,
      patch: {
        label: editingItemLabel().trim(),
        description: editingItemDesc().trim(),
      },
    });
    cancelEditItem();
    await refresh();
  };

  const deleteItemFn = async (itemId: string) => {
    await runDeleteItem({ projectId: projectId(), itemId });
    await refresh();
  };

  // Review output
  const [reviewCommentary, setReviewCommentary] = createSignal<string | null>(
    null
  );
  const [reviewQuestions, setReviewQuestions] = createSignal<string[]>([]);
  const [isAiBusy, setIsAiBusy] = createSignal(false);

  // AI Help (modal)
  const [isAiHelpOpen, setIsAiHelpOpen] = createSignal(false);
  const [aiHelpUserInput, setAiHelpUserInput] = createSignal("");
  const [aiHelpCreateLists, setAiHelpCreateLists] = createSignal(true);
  const [aiHelpCreateItems, setAiHelpCreateItems] = createSignal(true);
  const [aiHelpMoveItemsAround, setAiHelpMoveItemsAround] = createSignal(false);
  const [aiHelpCleanupContent, setAiHelpCleanupContent] = createSignal(false);

  const canRunAiHelp = createMemo(
    () =>
      aiHelpCreateLists() ||
      aiHelpCreateItems() ||
      aiHelpMoveItemsAround() ||
      aiHelpCleanupContent()
  );

  const onRunAiHelp = async () => {
    if (!canRunAiHelp()) return;
    setIsAiBusy(true);
    try {
      await runAiHelp({
        projectId: projectId(),
        userInput: aiHelpUserInput(),
        createLists: aiHelpCreateLists(),
        createItems: aiHelpCreateItems(),
        moveItemsAround: aiHelpMoveItemsAround(),
        cleanupContent: aiHelpCleanupContent(),
      });
      setIsAiHelpOpen(false);
      await refresh();
    } finally {
      setIsAiBusy(false);
    }
  };

  const onAiReview = async () => {
    setIsAiBusy(true);
    try {
      const result = await runAiReview({ projectId: projectId() });
      setReviewCommentary(result.commentary || null);
      setReviewQuestions(result.questions || []);
      setIsAiHelpOpen(false);
    } finally {
      setIsAiBusy(false);
    }
  };

  const itemsByListId = createMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items()) {
      const key = listKey(it.listId);
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.order - b.order);
    }
    return map;
  });

  const orderedColumns = createMemo(() => {
    const looseItems = itemsByListId().get("LOOSE") ?? [];
    const cols: {
      key: string;
      listId: string | null;
      title: string;
      description: string;
    }[] = [
      ...(looseItems.length > 0
        ? [
            {
              key: "LOOSE",
              listId: null,
              title: "Loose",
              description: "Unassigned items live here.",
            },
          ]
        : []),
      ...lists().map((l) => ({
        key: l.id,
        listId: l.id,
        title: l.title,
        description: l.description,
      })),
    ];
    return cols;
  });

  // Drag/drop state (HTML5 DnD)
  const [draggingItemId, setDraggingItemId] = createSignal<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = createSignal<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = createSignal<string | null>(
    null
  );

  const [draggingListId, setDraggingListId] = createSignal<string | null>(null);
  const [dragOverListId, setDragOverListId] = createSignal<string | null>(null);

  // Make the native browser "drag preview" minimal to avoid visual noise / layout jank.
  let minimalDragImage: HTMLImageElement | null = null;
  const applyMinimalDragImage = (e: DragEvent) => {
    const dt = e.dataTransfer;
    if (!dt) return;
    dt.effectAllowed = "move";
    if (typeof window === "undefined") return;
    if (!minimalDragImage) {
      minimalDragImage = new window.Image();
      // 1x1 transparent gif
      minimalDragImage.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    }
    dt.setDragImage(minimalDragImage, 0, 0);
  };

  const moveItemByDnD = async (
    itemId: string,
    toListId: string | null,
    toIndex: number
  ) => {
    await runMoveItem({ projectId: projectId(), itemId, toListId, toIndex });
    await refresh();
  };

  const onListDropBefore = async (targetListId: string) => {
    const dragged = draggingListId();
    if (!dragged) return;
    if (dragged === targetListId) return;
    const ids = lists()
      .map((l) => l.id)
      .filter((id) => id !== dragged);
    const targetIdx = ids.indexOf(targetListId);
    if (targetIdx < 0) return;
    ids.splice(targetIdx, 0, dragged);
    await runReorderLists({ projectId: projectId(), listIdsInOrder: ids });
    await refresh();
  };

  return {
    projectId,
    board: b,
    refresh,
    deleteProject: deleteProjectFn,

    isEditingProject,
    editingProjectTitle,
    editingProjectDesc,
    setEditingProjectTitle,
    setEditingProjectDesc,
    startEditProject,
    cancelEditProject,
    saveEditProject,

    isAiBusy,
    isAiHelpOpen,
    setIsAiHelpOpen,
    aiHelpUserInput,
    setAiHelpUserInput,
    aiHelpCreateLists,
    setAiHelpCreateLists,
    aiHelpCreateItems,
    setAiHelpCreateItems,
    aiHelpMoveItemsAround,
    setAiHelpMoveItemsAround,
    aiHelpCleanupContent,
    setAiHelpCleanupContent,
    canRunAiHelp,
    onRunAiHelp,
    onAiReview,
    reviewCommentary,
    reviewQuestions,

    lists,
    items,
    createList: createListFn,
    duplicateList: duplicateListFn,
    deleteList: deleteListFn,

    editingListId,
    editingListTitle,
    editingListDesc,
    setEditingListTitle,
    setEditingListDesc,
    startEditList,
    cancelEditList,
    saveEditList,

    addingItemListId,
    newItemLabel,
    newItemDesc,
    setNewItemLabel,
    setNewItemDesc,
    openAddItem,
    cancelAddItem,
    createItemFor,
    createItem: createItemDirect,

    editingItemId,
    editingItemLabel,
    editingItemDesc,
    setEditingItemLabel,
    setEditingItemDesc,
    startEditItem,
    cancelEditItem,
    saveEditItem,
    deleteItem: deleteItemFn,

    itemsByListId,
    orderedColumns,

    draggingItemId,
    dragOverItemId,
    dragOverColumnId,
    setDraggingItemId,
    setDragOverItemId,
    setDragOverColumnId,

    draggingListId,
    dragOverListId,
    setDraggingListId,
    setDragOverListId,

    applyMinimalDragImage,
    onListDropBefore,
    moveItemByDnD,
  };
}
