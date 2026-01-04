import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { css } from "styled-system/css";
import { Box, HStack, Stack, VStack } from "styled-system/jsx";
import { useProjectBoard } from "./project-board-context";
import type { createProjectBoardUrlState } from "./project-board-url-state";
import { createListIndexEntries } from "./project-board-list-model";
import { CreateListPopover } from "./CreateListPopover";
import { ProjectBoardListMenu } from "./ProjectBoardListMenu";
import { ProjectBoardQuickAddItem } from "./ProjectBoardQuickAddItem";
import { ProjectBoardItemRow } from "./ProjectBoardItemRow";
import { ProjectBoardAddItem } from "./ProjectBoardAddItem";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import * as Select from "~/components/ui/select";
import type { ProjectBoardListSort } from "./project-board-url-state";
import * as Splitter from "~/components/ui/splitter";
import { ArrowUpDownIcon } from "lucide-solid";
import { createListCollection } from "@ark-ui/solid/collection";
import { ClientOnly } from "~/components/ClientOnly";

type UrlState = ReturnType<typeof createProjectBoardUrlState>;

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const sortItems = [
  { label: "Last updated", value: "updated" as const },
  { label: "Alphabetical", value: "alpha" as const },
  { label: "Most items", value: "items" as const },
];
const sortCollection = createListCollection({ items: sortItems });

