import { For, Show, createMemo, createSignal } from "solid-js";
import { css } from "styled-system/css";
import { Box, HStack, Stack, VStack } from "styled-system/jsx";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  Trash2Icon,
  XIcon,
} from "lucide-solid";

import * as Table from "~/components/ui/table";
import * as Checkbox from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { useProjectBoard } from "./project-board-context";
import type {
  createProjectBoardUrlState,
  ProjectBoardListSort,
  SortDir,
} from "./project-board-url-state";
import { createListIndexEntries } from "./project-board-list-model";
import { ProjectBoardListMenu } from "./ProjectBoardListMenu";
import { ProjectBoardQuickAddItem } from "./ProjectBoardQuickAddItem";
import { ProjectBoardItemRow } from "./ProjectBoardItemRow";
import { ProjectBoardAddItem } from "./ProjectBoardAddItem";
import {
  downloadTextFile,
  sanitizeFilename,
  singleListToMarkdown,
} from "~/lib/projects/export";

type UrlState = ReturnType<typeof createProjectBoardUrlState>;

export function ProjectBoardTableView(props: { when: boolean; url: UrlState }) {
  const pb = useProjectBoard();
  const { entries } = createListIndexEntries({
    pb,
    q: () => props.url.q(),
    sort: () => props.url.sort(),
    dir: () => props.url.dir(),
  });

  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const selectedCount = createMemo(() => selected().size);

  const visibleSelectableKeys = createMemo(() =>
    entries()
      .filter((e) => e.key !== "LOOSE")
      .map((e) => e.key)
  );

  const allChecked = createMemo(() => {
    const keys = visibleSelectableKeys();
    if (keys.length === 0) return false;
    return keys.every((k) => selected().has(k));
  });

  const isIndeterminate = createMemo(() => {
    const keys = visibleSelectableKeys();
    if (keys.length === 0) return false;
    const count = keys.filter((k) => selected().has(k)).length;
    return count > 0 && count < keys.length;
  });

  const toggleAllVisible = () => {
    const keys = visibleSelectableKeys();
    const next = new Set(selected());
    if (allChecked()) {
      for (const k of keys) next.delete(k);
    } else {
      for (const k of keys) next.add(k);
    }
    setSelected(next);
  };

  const toggleOne = (key: string) => {
    const next = new Set(selected());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const setSortFromHeader = (sort: ProjectBoardListSort) => {
    if (props.url.sort() !== sort) {
      props.url.setSort(sort);
      props.url.setDir(sort === "alpha" ? "asc" : "desc");
      return;
    }
    props.url.setDir(props.url.dir() === "asc" ? "desc" : "asc");
  };

  const sortLabel = (col: ProjectBoardListSort) => {
    const is = props.url.sort() === col;
    const dir: SortDir = props.url.dir();
    return is ? (dir === "asc" ? " ▲" : " ▼") : "";
  };

  const [isBulkDeleting, setIsBulkDeleting] = createSignal(false);

  const exportSelected = () => {
    const board = pb.board();
    if (!board) return;
    const keys = Array.from(selected());
    if (keys.length === 0) return;

    const byId = new Map(pb.lists().map((l) => [l.id, l] as const));
    const itemsByKey = pb.itemsByListId();

    const chunks: string[] = [];
    for (const k of keys) {
      const list = byId.get(k);
      if (!list) continue;
      chunks.push(
        singleListToMarkdown({
          title: list.title,
          description: list.description,
          items: itemsByKey.get(k) ?? [],
        })
      );
      chunks.push("\n---\n");
    }

    const safeProject = sanitizeFilename(
      board.project.title || board.project.id
    );
    downloadTextFile({
      filename: `${safeProject}-lists.md`,
      text: chunks.join("").trimEnd() + "\n",
      mime: "text/markdown;charset=utf-8",
    });
  };

  const deleteSelected = async () => {
    const keys = Array.from(selected());
    if (keys.length === 0) return;
    if (
      !confirm(
        `Delete ${keys.length} selected list(s)? Items will move to Loose.`
      )
    )
      return;
    setIsBulkDeleting(true);
    try {
      for (const k of keys) {
        await pb.deleteList(k);
      }
      setSelected(new Set<string>());
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <Show when={props.when}>
      <Show
        when={pb.board()}
        fallback={<Box class={css({ color: "fg.muted" })}>Loading…</Box>}
      >
        <Show when={selectedCount() > 0}>
          <HStack
            justify="space-between"
            gap="3"
            flexWrap="wrap"
            class={css({
              borderWidth: "1px",
              borderColor: "border",
              rounded: "lg",
              bg: "bg.muted",
              px: "3",
              py: "2",
            })}
          >
            <Box class={css({ fontSize: "sm" })}>
              <Box as="span" class={css({ fontWeight: "semibold" })}>
                {selectedCount()}
              </Box>{" "}
              selected
            </Box>
            <HStack gap="2" flexWrap="wrap" justify="flex-end">
              <Button size="sm" variant="outline" onClick={exportSelected}>
                <HStack gap="2" alignItems="center">
                  <DownloadIcon />
                  <Box>Export</Box>
                </HStack>
              </Button>
              <Button
                size="sm"
                variant="outline"
                colorPalette="red"
                loading={isBulkDeleting()}
                loadingText="Deleting…"
                onClick={() => void deleteSelected()}
              >
                <HStack gap="2" alignItems="center">
                  <Trash2Icon />
                  <Box>Delete</Box>
                </HStack>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(new Set<string>())}
              >
                <HStack gap="2" alignItems="center">
                  <XIcon />
                  <Box>Clear</Box>
                </HStack>
              </Button>
            </HStack>
          </HStack>
        </Show>

        <Box
          class={css({
            borderWidth: "1px",
            borderColor: "border",
            rounded: "xl",
            overflow: "hidden",
            bg: "bg.default",
          })}
        >
          <Box
            class={css({
              // Let the table use most of the viewport height (on its own),
              // while still keeping the table body as the scroll container.
              maxH: "min(90vh, 90dvh)",
              overflow: "auto",
            })}
          >
            <Table.Root>
              <Table.Head class={css({ bg: "bg.default" })}>
                <Table.Row>
                  <Table.Header
                    class={css({
                      position: "sticky",
                      top: 0,
                      bg: "bg.default",
                      zIndex: "sticky",
                      width: "40px",
                    })}
                  >
                    <Checkbox.Root
                      checked={
                        (isIndeterminate()
                          ? "indeterminate"
                          : allChecked()) as Checkbox.CheckedState
                      }
                      onCheckedChange={() => toggleAllVisible()}
                    >
                      <Checkbox.Control aria-label="Select all visible lists">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.HiddenInput />
                    </Checkbox.Root>
                  </Table.Header>
                  <Table.Header
                    class={css({
                      position: "sticky",
                      top: 0,
                      bg: "bg.default",
                      zIndex: "sticky",
                      width: "44px",
                    })}
                  />
                  <Table.Header
                    class={css({
                      position: "sticky",
                      top: 0,
                      bg: "bg.default",
                      zIndex: "sticky",
                    })}
                  >
                    <Button
                      size="sm"
                      variant="plain"
                      onClick={() => setSortFromHeader("alpha")}
                    >
                      Name{sortLabel("alpha")}
                    </Button>
                  </Table.Header>
                  <Table.Header
                    class={css({
                      position: "sticky",
                      top: 0,
                      bg: "bg.default",
                      zIndex: "sticky",
                      width: "140px",
                    })}
                  >
                    <Button
                      size="sm"
                      variant="plain"
                      onClick={() => setSortFromHeader("items")}
                    >
                      Items{sortLabel("items")}
                    </Button>
                  </Table.Header>
                  <Table.Header
                    class={css({
                      position: "sticky",
                      top: 0,
                      bg: "bg.default",
                      zIndex: "sticky",
                      width: "220px",
                    })}
                  >
                    <Button
                      size="sm"
                      variant="plain"
                      onClick={() => setSortFromHeader("updated")}
                    >
                      Updated{sortLabel("updated")}
                    </Button>
                  </Table.Header>
                  <Table.Header
                    class={css({
                      position: "sticky",
                      top: 0,
                      bg: "bg.default",
                      zIndex: "sticky",
                      width: "72px",
                    })}
                  >
                    <Box class={css({ fontSize: "sm", color: "fg.muted" })}>
                      Actions
                    </Box>
                  </Table.Header>
                </Table.Row>
              </Table.Head>

              <Table.Body>
                <For each={entries()}>
                  {(e) => {
                    const isExpanded = () => props.url.expanded().has(e.key);
                    const items = () => pb.itemsByListId().get(e.key) ?? [];
                    const isLoose = () => e.key === "LOOSE";
                    const isEditing = () =>
                      pb.editingListId() === e.listId && e.listId != null;

                    const startRename = () => {
                      if (!e.list) return;
                      pb.startEditList(e.list);
                    };

                    const onRenameKeyDown = (ev: KeyboardEvent) => {
                      if (ev.key === "Escape") {
                        ev.preventDefault();
                        pb.cancelEditList();
                      } else if (ev.key === "Enter") {
                        ev.preventDefault();
                        void pb.saveEditList();
                      }
                    };

                    return (
                      <>
                        <Table.Row>
                          <Table.Cell>
                            <Checkbox.Root
                              disabled={isLoose()}
                              checked={selected().has(e.key)}
                              onCheckedChange={() => toggleOne(e.key)}
                            >
                              <Checkbox.Control
                                aria-label={`Select ${e.title || "list"}`}
                              >
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                              <Checkbox.HiddenInput />
                            </Checkbox.Root>
                          </Table.Cell>
                          <Table.Cell>
                            <IconButton
                              size="xs"
                              variant="plain"
                              aria-label={
                                isExpanded() ? "Collapse row" : "Expand row"
                              }
                              onClick={() => props.url.toggleExpanded(e.key)}
                            >
                              {isExpanded() ? (
                                <ChevronDownIcon />
                              ) : (
                                <ChevronRightIcon />
                              )}
                            </IconButton>
                          </Table.Cell>
                          <Table.Cell onDblClick={startRename}>
                            <Show
                              when={isEditing()}
                              fallback={
                                <Box
                                  class={css({
                                    fontWeight: "semibold",
                                    cursor: isLoose() ? "default" : "text",
                                  })}
                                >
                                  {e.title || "Untitled list"}
                                </Box>
                              }
                            >
                              <Input
                                value={pb.editingListTitle()}
                                onInput={(ev) =>
                                  pb.setEditingListTitle(ev.currentTarget.value)
                                }
                                onKeyDown={onRenameKeyDown as any}
                                onBlur={() => void pb.saveEditList()}
                              />
                            </Show>
                          </Table.Cell>
                          <Table.Cell>
                            <Box
                              class={css({ fontSize: "sm", color: "fg.muted" })}
                            >
                              {e.itemCount}
                            </Box>
                          </Table.Cell>
                          <Table.Cell>
                            <Box
                              class={css({ fontSize: "sm", color: "fg.muted" })}
                            >
                              {new Date(e.updatedAt).toLocaleString()}
                            </Box>
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap="1" justify="flex-end">
                              <ProjectBoardListMenu
                                listId={e.listId}
                                listKey={e.key}
                                title={e.title}
                                description={e.description}
                                items={items()}
                                onRename={startRename}
                              />
                            </HStack>
                          </Table.Cell>
                        </Table.Row>

                        <Show when={isExpanded()}>
                          <Table.Row>
                            <Table.Cell colSpan={6}>
                              <VStack
                                alignItems="stretch"
                                gap="3"
                                class={css({
                                  borderTopWidth: "1px",
                                  borderTopColor: "border",
                                  bg: "bg.muted",
                                  rounded: "lg",
                                  p: "3",
                                })}
                              >
                                <HStack
                                  justify="space-between"
                                  gap="3"
                                  flexWrap="wrap"
                                >
                                  <Stack gap="1" minW="0">
                                    <Show when={(e.description ?? "").trim()}>
                                      <Box
                                        class={css({
                                          fontSize: "sm",
                                          color: "fg.muted",
                                        })}
                                      >
                                        {e.description}
                                      </Box>
                                    </Show>
                                  </Stack>
                                  <HStack
                                    gap="2"
                                    flexWrap="wrap"
                                    justify="flex-end"
                                  >
                                    <ProjectBoardQuickAddItem
                                      listId={isLoose() ? null : e.key}
                                      size="sm"
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        props.url.openSplitFor(e.key)
                                      }
                                    >
                                      Open
                                    </Button>
                                  </HStack>
                                </HStack>

                                <VStack
                                  alignItems="stretch"
                                  gap="2"
                                  onDragOver={(ev) => {
                                    if (!pb.draggingItemId()) return;
                                    ev.preventDefault();
                                    pb.setDragOverColumnId(e.key);
                                    pb.setDragOverItemId(null);
                                  }}
                                  onDrop={async (ev) => {
                                    ev.preventDefault();
                                    const dragged = pb.draggingItemId();
                                    if (!dragged) return;
                                    const destListId = isLoose() ? null : e.key;
                                    const destItems = items().filter(
                                      (x) => x.id !== dragged
                                    );
                                    pb.setDragOverColumnId(null);
                                    await pb.moveItemByDnD(
                                      dragged,
                                      destListId,
                                      destItems.length
                                    );
                                  }}
                                >
                                  <Show
                                    when={items().length > 0}
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
                                    <For each={items()}>
                                      {(it) => (
                                        <ProjectBoardItemRow
                                          item={it}
                                          listId={isLoose() ? null : e.key}
                                          getColumnItems={items}
                                        />
                                      )}
                                    </For>
                                  </Show>

                                  <ProjectBoardAddItem
                                    listId={isLoose() ? null : e.key}
                                  />
                                </VStack>
                              </VStack>
                            </Table.Cell>
                          </Table.Row>
                        </Show>
                      </>
                    );
                  }}
                </For>
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>
      </Show>
    </Show>
  );
}
