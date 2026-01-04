import * as Popover from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Box, HStack, VStack } from "styled-system/jsx";
import { PlusIcon } from "lucide-solid";
import { createEffect, createSignal } from "solid-js";
import { useProjectBoard } from "./project-board-context";

export function ProjectBoardQuickAddItem(props: {
  listId: string | null;
  size?: "sm" | "xs";
  label?: string;
}) {
  const pb = useProjectBoard();
  const [isOpen, setIsOpen] = createSignal(false);
  let inputEl!: HTMLInputElement;

  createEffect(() => {
    if (!isOpen()) return;
    queueMicrotask(() => inputEl?.focus());
  });

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const label = inputEl.value.trim();
    if (!label) return;
    await pb.createItem({ listId: props.listId, label, description: "" });
    inputEl.value = "";
    setIsOpen(false);
  };

  return (
    <Popover.Root
      open={isOpen()}
      onOpenChange={(details: any) => setIsOpen(!!details?.open)}
    >
      <Popover.Trigger
        asChild={(triggerProps) => (
          <Button
            {...triggerProps}
            size={props.size ?? "sm"}
            variant="solid"
            disabled={pb.isAiBusy()}
          >
            <HStack gap="2" alignItems="center">
              <PlusIcon />
              <Box>{props.label ?? "Add item"}</Box>
            </HStack>
          </Button>
        )}
      />
      <Popover.Positioner>
        <Popover.Content style={{ width: "min(380px, calc(100vw - 32px))" }}>
          <Popover.Header>
            <Popover.Title>Add item</Popover.Title>
            <Popover.Description>Quick add to this list.</Popover.Description>
          </Popover.Header>
          <Popover.Body>
            <form onSubmit={onSubmit}>
              <VStack alignItems="stretch" gap="3">
                <Input ref={inputEl} placeholder="Item title" />
                <HStack justify="flex-end" gap="2">
                  <Popover.CloseTrigger
                    asChild={(closeProps) => (
                      <Button size="sm" variant="outline" {...closeProps}>
                        Cancel
                      </Button>
                    )}
                  />
                  <Button size="sm" type="submit" variant="solid">
                    Add
                  </Button>
                </HStack>
              </VStack>
            </form>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}