export function ProjectBoardSplitView(props: { when: boolean; url: UrlState }) {
  const pb = useProjectBoard();
  const { entries, firstKey } = createListIndexEntries({
    pb,
    q: () => props.url.q(),
    sort: () => props.url.sort(),
  });

  const selectedKey = createMemo(() => props.url.listId() ?? firstKey());

  createEffect(() => {
    if (!props.when) return;
    if (props.url.listId() != null) return;
    const fk = firstKey();
    if (!fk) return;
    props.url.setListId(fk, { replace: true });
  });

  const selectedItems = createMemo(() => {
    const key = selectedKey();
    if (!key) return [];
    return pb.itemsByListId().get(key) ?? [];
  });

  const selectedList = createMemo(() => {
    const key = selectedKey();
    if (!key || key === "LOOSE") return null;
    return pb.lists().find((l) => l.id === key) ?? null;
  });

  // Split sizes (Ark UI Splitter uses percentages)
  const sizeKey = () => `pb:split:sizes:${props.url.projectId()}`;
  const [defaultSize, setDefaultSize] = createSignal<[number, number]>([
    30, 70,
  ]);

  onMount(() => {
    try {
      const raw = localStorage.getItem(sizeKey());
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      const a = Number(parsed?.[0]);
      const b = Number(parsed?.[1]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const left = clamp(Math.round(a), 18, 55);
        const right = clamp(Math.round(b), 45, 82);
        // Normalize to 100 if needed (best-effort)
        const sum = left + right;
        if (sum !== 100) {
          const scaledLeft = clamp(Math.round((left / sum) * 100), 18, 55);
          setDefaultSize([scaledLeft, 100 - scaledLeft]);
        } else {
          setDefaultSize([left, right]);
        }
      }
    } catch {}
  });

  // Keyboard nav in list index
  const selectedIndex = createMemo(() => {
    const key = selectedKey();
    if (!key) return 0;
    const idx = entries().findIndex((e) => e.key === key);
    return idx >= 0 ? idx : 0;
  });
  const [focusIndex, setFocusIndex] = createSignal(0);
  createEffect(() => setFocusIndex(selectedIndex()));

  let listSearchEl: HTMLInputElement | undefined;
  const onKeyGlobal = (e: KeyboardEvent) => {
    if (!props.when) return;
    const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? "";
    if (
      tag === "input" ||
      tag === "textarea" ||
      (e.target as any)?.isContentEditable
    )
      return;
    if (
      e.key === "/" ||
      ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")
    ) {
      e.preventDefault();
      listSearchEl?.focus();
    }
  };
  createEffect(() => {
    window.addEventListener("keydown", onKeyGlobal);
    onCleanup(() => window.removeEventListener("keydown", onKeyGlobal));
  });

  const onListKeyDown = (e: KeyboardEvent) => {
    const arr = entries();
    if (arr.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => clamp(i + 1, 0, arr.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => clamp(i - 1, 0, arr.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const next = arr[focusIndex()];
      if (next) props.url.setListId(next.key);
    }
  };

  const sortLabel = () =>
    sortItems.find((x) => x.value === props.url.sort())?.label ?? "Sort";

  return (
    <Show when={props.when}>
      <ClientOnly
        fallback={
          <Box
            class={css({
              // Keep the split view from turning the page body into the primary scroll container.
              // The panes should scroll instead.
              height: "min(90vh, 90dvh)",
              maxH: "min(90vh, 90dvh)",
              width: "100%",
              rounded: "lg",
              borderWidth: "1px",
              borderColor: "border",
              bg: "bg.subtle",
              color: "fg.muted",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "sm",
            })}
          >
            Loading split view…
          </Box>
        }
      >
        <Splitter.Root
          defaultSize={defaultSize()}
          panels={[
            { id: "left", minSize: 18, maxSize: 55, collapsible: false },
            { id: "right", minSize: 45, collapsible: false },
          ]}
          onResizeEnd={(details: any) => {
            const size = details?.size;
            if (Array.isArray(size) && size.length >= 2) {
              try {
                localStorage.setItem(
                  sizeKey(),
                  JSON.stringify([size[0], size[1]])
                );
              } catch {}
            }
          }}
          class={css({
            // Give panels a real height so their internal areas can scroll.
            height: "min(90vh, 90dvh)",
            maxH: "min(90vh, 90dvh)",
            width: "100%",
            gap: "2",
            alignItems: "stretch",
          })}
        >
          {/* Left pane */}
          <Splitter.Panel
            id="left"
            class={css({
              p: "0",
              minW: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            })}
          >
            <VStack
              alignItems="stretch"
              gap="2"
              class={css({
                p: "3",
                borderBottomWidth: "1px",
                borderColor: "border",
              })}
            >
              <HStack gap="2" alignItems="center" w="100%">
                <Input
                  ref={listSearchEl as any}
                  value={props.url.q()}
                  placeholder="Search lists…  (Press /)"
                  onInput={(e) => props.url.setQ(e.currentTarget.value)}
                  flexGrow={1}
                  flexShrink={0}
                  flexBasis="0"
                  minW="0"
                />
                <HStack>
                  <Select.Root
                    collection={sortCollection}
                    size="sm"
                    value={[props.url.sort()]}
                    onValueChange={(
                      details: Select.ValueChangeDetails<any>
                    ) => {
                      const raw =
                        (details as any)?.items?.[0]?.value ??
                        (details as any)?.value?.[0] ??
                        "";
                      const v = String(raw) as ProjectBoardListSort;
                      if (!v) return;
                      props.url.setSort(v);
                    }}
                    positioning={{ sameWidth: false }}
                  >
                    <Select.Control>
                      <Select.Trigger
                        aria-label={`Sort lists (${sortLabel()})`}
                        title={`Sort: ${sortLabel()}`}
                        class={css({
                          minW: "auto",
                          w: "32px",
                          h: "32px",
                          flexShrink: 0,
                          px: "0",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        })}
                      >
                        <ArrowUpDownIcon />
                      </Select.Trigger>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        <Select.List>
                          {sortItems.map((it) => (
                            <Select.Item item={it}>
                              <Select.ItemText>{it.label}</Select.ItemText>
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.List>
                      </Select.Content>
                    </Select.Positioner>
                    <Select.HiddenSelect />
                  </Select.Root>

                  <CreateListPopover {...({ iconOnly: true } as any)} />
                </HStack>
              </HStack>

              <Box class={css({ fontSize: "xs", color: "fg.muted" })}>
                {entries().length} {entries().length === 1 ? "list" : "lists"}
              </Box>
            </VStack>

            <Box
              tabIndex={0}
              role="listbox"
              aria-label="Lists"
              onKeyDown={onListKeyDown as any}
              class={css({
                flex: "1",
                overflow: "auto",
                overscrollBehaviorY: "contain",
                px: "2",
                py: "2",
                outline: "none",
              })}
            >
              <VStack alignItems="stretch" gap="1">
                <Show
                  when={entries().length > 0}
                  fallback={
                    <Box
                      class={css({
                        color: "fg.muted",
                        fontSize: "sm",
                        px: "2",
                        py: "4",
                      })}
                    >
                      No lists yet. Add one to get started.
                    </Box>
                  }
                >
                  {entries().map((e, idx) => {
                    const isSelected = () => selectedKey() === e.key;
                    const isFocused = () => focusIndex() === idx;
                    const items = () => pb.itemsByListId().get(e.key) ?? [];
                    return (
                      <Box
                        role="option"
                        aria-selected={isSelected()}
                        onMouseEnter={() => setFocusIndex(idx)}
                        onClick={() => props.url.setListId(e.key)}
                        class={css({
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          alignItems: "start",
                          gap: "2",
                          px: "2",
                          py: "2",
                          rounded: "lg",
                          cursor: "pointer",
                          borderWidth: "1px",
                          borderColor:
                            isSelected() || isFocused()
                              ? "border.emphasized"
                              : "transparent",
                          transitionProperty:
                            "background-color, border-color, box-shadow",
                          transitionDuration: "120ms",
                          bg: isSelected() ? "gray.subtle.bg" : "transparent",
                          _hover: {
                            bg: isSelected()
                              ? "gray.subtle.bg.hover"
                              : "gray.subtle.bg",
                            borderColor: "border.emphasized",
                          },
                          _focusVisible: {
                            outline: "2px solid",
                            outlineColor: "colorPalette.solid",
                            outlineOffset: "2px",
                          },
                        })}
                      >
                        <Stack gap="1" minW="0">
                          <Box
                            class={css({
                              fontWeight: "semibold",
                              minW: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            })}
                          >
                            {e.title || "Untitled list"}
                          </Box>
                          <HStack
                            gap="2"
                            flexWrap="wrap"
                            class={css({ fontSize: "xs", color: "fg.muted" })}
                          >
                            <Box>{e.itemCount} items</Box>
                            <Box>•</Box>
                            <Box>
                              Updated{" "}
                              {new Date(e.updatedAt).toLocaleDateString()}
                            </Box>
                          </HStack>
                        </Stack>
                        <ProjectBoardListMenu
                          listId={e.listId}
                          listKey={e.key}
                          title={e.title}
                          description={e.description}
                          items={items()}
                          onRename={() => {
                            if (e.list) pb.startEditList(e.list);
                          }}
                        />
                      </Box>
                    );
                  })}
                </Show>
              </VStack>
            </Box>
          </Splitter.Panel>

          <Splitter.ResizeTrigger
            id="left:right"
            aria-label="Resize panes"
            class={css({
              cursor: "col-resize",
              _hover: { bg: "gray.subtle.bg.hover" },
              position: "relative",
            })}
          >
            <Box
              class={css({
                position: "absolute",
                top: "18px",
                bottom: "18px",
                left: "50%",
                width: "2px",
                transform: "translateX(-50%)",
                bg: "border",
                rounded: "full",
              })}
            />
          </Splitter.ResizeTrigger>

          {/* Right pane */}
          <Splitter.Panel
            id="right"
            class={css({
              p: "0",
              minW: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            })}
          >
            <Show
              when={selectedKey()}
              fallback={
                <Box class={css({ p: "6", color: "fg.muted" })}>
                  Select a list to start editing.
                </Box>
              }
            >
              {/* Sticky header + scrollable body */}
              <Box
                class={css({
                  flex: "1",
                  overflow: "auto",
                  overscrollBehaviorY: "contain",
                })}
              >
                <Box
                  class={css({
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    bg: "bg.default",
                    borderBottomWidth: "1px",
                    borderColor: "border",
                    px: "4",
                    py: "3",
                  })}
                >
                  <HStack
                    justify="space-between"
                    alignItems="flex-start"
                    gap="4"
                  >
                    <Stack gap="1" minW="0">
                      <Box
                        class={css({
                          fontSize: "lg",
                          fontWeight: "semibold",
                          minW: 0,
                          lineClamp: "2",
                        })}
                      >
                        {selectedKey() === "LOOSE"
                          ? "Loose"
                          : selectedList()?.title || "Untitled list"}
                      </Box>
                      <HStack
                        gap="2"
                        flexWrap="wrap"
                        class={css({ fontSize: "sm", color: "fg.muted" })}
                      >
                        <Box>{selectedItems().length} items</Box>
                        <Box>•</Box>
                        <Box>
                          Updated{" "}
                          {new Date(
                            selectedKey() === "LOOSE"
                              ? pb.board()?.project.updatedAt ??
                                new Date().toISOString()
                              : selectedList()?.updatedAt ??
                                pb.board()?.project.updatedAt ??
                                new Date().toISOString()
                          ).toLocaleString()}
                        </Box>
                      </HStack>
                    </Stack>

                    <HStack gap="2" flexWrap="wrap" justify="flex-end">
                      <ProjectBoardQuickAddItem
                        listId={
                          selectedKey() === "LOOSE" ? null : selectedKey()!
                        }
                        size="sm"
                      />
                      <ProjectBoardListMenu
                        listId={
                          selectedKey() === "LOOSE" ? null : selectedKey()!
                        }
                        listKey={selectedKey()!}
                        title={
                          selectedKey() === "LOOSE"
                            ? "Loose"
                            : selectedList()?.title ?? "Untitled list"
                        }
                        description={
                          selectedKey() === "LOOSE"
                            ? "Unassigned items live here."
                            : selectedList()?.description ?? ""
                        }
                        items={selectedItems()}
                        onRename={() => {
                          const l = selectedList();
                          if (l) pb.startEditList(l);
                        }}
                      />
                    </HStack>
                  </HStack>

                  <Show when={selectedKey() !== "LOOSE" && selectedList()}>
                    <Show
                      when={
                        pb.editingListId() != null &&
                        pb.editingListId() === selectedList()!.id
                      }
                      fallback={
                        <Show when={(selectedList()!.description ?? "").trim()}>
                          <Box
                            class={css({
                              mt: "2",
                              color: "fg.muted",
                              fontSize: "sm",
                              maxW: "720px",
                            })}
                          >
                            {selectedList()!.description}
                          </Box>
                        </Show>
                      }
                    >
                      <VStack alignItems="stretch" gap="2" mt="3">
                        <Input
                          value={pb.editingListTitle()}
                          onInput={(e) =>
                            pb.setEditingListTitle(e.currentTarget.value)
                          }
                        />
                        <Textarea
                          value={pb.editingListDesc()}
                          onInput={(e) =>
                            pb.setEditingListDesc(e.currentTarget.value)
                          }
                          class={css({ minH: "72px" })}
                        />
                        <HStack justify="flex-end" gap="2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={pb.cancelEditList}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="solid"
                            onClick={() => void pb.saveEditList()}
                          >
                            Save
                          </Button>
                        </HStack>
                      </VStack>
                    </Show>
                  </Show>
                </Box>

                <VStack
                  alignItems="stretch"
                  gap="2"
                  class={css({ px: "4", py: "4" })}
                  onDragOver={(e) => {
                    if (!pb.draggingItemId()) return;
                    e.preventDefault();
                    pb.setDragOverColumnId(selectedKey()!);
                    pb.setDragOverItemId(null);
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const dragged = pb.draggingItemId();
                    if (!dragged) return;
                    const destKey = selectedKey()!;
                    const destListId = destKey === "LOOSE" ? null : destKey;
                    const destItems = selectedItems().filter(
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
                    when={selectedItems().length > 0}
                    fallback={
                      <Box class={css({ color: "fg.muted", fontSize: "sm" })}>
                        No items.
                      </Box>
                    }
                  >
                    {selectedItems().map((it) => (
                      <ProjectBoardItemRow
                        item={it}
                        listId={
                          selectedKey() === "LOOSE" ? null : selectedKey()!
                        }
                        getColumnItems={selectedItems}
                      />
                    ))}
                  </Show>

                  <ProjectBoardAddItem
                    listId={selectedKey() === "LOOSE" ? null : selectedKey()!}
                  />
                </VStack>
              </Box>
            </Show>
          </Splitter.Panel>
        </Splitter.Root>
      </ClientOnly>
    </Show>
  );
}
