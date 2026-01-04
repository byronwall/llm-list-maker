import * as Popover from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Box, HStack, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { PlusIcon } from "lucide-solid";
import { createEffect, createSignal, type Component } from "solid-js";
import { useProjectBoard } from "./project-board-context";

export const CreateListPopover: Component<{ iconOnly?: boolean }> = (props) => {
  const pb = useProjectBoard();

  // New list form
  let newListTitleEl!: HTMLInputElement;
  let newListDescEl!: HTMLTextAreaElement;
  const [isOpen, setIsOpen] = createSignal(false);

  createEffect(() => {
    if (!isOpen()) return;
    // Popover content mounts lazily; focus on the next microtask.
    queueMicrotask(() => newListTitleEl?.focus());
  });

  const onCreateList = async (e: Event) => {
    e.preventDefault();
    const title = newListTitleEl.value.trim();
    const description = newListDescEl.value.trim();
    if (!title) return;
    await pb.createList({ title, description });
    newListTitleEl.value = "";
    newListDescEl.value = "";
    setIsOpen(false);
  };

  return (
    <Popover.Root
      open={isOpen()}
      onOpenChange={(details: any) => setIsOpen(!!details?.open)}
    >
      <Popover.Trigger
        asChild={(triggerProps) => (
          props.iconOnly ? (
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Add list"
              title="Add list"
              {...triggerProps}
            >
              <PlusIcon />
            </IconButton>
          ) : (
            <Button size="sm" variant="outline" {...triggerProps}>
              <HStack gap="2" alignItems="center">
                <PlusIcon />
                <Box>Add list</Box>
              </HStack>
            </Button>
          )
        )}
      />
      <Popover.Positioner>
        <Popover.Content
          class={css({
            width: "min(420px, calc(100vw - 32px))",
          })}
        >
          <Popover.Header>
            <Popover.Title>New list</Popover.Title>
            <Popover.Description>Add a column to organize items.</Popover.Description>
          </Popover.Header>

          <Popover.Body>
            <form onSubmit={onCreateList}>
              <VStack alignItems="stretch" gap="3">
                <Input
                  ref={newListTitleEl}
                  placeholder="List title (e.g. Doing)"
                />
                <Textarea
                  ref={newListDescEl}
                  placeholder="Description (optional)"
                  class={css({ minH: "80px" })}
                />
                <HStack justify="flex-end" gap="2">
                  <Popover.CloseTrigger
                    asChild={(closeProps) => (
                      <Button size="sm" variant="outline" {...closeProps}>
                        Cancel
                      </Button>
                    )}
                  />
                  <Button size="sm" type="submit" variant="solid">
                    Add list
                  </Button>
                </HStack>
              </VStack>
            </form>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
};


