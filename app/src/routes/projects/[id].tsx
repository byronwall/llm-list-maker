import { createAsync, revalidate, useAction, useParams } from "@solidjs/router";
import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { css } from "styled-system/css";
import { Box, Container, HStack, Stack, VStack } from "styled-system/jsx";

import { Button } from "~/components/ui/button";
import * as Card from "~/components/ui/card";
import * as HoverCard from "~/components/ui/hover-card";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { Textarea } from "~/components/ui/textarea";

import type { Item, List, ProjectBoard } from "~/lib/domain";
import {
  aiReorganizeBoard,
  aiReviewBoard,
  aiSuggestItems,
  aiSuggestLists,
  createItem,
  createList,
  deleteItem,
  deleteList,
  moveItem,
  reorderLists,
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

  const runCreateItem = useAction(createItem);
  const runUpdateItem = useAction(updateItem);
  const runDeleteItem = useAction(deleteItem);
  const runMoveItem = useAction(moveItem);

  const runAiSuggestLists = useAction(aiSuggestLists);
  const runAiSuggestItems = useAction(aiSuggestItems);
  const runAiReorg = useAction(aiReorganizeBoard);
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
      patch: { title: editingListTitle().trim(), description: editingListDesc().trim() },
    });
    cancelEditList();
    await refresh();
  };

  // New item form (shared across columns)
  const [addingItemListId, setAddingItemListId] = createSignal<string | null>(null);
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
    await runCreateItem({ projectId: projectId(), listId: addingItemListId(), label, description });
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
      patch: { label: editingItemLabel().trim(), description: editingItemDesc().trim() },
    });
    cancelEditItem();
    await refresh();
  };

  // Review output
  const [reviewCommentary, setReviewCommentary] = createSignal<string | null>(null);
  const [reviewQuestions, setReviewQuestions] = createSignal<string[]>([]);

  const [isAiBusy, setIsAiBusy] = createSignal(false);

  const onAiSuggestLists = async () => {
    setIsAiBusy(true);
    try {
      await runAiSuggestLists({ projectId: projectId() });
      await refresh();
    } finally {
      setIsAiBusy(false);
    }
  };

  const onAiSuggestItems = async () => {
    setIsAiBusy(true);
    try {
      await runAiSuggestItems({ projectId: projectId() });
      await refresh();
    } finally {
      setIsAiBusy(false);
    }
  };

  const onAiReorg = async () => {
    setIsAiBusy(true);
    try {
      await runAiReorg({ projectId: projectId() });
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
    } finally {
      setIsAiBusy(false);
    }
  };

  const lists = () => b()?.lists ?? [];
  const items = () => b()?.items ?? [];

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
    const cols: { key: string; listId: string | null; title: string; description: string }[] = [
      { key: "LOOSE", listId: null, title: "Loose", description: "Unassigned items live here." },
      ...lists().map((l) => ({ key: l.id, listId: l.id, title: l.title, description: l.description })),
    ];
    return cols;
  });

  // Drag/drop state (HTML5 DnD)
  const [draggingItemId, setDraggingItemId] = createSignal<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = createSignal<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = createSignal<string | null>(null);

  const [draggingListId, setDraggingListId] = createSignal<string | null>(null);
  const [dragOverListId, setDragOverListId] = createSignal<string | null>(null);

  const moveItemByDnD = async (itemId: string, toListId: string | null, toIndex: number) => {
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

  const moveItemTo = async (itemId: string, toListId: string | null) => {
    const destItems = itemsByListId().get(listKey(toListId)) ?? [];
    await runMoveItem({ projectId: projectId(), itemId, toListId, toIndex: destItems.length });
    await refresh();
  };

  const moveItemWithinColumn = async (item: Item, delta: -1 | 1) => {
    const colKey = listKey(item.listId);
    const colItems = (itemsByListId().get(colKey) ?? []).slice().sort((a, b) => a.order - b.order);
    const idx = colItems.findIndex((i) => i.id === item.id);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= colItems.length) return;
    await moveItemByDnD(item.id, item.listId, next);
  };

  return (
    <Container py="10" maxW="6xl">
      <VStack alignItems="stretch" gap="6">
        <HStack justify="space-between" align="start">
          <Stack gap="1">
            <HStack gap="3">
              <Link href="/">← Projects</Link>
            </HStack>
            <Show when={b()}>
              <Box class={css({ fontSize: "2xl", fontWeight: "semibold" })}>
                {b()!.project.title}
              </Box>
              <Show when={b()!.project.description}>
                <Box class={css({ color: "fg.muted" })}>
                  {b()!.project.description}
                </Box>
              </Show>
            </Show>
          </Stack>

          <HStack gap="2" flexWrap="wrap" justify="flex-end">
            <Button onClick={onAiSuggestLists} disabled={isAiBusy()} variant="outline">
              Suggest lists
            </Button>
            <Button onClick={onAiSuggestItems} disabled={isAiBusy()} variant="outline">
              Suggest items
            </Button>
            <Button onClick={onAiReorg} disabled={isAiBusy()} variant="outline">
              Reorganize board
            </Button>
            <Button onClick={onAiReview} disabled={isAiBusy()} variant="solid">
              Review board
            </Button>
          </HStack>
        </HStack>

        <Card.Root>
          <Card.Header>
            <Card.Title>Add a list</Card.Title>
            <Card.Description>Lists are columns on the board.</Card.Description>
          </Card.Header>
          <Card.Body>
            <form onSubmit={onCreateList}>
              <VStack alignItems="stretch" gap="3">
                <Input ref={newListTitleEl} placeholder="List title (e.g. Doing)" />
                <Textarea ref={newListDescEl} placeholder="Description (shown on hover)" class={css({ minH: "80px" })} />
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
              <Card.Description>Commentary + questions about your current board.</Card.Description>
            </Card.Header>
            <Card.Body>
              <VStack alignItems="stretch" gap="3">
                <Show when={reviewCommentary()}>
                  <Box class={css({ whiteSpace: "pre-wrap" })}>{reviewCommentary()!}</Box>
                </Show>
                <Show when={reviewQuestions().length > 0}>
                  <VStack alignItems="stretch" gap="2">
                    <For each={reviewQuestions()}>
                      {(q) => <Box class={css({ color: "fg.muted" })}>- {q}</Box>}
                    </For>
                  </VStack>
                </Show>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Show>

        <Show when={b()} fallback={<Box class={css({ color: "fg.muted" })}>Loading…</Box>}>
          <Box class={css({ overflowX: "auto" })}>
            <HStack align="start" gap="4" class={css({ minW: "max-content", pb: "2" })}>
              <For each={orderedColumns()}>
                {(col) => {
                  const columnItems = () => itemsByListId().get(col.key) ?? [];
                  const listForColumn = () => lists().find((l) => l.id === col.listId) ?? null;

                  return (
                    <Card.Root class={css({ width: "360px" })}>
                      <Card.Header>
                        <HStack justify="space-between" align="start" gap="2">
                          <HoverCard.Root>
                            <HoverCard.Trigger>
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
                                      e.dataTransfer?.setData("text/plain", String(col.listId));
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
                                    onDrop={async (e) => {
                                      e.preventDefault();
                                      setDragOverListId(null);
                                      await onListDropBefore(String(col.listId));
                                    }}
                                    class={css({
                                      cursor: "grab",
                                      borderWidth: "1px",
                                      borderColor: dragOverListId() === col.listId ? "border.emphasized" : "transparent",
                                      rounded: "sm",
                                      px: "1",
                                      color: "fg.muted",
                                      fontSize: "sm",
                                    })}
                                    aria-label="Drag to reorder list"
                                    title="Drag to reorder list"
                                  >
                                    ⋮⋮
                                  </Box>
                                </Show>
                                <Box as="span">{col.title}</Box>
                              </Box>
                            </HoverCard.Trigger>
                            <HoverCard.Positioner>
                              <HoverCard.Content>
                                <Box class={css({ fontSize: "sm", whiteSpace: "pre-wrap" })}>
                                  {col.description || "(no description)"}
                                </Box>
                              </HoverCard.Content>
                            </HoverCard.Positioner>
                          </HoverCard.Root>

                          <Show when={!isLoose(col.listId)}>
                            <HStack gap="1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const list = listForColumn();
                                  if (list) startEditList(list);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (!col.listId) return;
                                  await runDeleteList({ projectId: projectId(), listId: col.listId });
                                  await refresh();
                                }}
                              >
                                Delete
                              </Button>
                            </HStack>
                          </Show>
                        </HStack>

                        <Show when={editingListId() === col.listId}>
                          <VStack alignItems="stretch" gap="2" mt="3">
                            <Input value={editingListTitle()} onInput={(e) => setEditingListTitle(e.currentTarget.value)} />
                            <Textarea
                              value={editingListDesc()}
                              onInput={(e) => setEditingListDesc(e.currentTarget.value)}
                              class={css({ minH: "72px" })}
                            />
                            <HStack justify="flex-end" gap="2">
                              <Button size="sm" variant="outline" onClick={cancelEditList}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="solid" onClick={saveEditList}>
                                Save
                              </Button>
                            </HStack>
                          </VStack>
                        </Show>
                      </Card.Header>

                      <Card.Body>
                        <VStack alignItems="stretch" gap="2">
                          <Show
                            when={columnItems().length > 0}
                            fallback={<Box class={css({ color: "fg.muted", fontSize: "sm" })}>No items.</Box>}
                          >
                            <For each={columnItems()}>
                              {(it) => (
                                <Box
                                  class={css({
                                    borderWidth: "1px",
                                    borderColor: "border",
                                    rounded: "md",
                                    px: "3",
                                    py: "2",
                                    outlineWidth: dragOverItemId() === it.id ? "2px" : "0px",
                                    outlineColor: "border.emphasized",
                                  })}
                                  onDragOver={(e) => {
                                    if (!draggingItemId()) return;
                                    e.preventDefault();
                                    setDragOverItemId(it.id);
                                    setDragOverColumnId(null);
                                  }}
                                  onDrop={async (e) => {
                                    e.preventDefault();
                                    const dragged = draggingItemId();
                                    if (!dragged) return;

                                    const destListId = col.listId;
                                    const destItems = columnItems().filter((x) => x.id !== dragged);
                                    const targetIdx = destItems.findIndex((x) => x.id === it.id);
                                    if (targetIdx < 0) return;

                                    setDragOverItemId(null);
                                    await moveItemByDnD(dragged, destListId, targetIdx);
                                  }}
                                >
                                  <HStack justify="space-between" align="start" gap="2">
                                    <HoverCard.Root>
                                      <HoverCard.Trigger>
                                        <HStack gap="2" align="center">
                                          <Box
                                            as="span"
                                            draggable
                                            onDragStart={(e) => {
                                              e.dataTransfer?.setData("text/plain", it.id);
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
                                            title="Drag to move item"
                                          >
                                            ⋮⋮
                                          </Box>
                                          <Box class={css({ fontWeight: "medium" })}>{it.label}</Box>
                                        </HStack>
                                      </HoverCard.Trigger>
                                      <HoverCard.Positioner>
                                        <HoverCard.Content>
                                          <Box class={css({ fontSize: "sm", whiteSpace: "pre-wrap" })}>
                                            {it.description || "(no description)"}
                                          </Box>
                                        </HoverCard.Content>
                                      </HoverCard.Positioner>
                                    </HoverCard.Root>

                                    <HStack gap="1">
                                      <Button size="sm" variant="ghost" onClick={() => startEditItem(it)}>
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          await runDeleteItem({ projectId: projectId(), itemId: it.id });
                                          await refresh();
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </HStack>
                                  </HStack>

                                  <Show when={editingItemId() === it.id}>
                                    <VStack alignItems="stretch" gap="2" mt="3">
                                      <Input value={editingItemLabel()} onInput={(e) => setEditingItemLabel(e.currentTarget.value)} />
                                      <Textarea
                                        value={editingItemDesc()}
                                        onInput={(e) => setEditingItemDesc(e.currentTarget.value)}
                                        class={css({ minH: "72px" })}
                                      />
                                      <HStack justify="flex-end" gap="2">
                                        <Button size="sm" variant="outline" onClick={cancelEditItem}>
                                          Cancel
                                        </Button>
                                        <Button size="sm" variant="solid" onClick={saveEditItem}>
                                          Save
                                        </Button>
                                      </HStack>
                                    </VStack>
                                  </Show>

                                  <HStack gap="2" mt="2" flexWrap="wrap">
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => moveItemWithinColumn(it, -1)}
                                    >
                                      Up
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() => moveItemWithinColumn(it, 1)}
                                    >
                                      Down
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      disabled={isLoose(col.listId)}
                                      onClick={() => moveItemTo(it.id, null)}
                                    >
                                      To Loose
                                    </Button>
                                    <For each={lists()}>
                                      {(l) => (
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          disabled={col.listId === l.id}
                                          onClick={() => moveItemTo(it.id, l.id)}
                                        >
                                          To {l.title}
                                        </Button>
                                      )}
                                    </For>
                                  </HStack>
                                </Box>
                              )}
                            </For>
                          </Show>

                          <Box
                            class={css({
                              borderWidth: "1px",
                              borderStyle: "dashed",
                              borderColor: dragOverColumnId() === col.key ? "border.emphasized" : "border",
                              rounded: "md",
                              p: "2",
                              color: "fg.muted",
                              fontSize: "sm",
                            })}
                            onDragOver={(e) => {
                              if (!draggingItemId()) return;
                              e.preventDefault();
                              setDragOverColumnId(col.key);
                              setDragOverItemId(null);
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              const dragged = draggingItemId();
                              if (!dragged) return;
                              const destListId = col.listId;
                              const destItems = columnItems().filter((x) => x.id !== dragged);
                              setDragOverColumnId(null);
                              await moveItemByDnD(dragged, destListId, destItems.length);
                            }}
                          >
                            Drop here to add to end
                          </Box>

                          <Box pt="2">
                            <Show
                              when={addingItemListId() === col.listId}
                              fallback={
                                <Button size="sm" variant="outline" onClick={() => openAddItem(col.listId)}>
                                  Add item
                                </Button>
                              }
                            >
                              <VStack alignItems="stretch" gap="2">
                                <Input
                                  placeholder="Item label"
                                  value={newItemLabel()}
                                  onInput={(e) => setNewItemLabel(e.currentTarget.value)}
                                />
                                <Textarea
                                  placeholder="Description (shown on hover)"
                                  value={newItemDesc()}
                                  onInput={(e) => setNewItemDesc(e.currentTarget.value)}
                                  class={css({ minH: "72px" })}
                                />
                                <HStack justify="flex-end" gap="2">
                                  <Button size="sm" variant="outline" onClick={cancelAddItem}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" variant="solid" onClick={createItemFor}>
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
            </HStack>
          </Box>
        </Show>
      </VStack>
    </Container>
  );
}


