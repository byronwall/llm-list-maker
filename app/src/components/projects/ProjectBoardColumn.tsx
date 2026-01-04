import { For, Show } from "solid-js";
import { css } from "styled-system/css";
import { Box, HStack, VStack } from "styled-system/jsx";
import { CopyIcon, FileTextIcon, PencilIcon, Trash2Icon } from "lucide-solid";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import * as Menu from "~/components/ui/menu";
import { isLoose } from "~/lib/projects/board-utils";
import {
  copyTextToClipboard,
  downloadTextFile,
  sanitizeFilename,
  singleListToMarkdown,
} from "~/lib/projects/export";
import {
  useProjectBoard,
  type ProjectBoardController,
} from "./project-board-context";
import {
  columnBodyClass,
  columnHeaderClass,
  columnShellClass,
  emptyItemsClass,
  itemsStackClass,
} from "./ProjectBoardGrid.styles";
import { ProjectBoardAddItem } from "./ProjectBoardAddItem";
import { ProjectBoardItemRow } from "./ProjectBoardItemRow";

type Column = ReturnType<ProjectBoardController["orderedColumns"]>[number];

export function ProjectBoardColumn(props: { col: Column }) {
  const pb = useProjectBoard();

  const columnItems = () => pb.itemsByListId().get(props.col.key) ?? [];
  const listForColumn = () =>
    pb.lists().find((l) => l.id === props.col.listId) ?? null;

  const listMarkdown = () =>
    singleListToMarkdown({
      title: props.col.title,
      description: props.col.description,
      items: columnItems(),
    });

  const onDownloadListMarkdown = () => {
    const board = pb.board();
    const md = listMarkdown();
    const safeProject = sanitizeFilename(
      board?.project.title || board?.project.id || "project"
    );
    const safeList = sanitizeFilename(props.col.title || props.col.key);
    downloadTextFile({
      filename: `${safeProject}-${safeList}.md`,
      text: md,
      mime: "text/markdown;charset=utf-8",
    });
  };

  const onCopyListMarkdown = async () => {
    await copyTextToClipboard(listMarkdown());
  };

  const isColumnDragOver = () => pb.dragOverColumnId() === props.col.key;
  const isListDragOver = () =>
    !!pb.draggingListId() && pb.dragOverListId() === props.col.listId;
  const isItemDragOverThisColumn = () =>
    !!pb.draggingItemId() && isColumnDragOver();

  return (
    <Box class={columnShellClass(isColumnDragOver() || isListDragOver())}>
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
            <Show when={!isLoose(props.col.listId)}>
              <Box
                as="span"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer?.setData(
                    "text/plain",
                    String(props.col.listId)
                  );
                  pb.applyMinimalDragImage(e);
                  pb.setDraggingListId(props.col.listId);
                }}
                onDragEnd={() => {
                  pb.setDraggingListId(null);
                  pb.setDragOverListId(null);
                }}
                onDragOver={(e) => {
                  if (!pb.draggingListId()) return;
                  e.preventDefault();
                  pb.setDragOverListId(props.col.listId);
                }}
                onDragLeave={() => {
                  // Keep this subtle: if you leave a handle, remove the "target" affordance.
                  pb.setDragOverListId(null);
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  pb.setDragOverListId(null);
                  await pb.onListDropBefore(String(props.col.listId));
                }}
                class={`${css({
                  cursor: "grab",
                  rounded: "sm",
                  px: "1",
                  color: "fg.muted",
                  fontSize: "sm",
                  lineHeight: "1",
                  bg:
                    pb.dragOverListId() === props.col.listId
                      ? "gray.surface.bg.hover"
                      : "transparent",
                  borderWidth:
                    pb.dragOverListId() === props.col.listId ? "1px" : "0px",
                  borderColor: "border.emphasized",
                })} colHandle`}
                aria-label="Drag to reorder list"
              >
                ⋮⋮
              </Box>
            </Show>
            <Box as="span">{props.col.title}</Box>
          </Box>

          <Show when={!isLoose(props.col.listId)}>
            <HStack gap="1" class="colActions">
              <Menu.Root size="sm">
                <Menu.Trigger
                  asChild={(triggerProps) => (
                    <Button {...triggerProps} size="2xs" variant="outline">
                      Export <Menu.Indicator />
                    </Button>
                  )}
                />
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item
                      value="download-markdown"
                      onSelect={onDownloadListMarkdown}
                    >
                      <HStack gap="2" alignItems="center">
                        <FileTextIcon />
                        <Box>Download Markdown</Box>
                      </HStack>
                    </Menu.Item>
                    <Menu.Item
                      value="copy-markdown"
                      onSelect={() => void onCopyListMarkdown()}
                    >
                      <HStack gap="2" alignItems="center">
                        <CopyIcon />
                        <Box>Copy as Markdown</Box>
                      </HStack>
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>
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
                onClick={() => void pb.deleteList(String(props.col.listId))}
              >
                <Trash2Icon />
              </IconButton>
            </HStack>
          </Show>
        </HStack>

        <Show
          when={
            !isLoose(props.col.listId) &&
            pb.editingListId() != null &&
            pb.editingListId() === props.col.listId
          }
        >
          <VStack alignItems="stretch" gap="2" mt="3">
            <Input
              value={pb.editingListTitle()}
              onInput={(e) => pb.setEditingListTitle(e.currentTarget.value)}
            />
            <Textarea
              value={pb.editingListDesc()}
              onInput={(e) => pb.setEditingListDesc(e.currentTarget.value)}
              class={css({ minH: "72px" })}
            />
            <HStack justify="flex-end" gap="2">
              <Button size="sm" variant="outline" onClick={pb.cancelEditList}>
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
            pb.setDragOverColumnId(props.col.key);
            pb.setDragOverItemId(null);
          }}
          onDrop={async (e) => {
            // Allow dropping anywhere in the column body to move to end.
            e.preventDefault();
            const dragged = pb.draggingItemId();
            if (!dragged) return;
            const destListId = props.col.listId;
            const destItems = columnItems().filter((x) => x.id !== dragged);
            pb.setDragOverColumnId(null);
            await pb.moveItemByDnD(dragged, destListId, destItems.length);
          }}
        >
          <Show
            when={columnItems().length > 0}
            fallback={<Box class={emptyItemsClass}>No items.</Box>}
          >
            <For each={columnItems()}>
              {(it) => (
                <ProjectBoardItemRow
                  item={it}
                  listId={props.col.listId}
                  getColumnItems={columnItems}
                />
              )}
            </For>
          </Show>

          <ProjectBoardAddItem listId={props.col.listId} />
        </VStack>
      </Box>
    </Box>
  );
}
