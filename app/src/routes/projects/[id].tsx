import { createAsync, revalidate, useAction, useParams } from "@solidjs/router";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { css } from "styled-system/css";
import { Box, Container, HStack, Stack, VStack } from "styled-system/jsx";

import { Button } from "~/components/ui/button";
import * as Card from "~/components/ui/card";
import * as Dialog from "~/components/ui/dialog";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { Textarea } from "~/components/ui/textarea";

import type { Item, List, ProjectBoard } from "~/lib/domain";
import {
  ListIcon,
  PencilIcon,
  Trash2Icon,
  Wand2Icon,
  XIcon,
} from "lucide-solid";
import { aiHelp } from "../../server/ai-help";
import {
  aiReviewBoard,
  createItem,
  createList,
  deleteItem,
  deleteList,
  moveItem,
  reorderLists,
  updateProject,
  updateItem,
  updateList,
} from "~/server/actions";
import { getProjectBoard } from "~/server/queries";

function isLoose(listId: string | null) {
  return listId == null;
}

function listKey(listId: string | null) {
  return listId ?? "LOOSE";
}

export default function ProjectRoute() {
  const params = useParams();
  const projectId = (): string => params.id!;

  const board = createAsync(() => getProjectBoard(projectId()));
  const [boardSnapshot, setBoardSnapshot] = createSignal<ProjectBoard>();

  createEffect(() => {
    if (board.latest) setBoardSnapshot(board.latest);
  });

  const b = () => boardSnapshot();

  const refresh = async () => {
    await revalidate(getProjectBoard.keyFor(projectId()));
  };

  const runCreateList = useAction(createList);
  const runUpdateList = useAction(updateList);
  const runDeleteList = useAction(deleteList);
  const runReorderLists = useAction(reorderLists);

  const runUpdateProject = useAction(updateProject);

  const runCreateItem = useAction(createItem);
  const runUpdateItem = useAction(updateItem);
  const runDeleteItem = useAction(deleteItem);
  const runMoveItem = useAction(moveItem);

  const runAiHelp = useAction(aiHelp);
  const runAiReview = useAction(aiReviewBoard);

  // New list form
  let newListTitleEl!: HTMLInputElement;
  let newListDescEl!: HTMLTextAreaElement;

  const onCreateList = async (e: Event) => {
    e.preventDefault();
    const title = newListTitleEl.value.trim();
    const description = newListDescEl.value.trim();
    if (!title) return;
    await runCreateList({ projectId: projectId(), title, description });
    newListTitleEl.value = "";
    newListDescEl.value = "";
    await refresh();
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

  const canRunAiHelp = () =>
    aiHelpCreateLists() || aiHelpCreateItems() || aiHelpMoveItemsAround();

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
    const cols: {
      key: string;
      listId: string | null;
      title: string;
      description: string;
    }[] = [
      {
        key: "LOOSE",
        listId: null,
        title: "Loose",
        description: "Unassigned items live here.",
      },
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

  return (
    <Container py="10" maxW="6xl">
      <VStack alignItems="stretch" gap="6">
        <HStack justify="space-between" alignItems="start">
          <Stack gap="1">
            <HStack gap="3">
              <Link href="/">← Projects</Link>
            </HStack>
            <Show when={b()}>
              <Show
                when={!isEditingProject()}
                fallback={
                  <VStack
                    alignItems="stretch"
                    gap="2"
                    class={css({ maxW: "680px" })}
                  >
                    <Input
                      value={editingProjectTitle()}
                      onInput={(e) =>
                        setEditingProjectTitle(e.currentTarget.value)
                      }
                    />
                    <Textarea
                      value={editingProjectDesc()}
                      onInput={(e) =>
                        setEditingProjectDesc(e.currentTarget.value)
                      }
                      class={css({ minH: "88px" })}
                      placeholder="Project description"
                    />
                    <HStack justify="flex-start" gap="2">
                      <Button
                        size="sm"
                        variant="solid"
                        onClick={saveEditProject}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditProject}
                      >
                        Cancel
                      </Button>
                    </HStack>
                  </VStack>
                }
              >
                <HStack gap="2" alignItems="center">
                  <Box class={css({ fontSize: "2xl", fontWeight: "semibold" })}>
                    {b()!.project.title}
                  </Box>
                  <IconButton
                    size="sm"
                    variant="plain"
                    aria-label="Edit project"
                    onClick={startEditProject}
                  >
                    <PencilIcon />
                  </IconButton>
                </HStack>
                <Show when={b()!.project.description}>
                  <Box class={css({ color: "fg.muted", maxW: "680px" })}>
                    {b()!.project.description}
                  </Box>
                </Show>
              </Show>
            </Show>
          </Stack>

          <HStack gap="2" flexWrap="wrap" justify="flex-end">
            <Button
              onClick={() => setIsAiHelpOpen(true)}
              disabled={isAiBusy()}
              variant="solid"
            >
              <HStack gap="2" alignItems="center">
                <Wand2Icon />
                <Box>AI Help</Box>
              </HStack>
            </Button>
          </HStack>
        </HStack>

        <Dialog.Root
          open={isAiHelpOpen()}
          onOpenChange={(details: any) => setIsAiHelpOpen(!!details?.open)}
        >
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              class={css({
                maxW: "800px",
                "--dialog-base-margin": "24px",
              })}
            >
              <Dialog.Header>
                <Dialog.Title>AI Help</Dialog.Title>
                <Dialog.Description>
                  Add optional instructions below. If you provide input, it will
                  be treated as the highest priority.
                </Dialog.Description>
              </Dialog.Header>

              <Dialog.CloseTrigger aria-label="Close AI Help">
                <XIcon />
              </Dialog.CloseTrigger>

              <Dialog.Body>
                <VStack alignItems="stretch" gap="3">
                  <Textarea
                    value={aiHelpUserInput()}
                    onInput={(e) => setAiHelpUserInput(e.currentTarget.value)}
                    placeholder="What do you want the AI to do? (e.g. 'Create 4 lists: Backlog, Doing, Blocked, Done. Add 10 items for a mobile MVP. Move anything that looks misplaced.')"
                    class={css({ minH: "220px", resize: "vertical" })}
                  />

                  <VStack alignItems="stretch" gap="2">
                    <Box class={css({ fontWeight: "semibold" })}>Options</Box>
                    <HStack gap="2" flexWrap="wrap">
                      <Button
                        type="button"
                        variant={aiHelpCreateLists() ? "solid" : "outline"}
                        aria-pressed={aiHelpCreateLists()}
                        onClick={() => setAiHelpCreateLists((v) => !v)}
                      >
                        Create lists
                      </Button>
                      <Button
                        type="button"
                        variant={aiHelpCreateItems() ? "solid" : "outline"}
                        aria-pressed={aiHelpCreateItems()}
                        onClick={() => setAiHelpCreateItems((v) => !v)}
                      >
                        Create items
                      </Button>
                      <Button
                        type="button"
                        variant={aiHelpMoveItemsAround() ? "solid" : "outline"}
                        aria-pressed={aiHelpMoveItemsAround()}
                        onClick={() => setAiHelpMoveItemsAround((v) => !v)}
                      >
                        Move items around
                      </Button>
                    </HStack>
                  </VStack>
                </VStack>
              </Dialog.Body>

              <Dialog.Footer>
                <HStack
                  justify="space-between"
                  w="full"
                  gap="2"
                  flexWrap="wrap"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onAiReview}
                    disabled={isAiBusy()}
                  >
                    Review board
                  </Button>
                  <HStack gap="2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAiHelpOpen(false)}
                      disabled={isAiBusy()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="solid"
                      onClick={onRunAiHelp}
                      disabled={isAiBusy() || !canRunAiHelp()}
                    >
                      Apply
                    </Button>
                  </HStack>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Add a list</Card.Title>
            <Card.Description>Lists are columns on the board.</Card.Description>
          </Card.Header>
          <Card.Body>
            <form onSubmit={onCreateList}>
              <VStack alignItems="stretch" gap="3">
                <Input
                  ref={newListTitleEl}
                  placeholder="List title (e.g. Doing)"
                />
                <Textarea
                  ref={newListDescEl}
                  placeholder="Description (optional)"
                  class={css({ minH: "80px" })}
                />
                <HStack justify="flex-end">
                  <Button type="submit" variant="solid">
                    Add list
                  </Button>
                </HStack>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>

        <Show when={reviewCommentary() || reviewQuestions().length > 0}>
          <Card.Root>
            <Card.Header>
              <Card.Title>AI review</Card.Title>
              <Card.Description>
                Commentary + questions about your current board.
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <VStack alignItems="stretch" gap="3">
                <Show when={reviewCommentary()}>
                  <Box class={css({ whiteSpace: "pre-wrap" })}>
                    {reviewCommentary()!}
                  </Box>
                </Show>
                <Show when={reviewQuestions().length > 0}>
                  <VStack alignItems="stretch" gap="2">
                    <For each={reviewQuestions()}>
                      {(q) => (
                        <Box class={css({ color: "fg.muted" })}>- {q}</Box>
                      )}
                    </For>
                  </VStack>
                </Show>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Show>

        <Show
          when={b()}
          fallback={<Box class={css({ color: "fg.muted" })}>Loading…</Box>}
        >
          {/* Responsive board layout: wrap columns to avoid horizontal scrolling */}
          <Box
            class={css({
              display: "grid",
              // Keep everything within the viewport width; wrap into rows instead of scrolling horizontally.
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "4",
              alignItems: "start",
              pb: "2",
              maxW: "full",
              overflowX: "hidden",
            })}
          >
            <For each={orderedColumns()}>
              {(col) => {
                const columnItems = () => itemsByListId().get(col.key) ?? [];
                const listForColumn = () =>
                  lists().find((l) => l.id === col.listId) ?? null;
                const isColumnDragOver = () => dragOverColumnId() === col.key;
                const isListDragOver = () =>
                  !!draggingListId() && dragOverListId() === col.listId;
                const isItemDragOverThisColumn = () =>
                  !!draggingItemId() && isColumnDragOver();

                return (
                  <Card.Root
                    class={css({
                      width: "100%",
                      minW: 0,
                      outlineWidth:
                        isColumnDragOver() || isListDragOver() ? "2px" : "0px",
                      outlineStyle:
                        isColumnDragOver() || isListDragOver()
                          ? "dashed"
                          : "solid",
                      outlineOffset: "2px",
                      outlineColor: "border.emphasized",
                      bg: isListDragOver()
                        ? "gray.surface.bg.hover"
                        : undefined,
                      transitionProperty:
                        "outline-color, outline-offset, background-color",
                      transitionDuration: "150ms",
                    })}
                  >
                    <Card.Header>
                      <HStack
                        justify="space-between"
                        alignItems="start"
                        gap="2"
                      >
                        <Box
                          class={css({
                            fontWeight: "semibold",
                            display: "flex",
                            alignItems: "center",
                            gap: "2",
                            userSelect: "none",
                          })}
                        >
                          <Show when={!isLoose(col.listId)}>
                            <Box
                              as="span"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer?.setData(
                                  "text/plain",
                                  String(col.listId)
                                );
                                applyMinimalDragImage(e);
                                setDraggingListId(col.listId);
                              }}
                              onDragEnd={() => {
                                setDraggingListId(null);
                                setDragOverListId(null);
                              }}
                              onDragOver={(e) => {
                                if (!draggingListId()) return;
                                e.preventDefault();
                                setDragOverListId(col.listId);
                              }}
                              onDragLeave={() => {
                                // Keep this subtle: if you leave a handle, remove the "target" affordance.
                                setDragOverListId(null);
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                setDragOverListId(null);
                                await onListDropBefore(String(col.listId));
                              }}
                              class={css({
                                cursor: "grab",
                                borderWidth: "1px",
                                borderColor:
                                  dragOverListId() === col.listId
                                    ? "border.emphasized"
                                    : "transparent",
                                rounded: "sm",
                                px: "1",
                                color: "fg.muted",
                                fontSize: "sm",
                                bg:
                                  dragOverListId() === col.listId
                                    ? "gray.surface.bg.hover"
                                    : "transparent",
                                transitionProperty:
                                  "border-color, background-color",
                                transitionDuration: "150ms",
                              })}
                              aria-label="Drag to reorder list"
                            >
                              ⋮⋮
                            </Box>
                          </Show>
                          <Box
                            as="span"
                            class={css({
                              color: "fg.muted",
                              display: "inline-flex",
                              alignItems: "center",
                            })}
                          >
                            <ListIcon />
                          </Box>
                          <Box as="span">{col.title}</Box>
                        </Box>

                        <Show when={!isLoose(col.listId)}>
                          <HStack gap="1">
                            <IconButton
                              size="sm"
                              variant="plain"
                              aria-label="Edit list"
                              onClick={() => {
                                const list = listForColumn();
                                if (list) startEditList(list);
                              }}
                            >
                              <PencilIcon />
                            </IconButton>
                            <IconButton
                              size="sm"
                              variant="plain"
                              aria-label="Delete list"
                              onClick={async () => {
                                if (!col.listId) return;
                                await runDeleteList({
                                  projectId: projectId(),
                                  listId: col.listId,
                                });
                                await refresh();
                              }}
                            >
                              <Trash2Icon />
                            </IconButton>
                          </HStack>
                        </Show>
                      </HStack>

                      <Show when={editingListId() === col.listId}>
                        <VStack alignItems="stretch" gap="2" mt="3">
                          <Input
                            value={editingListTitle()}
                            onInput={(e) =>
                              setEditingListTitle(e.currentTarget.value)
                            }
                          />
                          <Textarea
                            value={editingListDesc()}
                            onInput={(e) =>
                              setEditingListDesc(e.currentTarget.value)
                            }
                            class={css({ minH: "72px" })}
                          />
                          <HStack justify="flex-end" gap="2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditList}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="solid"
                              onClick={saveEditList}
                            >
                              Save
                            </Button>
                          </HStack>
                        </VStack>
                      </Show>
                    </Card.Header>

                    <Card.Body>
                      <VStack
                        alignItems="stretch"
                        gap="2"
                        class={css({
                          rounded: "md",
                          p: "2",
                          bg: isItemDragOverThisColumn()
                            ? "gray.surface.bg.hover"
                            : "transparent",
                          outlineWidth: isItemDragOverThisColumn()
                            ? "2px"
                            : "0px",
                          outlineStyle: isItemDragOverThisColumn()
                            ? "dashed"
                            : "solid",
                          outlineOffset: "2px",
                          outlineColor: "border.emphasized",
                          transitionProperty:
                            "background-color, outline-color, outline-offset",
                          transitionDuration: "150ms",
                        })}
                        onDragOver={(e) => {
                          if (!draggingItemId()) return;
                          e.preventDefault();
                          setDragOverColumnId(col.key);
                          setDragOverItemId(null);
                        }}
                        onDrop={async (e) => {
                          // Allow dropping anywhere in the column body to move to end.
                          e.preventDefault();
                          const dragged = draggingItemId();
                          if (!dragged) return;
                          const destListId = col.listId;
                          const destItems = columnItems().filter(
                            (x) => x.id !== dragged
                          );
                          setDragOverColumnId(null);
                          await moveItemByDnD(
                            dragged,
                            destListId,
                            destItems.length
                          );
                        }}
                      >
                        <Show
                          when={columnItems().length > 0}
                          fallback={
                            <Box
                              class={css({
                                color: "fg.muted",
                                fontSize: "sm",
                              })}
                            >
                              No items.
                            </Box>
                          }
                        >
                          <For each={columnItems()}>
                            {(it) => (
                              <Box
                                class={css({
                                  position: "relative",
                                  borderWidth: "1px",
                                  borderColor: "border",
                                  rounded: "md",
                                  px: "3",
                                  py: "2",
                                  outlineWidth:
                                    dragOverItemId() === it.id ? "2px" : "0px",
                                  outlineColor: "border.emphasized",
                                  outlineOffset:
                                    dragOverItemId() === it.id ? "2px" : "0px",
                                  bg:
                                    dragOverItemId() === it.id
                                      ? "gray.surface.bg.hover"
                                      : "transparent",
                                  transitionProperty:
                                    "outline-color, outline-offset, background-color",
                                  transitionDuration: "150ms",
                                  opacity:
                                    draggingItemId() === it.id ? 0.35 : 1,
                                })}
                                onDragOver={(e) => {
                                  if (!draggingItemId()) return;
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDragOverItemId(it.id);
                                  setDragOverColumnId(null);
                                }}
                                onDrop={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const dragged = draggingItemId();
                                  if (!dragged) return;

                                  const destListId = col.listId;
                                  const destItems = columnItems().filter(
                                    (x) => x.id !== dragged
                                  );
                                  const targetIdx = destItems.findIndex(
                                    (x) => x.id === it.id
                                  );
                                  if (targetIdx < 0) return;

                                  setDragOverItemId(null);
                                  await moveItemByDnD(
                                    dragged,
                                    destListId,
                                    targetIdx
                                  );
                                }}
                              >
                                <Show
                                  when={
                                    dragOverItemId() === it.id &&
                                    !!draggingItemId() &&
                                    draggingItemId() !== it.id
                                  }
                                >
                                  <Box
                                    class={css({
                                      position: "absolute",
                                      left: "2",
                                      right: "2",
                                      top: "-1",
                                      height: "2px",
                                      bg: "border.emphasized",
                                      rounded: "full",
                                    })}
                                  />
                                </Show>
                                <HStack
                                  justify="space-between"
                                  alignItems="start"
                                  gap="2"
                                >
                                  <HStack gap="2" alignItems="center">
                                    <Box
                                      as="span"
                                      draggable
                                      onDragStart={(e) => {
                                        e.dataTransfer?.setData(
                                          "text/plain",
                                          it.id
                                        );
                                        applyMinimalDragImage(e);
                                        setDraggingItemId(it.id);
                                      }}
                                      onDragEnd={() => {
                                        setDraggingItemId(null);
                                        setDragOverItemId(null);
                                        setDragOverColumnId(null);
                                      }}
                                      class={css({
                                        cursor: "grab",
                                        borderWidth: "1px",
                                        borderColor: "border",
                                        rounded: "sm",
                                        px: "1",
                                        color: "fg.muted",
                                        fontSize: "sm",
                                        userSelect: "none",
                                      })}
                                      aria-label="Drag to move item"
                                    >
                                      ⋮⋮
                                    </Box>
                                    <Box class={css({ fontWeight: "medium" })}>
                                      {it.label}
                                    </Box>
                                  </HStack>

                                  <HStack gap="1">
                                    <IconButton
                                      size="sm"
                                      variant="plain"
                                      aria-label="Edit item"
                                      onClick={() => startEditItem(it)}
                                    >
                                      <PencilIcon />
                                    </IconButton>
                                    <IconButton
                                      size="sm"
                                      variant="plain"
                                      aria-label="Delete item"
                                      onClick={async () => {
                                        await runDeleteItem({
                                          projectId: projectId(),
                                          itemId: it.id,
                                        });
                                        await refresh();
                                      }}
                                    >
                                      <Trash2Icon />
                                    </IconButton>
                                  </HStack>
                                </HStack>

                                <Show when={editingItemId() === it.id}>
                                  <VStack alignItems="stretch" gap="2" mt="3">
                                    <Input
                                      value={editingItemLabel()}
                                      onInput={(e) =>
                                        setEditingItemLabel(
                                          e.currentTarget.value
                                        )
                                      }
                                    />
                                    <Textarea
                                      value={editingItemDesc()}
                                      onInput={(e) =>
                                        setEditingItemDesc(
                                          e.currentTarget.value
                                        )
                                      }
                                      class={css({ minH: "72px" })}
                                    />
                                    <HStack justify="flex-end" gap="2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelEditItem}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="solid"
                                        onClick={saveEditItem}
                                      >
                                        Save
                                      </Button>
                                    </HStack>
                                  </VStack>
                                </Show>
                              </Box>
                            )}
                          </For>
                        </Show>

                        <Box pt="2">
                          <Show
                            when={addingItemListId() === col.listId}
                            fallback={
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAddItem(col.listId)}
                              >
                                Add item
                              </Button>
                            }
                          >
                            <VStack alignItems="stretch" gap="2">
                              <Input
                                placeholder="Item label"
                                value={newItemLabel()}
                                onInput={(e) =>
                                  setNewItemLabel(e.currentTarget.value)
                                }
                              />
                              <Textarea
                                placeholder="Description (optional)"
                                value={newItemDesc()}
                                onInput={(e) =>
                                  setNewItemDesc(e.currentTarget.value)
                                }
                                class={css({ minH: "72px" })}
                              />
                              <HStack justify="flex-end" gap="2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelAddItem}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  variant="solid"
                                  onClick={createItemFor}
                                >
                                  Add
                                </Button>
                              </HStack>
                            </VStack>
                          </Show>
                        </Box>
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                );
              }}
            </For>
          </Box>
        </Show>
      </VStack>
    </Container>
  );
}
