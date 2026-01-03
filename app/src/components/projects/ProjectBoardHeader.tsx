import { Box, HStack, Stack, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Link } from "~/components/ui/link";
import { Textarea } from "~/components/ui/textarea";
import { PencilIcon, Wand2Icon } from "lucide-solid";
import { useProjectBoard } from "./project-board-context";
import { CreateListPopover } from "./CreateListPopover";

export function ProjectBoardHeader() {
  const pb = useProjectBoard();

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
                  onInput={(e) => pb.setEditingProjectTitle(e.currentTarget.value)}
                />
                <Textarea
                  value={pb.editingProjectDesc()}
                  onInput={(e) => pb.setEditingProjectDesc(e.currentTarget.value)}
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
      </HStack>
    </HStack>
  );
}


