import { createContext, useContext, type Accessor, type JSX } from "solid-js";
import type { Item, List, ProjectBoard } from "~/lib/domain";

export type ProjectBoardController = {
  projectId: Accessor<string>;
  board: Accessor<ProjectBoard | undefined>;
  refresh: () => Promise<void>;

  // Project lifecycle
  deleteProject: () => Promise<void>;

  // Project editing
  isEditingProject: Accessor<boolean>;
  editingProjectTitle: Accessor<string>;
  editingProjectDesc: Accessor<string>;
  setEditingProjectTitle: (v: string) => void;
  setEditingProjectDesc: (v: string) => void;
  startEditProject: () => void;
  cancelEditProject: () => void;
  saveEditProject: () => Promise<void>;

  // AI
  isAiBusy: Accessor<boolean>;
  setIsAiHelpOpen: (v: boolean) => void;
  isAiHelpOpen: Accessor<boolean>;
  aiHelpUserInput: Accessor<string>;
  setAiHelpUserInput: (v: string) => void;
  aiHelpCreateLists: Accessor<boolean>;
  setAiHelpCreateLists: (v: boolean | ((prev: boolean) => boolean)) => void;
  aiHelpCreateItems: Accessor<boolean>;
  setAiHelpCreateItems: (v: boolean | ((prev: boolean) => boolean)) => void;
  aiHelpMoveItemsAround: Accessor<boolean>;
  setAiHelpMoveItemsAround: (v: boolean | ((prev: boolean) => boolean)) => void;
  aiHelpCleanupContent: Accessor<boolean>;
  setAiHelpCleanupContent: (v: boolean | ((prev: boolean) => boolean)) => void;
  canRunAiHelp: Accessor<boolean>;
  onRunAiHelp: () => Promise<void>;
  onAiReview: () => Promise<void>;
  reviewCommentary: Accessor<string | null>;
  reviewQuestions: Accessor<string[]>;

  // Lists/items
  lists: Accessor<List[]>;
  items: Accessor<Item[]>;
  createList: (args: { title: string; description: string }) => Promise<void>;
  duplicateList: (
    listId: string
  ) => Promise<{ list: List; duplicatedItemCount: number } | undefined>;
  deleteList: (listId: string) => Promise<void>;

  // List editing
  editingListId: Accessor<string | null>;
  editingListTitle: Accessor<string>;
  editingListDesc: Accessor<string>;
  setEditingListTitle: (v: string) => void;
  setEditingListDesc: (v: string) => void;
  startEditList: (list: List) => void;
  cancelEditList: () => void;
  saveEditList: () => Promise<void>;

  // New item form
  addingItemListId: Accessor<string | null>;
  newItemLabel: Accessor<string>;
  newItemDesc: Accessor<string>;
  setNewItemLabel: (v: string) => void;
  setNewItemDesc: (v: string) => void;
  openAddItem: (listId: string | null) => void;
  cancelAddItem: () => void;
  createItemFor: () => Promise<void>;
  createItem: (args: {
    listId: string | null;
    label: string;
    description?: string;
  }) => Promise<void>;

  // Item editing
  editingItemId: Accessor<string | null>;
  editingItemLabel: Accessor<string>;
  editingItemDesc: Accessor<string>;
  setEditingItemLabel: (v: string) => void;
  setEditingItemDesc: (v: string) => void;
  startEditItem: (item: Item) => void;
  cancelEditItem: () => void;
  saveEditItem: () => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;

  // Derived board structure
  itemsByListId: Accessor<Map<string, Item[]>>;
  orderedColumns: Accessor<
    { key: string; listId: string | null; title: string; description: string }[]
  >;

  // Drag/drop
  draggingItemId: Accessor<string | null>;
  dragOverItemId: Accessor<string | null>;
  dragOverColumnId: Accessor<string | null>;
  setDraggingItemId: (v: string | null) => void;
  setDragOverItemId: (v: string | null) => void;
  setDragOverColumnId: (v: string | null) => void;

  draggingListId: Accessor<string | null>;
  dragOverListId: Accessor<string | null>;
  setDraggingListId: (v: string | null) => void;
  setDragOverListId: (v: string | null) => void;

  applyMinimalDragImage: (e: DragEvent) => void;
  onListDropBefore: (targetListId: string) => Promise<void>;
  moveItemByDnD: (
    itemId: string,
    toListId: string | null,
    toIndex: number
  ) => Promise<void>;
};

const Ctx = createContext<ProjectBoardController>();

export function ProjectBoardProvider(props: {
  value: ProjectBoardController;
  children: JSX.Element;
}) {
  return <Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>;
}

export function useProjectBoard() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useProjectBoard must be used within ProjectBoardProvider");
  return ctx;
}
