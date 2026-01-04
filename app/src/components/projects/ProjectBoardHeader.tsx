import { Box, HStack, Stack, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Show, createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { Textarea } from "~/components/ui/textarea";
import * as Dialog from "~/components/ui/dialog";
import * as Menu from "~/components/ui/menu";
import {
  CopyIcon,
  DownloadIcon,
  FileTextIcon,
  PencilIcon,
  Trash2Icon,
  Wand2Icon,
} from "lucide-solid";
import { useProjectBoard } from "./project-board-context";
import { CreateListPopover } from "./CreateListPopover";
import {
  copyTextToClipboard,
  downloadTextFile,
  projectBoardToMarkdown,
  sanitizeFilename,
} from "~/lib/projects/export";

export function ProjectBoardHeader() {
  const pb = useProjectBoard();
  const [isDeleteOpen, setIsDeleteOpen] = createSignal(false);
  const [deleteError, setDeleteError] = createSignal<string | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  const onConfirmDelete = async () => {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await pb.deleteProject();
      // Navigate back to home (full refresh keeps query caches consistent).
      window.location.href = "/";
    } catch (err: any) {
      setDeleteError(String(err?.message ?? err ?? "Failed to delete project"));
      setIsDeleting(false);
    }
  };

  const onDownloadJson = () => {
    const board = pb.board();
    if (!board) return;

    const json = JSON.stringify(board, null, 2) + "\n";
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const safeName = sanitizeFilename(board.project.title || board.project.id);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName || board.project.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDownloadMarkdown = () => {
    const board = pb.board();
    if (!board) return;
    const md = projectBoardToMarkdown(board);
    const safeProject = sanitizeFilename(board.project.title || board.project.id);
    downloadTextFile({
      filename: `${safeProject}.md`,
      text: md,
      mime: "text/markdown;charset=utf-8",
    });
  };

  const onCopyMarkdown = async () => {
    const board = pb.board();
    if (!board) return;
    const md = projectBoardToMarkdown(board);
    await copyTextToClipboard(md);
  };

  return (
    <HStack justify="space-between" alignItems="start">
      <Stack gap="1">
        <HStack gap="3">
          <Link href="/">← Projects</Link>
        </HStack>
        <Show when={pb.board()}>
          <Show
            when={!pb.isEditingProject()}
            fallback={
              <VStack
                alignItems="stretch"
                gap="2"
                class={css({ maxW: "680px" })}
              >
                <Input
                  value={pb.editingProjectTitle()}
                  onInput={(e) =>
                    pb.setEditingProjectTitle(e.currentTarget.value)
                  }
                />
                <Textarea
                  value={pb.editingProjectDesc()}
                  onInput={(e) =>
                    pb.setEditingProjectDesc(e.currentTarget.value)
                  }
                  class={css({ minH: "88px" })}
                  placeholder="Project description"
                />
                <HStack justify="flex-start" gap="2">
                  <Button
                    size="sm"
                    variant="solid"
                    onClick={() => void pb.saveEditProject()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pb.cancelEditProject}
                  >
                    Cancel
                  </Button>
                </HStack>
              </VStack>
            }
          >
            <HStack gap="2" alignItems="center">
              <Box class={css({ fontSize: "2xl", fontWeight: "semibold" })}>
                {pb.board()!.project.title}
              </Box>
              <IconButton
                size="xs"
                variant="plain"
                aria-label="Edit project"
                onClick={pb.startEditProject}
              >
                <PencilIcon />
              </IconButton>
            </HStack>
            <Show when={pb.board()!.project.description}>
              <Box class={css({ color: "fg.muted", maxW: "680px" })}>
                {pb.board()!.project.description}
              </Box>
            </Show>
          </Show>
        </Show>
      </Stack>

      <HStack gap="2" flexWrap="wrap" justify="flex-end">
        <Menu.Root>
          <Menu.Trigger
            asChild={(triggerProps) => (
              <Button {...triggerProps} variant="outline" disabled={!pb.board()}>
                <HStack gap="2" alignItems="center">
                  <DownloadIcon />
                  <Box>Export</Box>
                  <Menu.Indicator />
                </HStack>
              </Button>
            )}
          />
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item
                value="download-json"
                onSelect={onDownloadJson}
                disabled={!pb.board()}
              >
                <HStack gap="2" alignItems="center">
                  <DownloadIcon />
                  <Box>Download JSON</Box>
                </HStack>
              </Menu.Item>
              <Menu.Item
                value="download-markdown"
                onSelect={onDownloadMarkdown}
                disabled={!pb.board()}
              >
                <HStack gap="2" alignItems="center">
                  <FileTextIcon />
                  <Box>Download Markdown</Box>
                </HStack>
              </Menu.Item>
              <Menu.Item
                value="copy-markdown"
                onSelect={() => void onCopyMarkdown()}
                disabled={!pb.board()}
              >
                <HStack gap="2" alignItems="center">
                  <CopyIcon />
                  <Box>Copy as Markdown</Box>
                </HStack>
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
        <CreateListPopover />

        <Button
          onClick={() => pb.setIsAiHelpOpen(true)}
          disabled={pb.isAiBusy()}
          variant="solid"
        >
          <HStack gap="2" alignItems="center">
            <Wand2Icon />
            <Box>AI Help</Box>
          </HStack>
        </Button>

        <Dialog.Root
          open={isDeleteOpen()}
          onOpenChange={(details: any) => {
            setIsDeleteOpen(!!details?.open);
            if (!details?.open) setDeleteError(null);
          }}
        >
          <Dialog.Trigger
            asChild={(triggerProps) => (
              <Button
                {...triggerProps}
                variant="outline"
                colorPalette="red"
                disabled={!pb.board() || pb.isAiBusy() || pb.isEditingProject()}
              >
                <HStack gap="2" alignItems="center">
                  <Trash2Icon />
                  <Box>Delete</Box>
                </HStack>
              </Button>
            )}
          />
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content
              class={css({
                maxW: "560px",
                "--dialog-base-margin": "24px",
              })}
            >
              <Dialog.Header>
                <Dialog.Title>Delete project</Dialog.Title>
                <Dialog.Description>
                  This will permanently delete{" "}
                  <Box as="span" class={css({ fontWeight: "semibold" })}>
                    {pb.board()?.project.title ?? "this project"}
                  </Box>{" "}
                  and all its lists/items.
                </Dialog.Description>
              </Dialog.Header>

              <Dialog.Body>
                <Show when={deleteError()}>
                  <Box
                    class={css({
                      color: "red.surface.fg",
                      bg: "red.surface.bg",
                      borderWidth: "1px",
                      borderColor: "red.surface.border",
                      rounded: "lg",
                      px: "3",
                      py: "2",
                      fontSize: "sm",
                    })}
                  >
                    {deleteError()}
                  </Box>
                </Show>
              </Dialog.Body>

              <Dialog.Footer>
                <HStack justify="flex-end" w="full" gap="2">
                  <Button
                    variant="outline"
                    disabled={isDeleting()}
                    onClick={() => setIsDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="solid"
                    colorPalette="red"
                    loading={isDeleting()}
                    loadingText="Deleting…"
                    onClick={() => void onConfirmDelete()}
                  >
                    Delete project
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </HStack>
    </HStack>
  );
}
