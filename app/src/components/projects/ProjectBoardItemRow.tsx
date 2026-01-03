import { Show } from "solid-js";
import { css } from "styled-system/css";
import { Box, HStack, VStack } from "styled-system/jsx";
import { PencilIcon, Trash2Icon } from "lucide-solid";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { Item } from "~/lib/domain";
import { useProjectBoard } from "./project-board-context";
import { itemRowClass } from "./ProjectBoardGrid.styles";

export function ProjectBoardItemRow(props: {
  item: Item;
  listId: string | null;
  getColumnItems: () => Item[];
}) {
  const pb = useProjectBoard();

  const isDropTarget = () => pb.dragOverItemId() === props.item.id;
  const isDragging = () => pb.draggingItemId() === props.item.id;

  return (
    <Box
      class={itemRowClass(isDropTarget(), isDragging())}
      onDragOver={(e) => {
        if (!pb.draggingItemId()) return;
        e.preventDefault();
        e.stopPropagation();
        pb.setDragOverItemId(props.item.id);
        pb.setDragOverColumnId(null);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const dragged = pb.draggingItemId();
        if (!dragged) return;

        const destListId = props.listId;
        const destItems = props
          .getColumnItems()
          .filter((x) => x.id !== dragged);
        const targetIdx = destItems.findIndex((x) => x.id === props.item.id);
        if (targetIdx < 0) return;

        pb.setDragOverItemId(null);
        await pb.moveItemByDnD(dragged, destListId, targetIdx);
      }}
    >
      <Show
        when={
          pb.dragOverItemId() === props.item.id &&
          !!pb.draggingItemId() &&
          pb.draggingItemId() !== props.item.id
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

      {/* Absolute overlay actions (shown on hover/focus-within) */}
      <HStack gap="1" class="itemActions">
        <IconButton
          size="2xs"
          variant="plain"
          aria-label="Edit item"
          onClick={() => pb.startEditItem(props.item)}
        >
          <PencilIcon />
        </IconButton>
        <IconButton
          size="2xs"
          variant="plain"
          aria-label="Delete item"
          onClick={() => void pb.deleteItem(props.item.id)}
        >
          <Trash2Icon />
        </IconButton>
      </HStack>

      <HStack alignItems="start" gap="2" minW="0">
        <HStack gap="2" alignItems="center" minW="0">
          <Box
            as="span"
            draggable
            onDragStart={(e) => {
              e.dataTransfer?.setData("text/plain", props.item.id);
              pb.applyMinimalDragImage(e);
              pb.setDraggingItemId(props.item.id);
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
          <VStack
            alignItems="start"
            gap="0.5"
            minW="0"
            class={css({ lineHeight: "1.2" })}
          >
            <Box class={css({ fontWeight: "medium", minW: 0, lineClamp: "2" })}>
              {props.item.label}
            </Box>
            <Show when={props.item.description.trim().length > 0}>
              <Box
                class={css({
                  color: "fg.muted",
                  fontSize: "xs",
                  minW: 0,
                  lineClamp: "2",
                })}
              >
                {props.item.description}
              </Box>
            </Show>
          </VStack>
        </HStack>
      </HStack>

      <Show when={pb.editingItemId() === props.item.id}>
        <VStack alignItems="stretch" gap="2" mt="3">
          <Input
            value={pb.editingItemLabel()}
            onInput={(e) => pb.setEditingItemLabel(e.currentTarget.value)}
          />
          <Textarea
            value={pb.editingItemDesc()}
            onInput={(e) => pb.setEditingItemDesc(e.currentTarget.value)}
            class={css({ minH: "72px" })}
          />
          <HStack justify="flex-end" gap="2">
            <Button size="sm" variant="outline" onClick={pb.cancelEditItem}>
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
  );
}
