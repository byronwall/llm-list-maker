import * as Dialog from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Box, HStack, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { XIcon } from "lucide-solid";
import { useProjectBoard } from "./project-board-context";

export function AiHelpDialog() {
  const pb = useProjectBoard();

  return (
    <Dialog.Root
      open={pb.isAiHelpOpen()}
      onOpenChange={(details: any) => pb.setIsAiHelpOpen(!!details?.open)}
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
              Add optional instructions below. If you provide input, it will be
              treated as the highest priority.
            </Dialog.Description>
          </Dialog.Header>

          <Dialog.CloseTrigger aria-label="Close AI Help">
            <XIcon />
          </Dialog.CloseTrigger>

          <Dialog.Body>
            <VStack alignItems="stretch" gap="3">
              <Textarea
                value={pb.aiHelpUserInput()}
                onInput={(e) => pb.setAiHelpUserInput(e.currentTarget.value)}
                placeholder="What do you want the AI to do? (e.g. 'Create 4 lists: Backlog, Doing, Blocked, Done. Add 10 items for a mobile MVP. Move anything that looks misplaced.')"
                class={css({ minH: "220px", resize: "vertical" })}
              />

              <VStack alignItems="stretch" gap="2">
                <Box class={css({ fontWeight: "semibold" })}>Options</Box>
                <HStack gap="2" flexWrap="wrap">
                  <Button
                    type="button"
                    variant={pb.aiHelpCreateLists() ? "solid" : "outline"}
                    aria-pressed={pb.aiHelpCreateLists()}
                    onClick={() => pb.setAiHelpCreateLists((v) => !v)}
                  >
                    Create lists
                  </Button>
                  <Button
                    type="button"
                    variant={pb.aiHelpCreateItems() ? "solid" : "outline"}
                    aria-pressed={pb.aiHelpCreateItems()}
                    onClick={() => pb.setAiHelpCreateItems((v) => !v)}
                  >
                    Create items
                  </Button>
                  <Button
                    type="button"
                    variant={pb.aiHelpMoveItemsAround() ? "solid" : "outline"}
                    aria-pressed={pb.aiHelpMoveItemsAround()}
                    onClick={() => pb.setAiHelpMoveItemsAround((v) => !v)}
                  >
                    Move items around
                  </Button>
                  <Button
                    type="button"
                    variant={pb.aiHelpCleanupContent() ? "solid" : "outline"}
                    aria-pressed={pb.aiHelpCleanupContent()}
                    onClick={() => pb.setAiHelpCleanupContent((v) => !v)}
                  >
                    Clean up existing content
                  </Button>
                </HStack>
              </VStack>
            </VStack>
          </Dialog.Body>

          <Dialog.Footer>
            <HStack justify="space-between" w="full" gap="2" flexWrap="wrap">
              <Button
                type="button"
                variant="outline"
                onClick={pb.onAiReview}
                disabled={pb.isAiBusy()}
              >
                Review board
              </Button>
              <HStack gap="2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pb.setIsAiHelpOpen(false)}
                  disabled={pb.isAiBusy()}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="solid"
                  onClick={pb.onRunAiHelp}
                  disabled={pb.isAiBusy() || !pb.canRunAiHelp()}
                >
                  Apply
                </Button>
              </HStack>
            </HStack>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
