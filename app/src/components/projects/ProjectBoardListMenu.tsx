import { Box, HStack } from "styled-system/jsx";
import { CopyIcon, FileTextIcon, MoreVerticalIcon, Trash2Icon, PencilIcon, CopyPlusIcon } from "lucide-solid";
import { css } from "styled-system/css";
import * as Menu from "~/components/ui/menu";
import { IconButton } from "~/components/ui/icon-button";
import { downloadTextFile, copyTextToClipboard, sanitizeFilename, singleListToMarkdown } from "~/lib/projects/export";
import type { Item } from "~/lib/domain";
import { useProjectBoard } from "./project-board-context";

export function ProjectBoardListMenu(props: {
  listId: string | null;
  listKey: string;
  title: string;
  description: string;
  items: Item[];
  onRename?: () => void;
}) {
  const pb = useProjectBoard();

  const listMarkdown = () =>
    singleListToMarkdown({
      title: props.title,
      description: props.description,
      items: props.items,
    });

  const onDownloadMarkdown = () => {
    const board = pb.board();
    const safeProject = sanitizeFilename(
      board?.project.title || board?.project.id || "project"
    );
    const safeList = sanitizeFilename(props.title || props.listKey);
    downloadTextFile({
      filename: `${safeProject}-${safeList}.md`,
      text: listMarkdown(),
      mime: "text/markdown;charset=utf-8",
    });
  };

  const onCopyMarkdown = async () => {
    await copyTextToClipboard(listMarkdown());
  };

  const canMutate = () => props.listId != null;

  return (
    <Menu.Root size="sm">
      <Menu.Trigger
        asChild={(triggerProps) => (
          <IconButton
            {...triggerProps}
            size="xs"
            variant="plain"
            aria-label="List actions"
          >
            <MoreVerticalIcon />
          </IconButton>
        )}
      />
      <Menu.Positioner>
        <Menu.Content class={css({ minW: "220px" })}>
          <Menu.Item value="download-md" onSelect={onDownloadMarkdown}>
            <HStack gap="2" alignItems="center">
              <FileTextIcon />
              <Box>Download Markdown</Box>
            </HStack>
          </Menu.Item>
          <Menu.Item value="copy-md" onSelect={() => void onCopyMarkdown()}>
            <HStack gap="2" alignItems="center">
              <CopyIcon />
              <Box>Copy Markdown</Box>
            </HStack>
          </Menu.Item>

          <Menu.Separator />

          <Menu.Item
            value="rename"
            disabled={!canMutate()}
            onSelect={() => props.onRename?.()}
          >
            <HStack gap="2" alignItems="center">
              <PencilIcon />
              <Box>Rename</Box>
            </HStack>
          </Menu.Item>

          <Menu.Item
            value="duplicate"
            disabled={!canMutate()}
            onSelect={() => {
              if (!props.listId) return;
              void pb.duplicateList(props.listId);
            }}
          >
            <HStack gap="2" alignItems="center">
              <CopyPlusIcon />
              <Box>Duplicate</Box>
            </HStack>
          </Menu.Item>

          <Menu.Item
            value="delete"
            disabled={!canMutate()}
            onSelect={() => {
              if (!props.listId) return;
              void pb.deleteList(props.listId);
            }}
          >
            <HStack gap="2" alignItems="center" class={css({ color: "red.fg" })}>
              <Trash2Icon />
              <Box>Delete</Box>
            </HStack>
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}


