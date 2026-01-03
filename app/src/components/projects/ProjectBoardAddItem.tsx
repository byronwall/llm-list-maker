import { Show } from "solid-js";
import { css } from "styled-system/css";
import { Box, HStack, VStack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useProjectBoard } from "./project-board-context";

export function ProjectBoardAddItem(props: { listId: string | null }) {
  const pb = useProjectBoard();

  return (
    <Box pt="2">
      <Show
        when={pb.addingItemListId() === props.listId}
        fallback={
          <Button
            size="xs"
            variant="outline"
            onClick={() => pb.openAddItem(props.listId)}
          >
            Add item
          </Button>
        }
      >
        <VStack alignItems="stretch" gap="2">
          <Input
            placeholder="Item label"
            value={pb.newItemLabel()}
            onInput={(e) => pb.setNewItemLabel(e.currentTarget.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={pb.newItemDesc()}
            onInput={(e) => pb.setNewItemDesc(e.currentTarget.value)}
            class={css({ minH: "72px" })}
          />
          <HStack justify="flex-end" gap="2">
            <Button size="sm" variant="outline" onClick={pb.cancelAddItem}>
              Cancel
            </Button>
            <Button size="sm" variant="solid" onClick={() => void pb.createItemFor()}>
              Add
            </Button>
          </HStack>
        </VStack>
      </Show>
    </Box>
  );
}


