import { For, Show } from "solid-js";
import { css } from "styled-system/css";
import { Box, HStack, VStack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { PencilIcon, Trash2Icon } from "lucide-solid";
import { isLoose } from "~/lib/projects/board-utils";
import { useProjectBoard } from "./project-board-context";

export function ProjectBoardGrid() {
  const pb = useProjectBoard();

  const boardGridClass = css({
    display: "grid",
    gridTemplateColumns: {
      base: "1fr",
      md: "repeat(2, minmax(0, 1fr))",
      xl: "repeat(3, minmax(0, 1fr))",
    },
    gap: "3",
    alignItems: "start",
    pb: "2",
  });

  const columnShellClass = (isDragTarget: boolean) =>
    css({
      width: "100%",
      minW: 0,
      rounded: "lg",
      overflow: "hidden",
      bg: isDragTarget ? "gray.surface.bg.hover" : "gray.surface.bg",
      borderWidth: "1px",
      borderColor: "border",
      outlineWidth: isDragTarget ? "2px" : "0px",
      outlineStyle: isDragTarget ? "dashed" : "solid",
      outlineOffset: "2px",
      outlineColor: "border.emphasized",
      transitionProperty:
        "outline-color, outline-offset, background-color, border-color",
      transitionDuration: "150ms",
      // Progressive disclosure for list-level affordances.
      "& .colActions": {
        opacity: 0,
        pointerEvents: "none",
        transitionProperty: "opacity",
        transitionDuration: "120ms",
      },
      "& .colHandle": {
        opacity: 0,
        transitionProperty: "opacity",
        transitionDuration: "120ms",
      },
      _hover: {
        borderColor: "border.emphasized",
        "& .colActions": { opacity: 1, pointerEvents: "auto" },
        "& .colHandle": { opacity: 1 },
      },
      _focusWithin: {
        "& .colActions": { opacity: 1, pointerEvents: "auto" },
        "& .colHandle": { opacity: 1 },
      },
    });

  const columnHeaderClass = css({
    px: "3",
    py: "2",
    borderBottomWidth: "1px",
    borderColor: "border",
  });

  const columnBodyClass = css({
    px: "3",
    py: "2",
  });

  const itemsStackClass = (isDragTarget: boolean) =>
    css({
      display: "flex",
      flexDirection: "column",
      gap: "2",
      rounded: "md",
      bg: isDragTarget ? "gray.surface.bg.hover" : "transparent",
      outlineWidth: isDragTarget ? "2px" : "0px",
      outlineStyle: isDragTarget ? "dashed" : "solid",
      outlineOffset: "2px",
      outlineColor: "border.emphasized",
      transitionProperty: "background-color, outline-color, outline-offset",
      transitionDuration: "150ms",
      minH: "10",
    });

  const itemRowClass = (isDropTarget: boolean, isDragging: boolean) =>
    css({
      position: "relative",
      rounded: "md",
      px: "2",
      py: "2",
      bg: "gray.subtle.bg",
      borderWidth: "1px",
      borderColor: isDropTarget ? "border.emphasized" : "transparent",
      outlineWidth: isDropTarget ? "2px" : "0px",
      outlineColor: "border.emphasized",
      outlineOffset: isDropTarget ? "2px" : "0px",
      transitionProperty:
        "outline-color, outline-offset, background-color, border-color, opacity",
      transitionDuration: "150ms",
      opacity: isDragging ? 0.35 : 1,
      // Progressive disclosure for item-level affordances.
      "& .itemActions": {
        opacity: 0,
        pointerEvents: "none",
        transitionProperty: "opacity",
        transitionDuration: "120ms",
      },
      "& .itemHandle": {
        opacity: 0,
        transitionProperty: "opacity",
        transitionDuration: "120ms",
      },
      _hover: {
        bg: "gray.subtle.bg.hover",
        borderColor: isDropTarget ? "border.emphasized" : "border",
        "& .itemActions": { opacity: 1, pointerEvents: "auto" },
        "& .itemHandle": { opacity: 1 },
      },
      _focusWithin: {
        "& .itemActions": { opacity: 1, pointerEvents: "auto" },
        "& .itemHandle": { opacity: 1 },
      },
    });

  return (
    <Show
      when={pb.board()}
      fallback={<Box class={css({ color: "fg.muted" })}>Loading…</Box>}
    >
      <Box class={boardGridClass}>
        <For each={pb.orderedColumns()}>
          {(col) => {
            const columnItems = () => pb.itemsByListId().get(col.key) ?? [];
            const listForColumn = () =>
              pb.lists().find((l) => l.id === col.listId) ?? null;
            const isColumnDragOver = () => pb.dragOverColumnId() === col.key;
            const isListDragOver = () =>
              !!pb.draggingListId() && pb.dragOverListId() === col.listId;
            const isItemDragOverThisColumn = () =>
              !!pb.draggingItemId() && isColumnDragOver();

            return (
              <Box
                class={columnShellClass(isColumnDragOver() || isListDragOver())}
              >
                <Box class={columnHeaderClass}>
                  <HStack justify="space-between" alignItems="start" gap="2">
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
                            pb.applyMinimalDragImage(e);
                            pb.setDraggingListId(col.listId);
                          }}
                          onDragEnd={() => {
                            pb.setDraggingListId(null);
                            pb.setDragOverListId(null);
                          }}
                          onDragOver={(e) => {
                            if (!pb.draggingListId()) return;
                            e.preventDefault();
                            pb.setDragOverListId(col.listId);
                          }}
                          onDragLeave={() => {
                            // Keep this subtle: if you leave a handle, remove the "target" affordance.
                            pb.setDragOverListId(null);
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            pb.setDragOverListId(null);
                            await pb.onListDropBefore(String(col.listId));
                          }}
                          class={`${css({
                            cursor: "grab",
                            rounded: "sm",
                            px: "1",
                            color: "fg.muted",
                            fontSize: "sm",
                            lineHeight: "1",
                            bg:
                              pb.dragOverListId() === col.listId
                                ? "gray.surface.bg.hover"
                                : "transparent",
                            borderWidth:
                              pb.dragOverListId() === col.listId
                                ? "1px"
                                : "0px",
                            borderColor: "border.emphasized",
                          })} colHandle`}
                          aria-label="Drag to reorder list"
                        >
                          ⋮⋮
                        </Box>
                      </Show>
                      <Box as="span">{col.title}</Box>
                    </Box>

                    <Show when={!isLoose(col.listId)}>
                      <HStack gap="1" class="colActions">
                        <IconButton
                          size="2xs"
                          variant="plain"
                          aria-label="Edit list"
                          onClick={() => {
                            const list = listForColumn();
                            if (list) pb.startEditList(list);
                          }}
                        >
                          <PencilIcon />
                        </IconButton>
                        <IconButton
                          size="2xs"
                          variant="plain"
                          aria-label="Delete list"
                          onClick={() => void pb.deleteList(String(col.listId))}
                        >
                          <Trash2Icon />
                        </IconButton>
                      </HStack>
                    </Show>
                  </HStack>

                  <Show when={pb.editingListId() === col.listId}>
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
                </Box>

                <Box class={columnBodyClass}>
                  <VStack
                    alignItems="stretch"
                    gap="2"
                    class={itemsStackClass(isItemDragOverThisColumn())}
                    onDragOver={(e) => {
                      if (!pb.draggingItemId()) return;
                      e.preventDefault();
                      pb.setDragOverColumnId(col.key);
                      pb.setDragOverItemId(null);
                    }}
                    onDrop={async (e) => {
                      // Allow dropping anywhere in the column body to move to end.
                      e.preventDefault();
                      const dragged = pb.draggingItemId();
                      if (!dragged) return;
                      const destListId = col.listId;
                      const destItems = columnItems().filter(
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
                            class={itemRowClass(
                              pb.dragOverItemId() === it.id,
                              pb.draggingItemId() === it.id
                            )}
                            onDragOver={(e) => {
                              if (!pb.draggingItemId()) return;
                              e.preventDefault();
                              e.stopPropagation();
                              pb.setDragOverItemId(it.id);
                              pb.setDragOverColumnId(null);
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const dragged = pb.draggingItemId();
                              if (!dragged) return;

                              const destListId = col.listId;
                              const destItems = columnItems().filter(
                                (x) => x.id !== dragged
                              );
                              const targetIdx = destItems.findIndex(
                                (x) => x.id === it.id
                              );
                              if (targetIdx < 0) return;

                              pb.setDragOverItemId(null);
                              await pb.moveItemByDnD(
                                dragged,
                                destListId,
                                targetIdx
                              );
                            }}
                          >
                            <Show
                              when={
                                pb.dragOverItemId() === it.id &&
                                !!pb.draggingItemId() &&
                                pb.draggingItemId() !== it.id
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
                                    pb.applyMinimalDragImage(e);
                                    pb.setDraggingItemId(it.id);
                                  }}
                                  onDragEnd={() => {
                                    pb.setDraggingItemId(null);
                                    pb.setDragOverItemId(null);
                                    pb.setDragOverColumnId(null);
                                  }}
                                  class={`${css({
                                    cursor: "grab",
                                    rounded: "sm",
                                    px: "1",
                                    color: "fg.muted",
                                    fontSize: "sm",
                                    userSelect: "none",
                                    lineHeight: "1",
                                  })} itemHandle`}
                                  aria-label="Drag to move item"
                                >
                                  ⋮⋮
                                </Box>
                                <Box class={css({ fontWeight: "medium" })}>
                                  {it.label}
                                </Box>
                              </HStack>

                              <HStack gap="1" class="itemActions">
                                <IconButton
                                  size="2xs"
                                  variant="plain"
                                  aria-label="Edit item"
                                  onClick={() => pb.startEditItem(it)}
                                >
                                  <PencilIcon />
                                </IconButton>
                                <IconButton
                                  size="2xs"
                                  variant="plain"
                                  aria-label="Delete item"
                                  onClick={() => void pb.deleteItem(it.id)}
                                >
                                  <Trash2Icon />
                                </IconButton>
                              </HStack>
                            </HStack>

                            <Show when={pb.editingItemId() === it.id}>
                              <VStack alignItems="stretch" gap="2" mt="3">
                                <Input
                                  value={pb.editingItemLabel()}
                                  onInput={(e) =>
                                    pb.setEditingItemLabel(
                                      e.currentTarget.value
                                    )
                                  }
                                />
                                <Textarea
                                  value={pb.editingItemDesc()}
                                  onInput={(e) =>
                                    pb.setEditingItemDesc(e.currentTarget.value)
                                  }
                                  class={css({ minH: "72px" })}
                                />
                                <HStack justify="flex-end" gap="2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={pb.cancelEditItem}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="solid"
                                    onClick={() => void pb.saveEditItem()}
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
                        when={pb.addingItemListId() === col.listId}
                        fallback={
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => pb.openAddItem(col.listId)}
                          >
                            Add item
                          </Button>
                        }
                      >
                        <VStack alignItems="stretch" gap="2">
                          <Input
                            placeholder="Item label"
                            value={pb.newItemLabel()}
                            onInput={(e) =>
                              pb.setNewItemLabel(e.currentTarget.value)
                            }
                          />
                          <Textarea
                            placeholder="Description (optional)"
                            value={pb.newItemDesc()}
                            onInput={(e) =>
                              pb.setNewItemDesc(e.currentTarget.value)
                            }
                            class={css({ minH: "72px" })}
                          />
                          <HStack justify="flex-end" gap="2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={pb.cancelAddItem}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="solid"
                              onClick={() => void pb.createItemFor()}
                            >
                              Add
                            </Button>
                          </HStack>
                        </VStack>
                      </Show>
                    </Box>
                  </VStack>
                </Box>
              </Box>
            );
          }}
        </For>
      </Box>
    </Show>
  );
}
