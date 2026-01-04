import { createAsync, useAction } from "@solidjs/router";
import { createEffect, createSignal, For, Show } from "solid-js";
import { css } from "styled-system/css";
import { Box, Container, HStack, Stack, VStack } from "styled-system/jsx";
import { PlusIcon } from "lucide-solid";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Link } from "~/components/ui/link";
import * as Popover from "~/components/ui/popover";

import { createProject, importProjectJson } from "~/server/actions";
import { listProjectSummaries } from "~/server/queries";

export default function HomeRoute() {
  const projects = createAsync(() => listProjectSummaries());
  const runCreateProject = useAction(createProject);
  const runImportProjectJson = useAction(importProjectJson);

  let titleEl!: HTMLInputElement;
  let descEl!: HTMLTextAreaElement;
  let importEl!: HTMLInputElement;
  const [isCreateOpen, setIsCreateOpen] = createSignal(false);
  const [isDraggingImport, setIsDraggingImport] = createSignal(false);
  const [draggingJsonHint, setDraggingJsonHint] = createSignal(false);
  let dragDepth = 0;

  createEffect(() => {
    if (!isCreateOpen()) return;
    // Popover content mounts lazily; focus on the next microtask.
    queueMicrotask(() => titleEl?.focus());
  });

  const importFiles = async (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (!file) return;
    const jsonText = await file.text();
    const res = await runImportProjectJson({ jsonText });
    const ids = res?.importedProjectIds ?? [];
    if (ids.length === 1) {
      window.location.href = `/projects/${ids[0]}`;
    } else if (ids.length > 1) {
      window.location.reload();
    }
  };

  const onCreate = async (e: Event) => {
    e.preventDefault();
    const title = titleEl.value.trim();
    const description = descEl.value.trim();
    if (!title) return;

    const project = await runCreateProject({ title, description });
    titleEl.value = "";
    descEl.value = "";
    setIsCreateOpen(false);

    window.location.href = `/projects/${project.id}`;
  };

  const isFileDrag = (dt: DataTransfer | null | undefined) =>
    !!dt?.types && Array.from(dt.types).includes("Files");

  const hasJsonDragHint = (dt: DataTransfer | null | undefined) => {
    const items = dt?.items;
    if (!items?.length) return false;
    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue;
      const t = item.type || "";
      if (t === "application/json" || t.endsWith("+json")) return true;
    }
    return false;
  };

  return (
    <Box
      class={css({
        minH: "dvh",
        bg: isDraggingImport() ? "bg.muted" : "transparent",
        transition: "background-color 120ms ease",
      })}
      onDragEnter={(e) => {
        if (!isFileDrag(e.dataTransfer)) return;
        e.preventDefault();
        dragDepth += 1;
        setDraggingJsonHint(hasJsonDragHint(e.dataTransfer));
        setIsDraggingImport(true);
      }}
      onDragOver={(e) => {
        if (!isFileDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.dataTransfer!.dropEffect = "copy";
        setDraggingJsonHint(hasJsonDragHint(e.dataTransfer));
        setIsDraggingImport(true);
      }}
      onDragLeave={(e) => {
        if (!isDraggingImport()) return;
        e.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) {
          setIsDraggingImport(false);
          setDraggingJsonHint(false);
        }
      }}
      onDrop={(e) => {
        if (!isFileDrag(e.dataTransfer) && !isDraggingImport()) return;
        e.preventDefault();
        dragDepth = 0;
        setIsDraggingImport(false);
        setDraggingJsonHint(false);
        void importFiles(e.dataTransfer?.files);
      }}
    >
      <Show when={isDraggingImport()}>
        <Box
          class={css({
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            zIndex: "overlay",
          })}
        >
          <Box
            class={css({
              bg: "bg.default",
              borderWidth: "1px",
              borderColor: "border",
              borderRadius: "xl",
              boxShadow: "lg",
              px: "5",
              py: "4",
              maxW: "min(560px, calc(100vw - 32px))",
              textAlign: "center",
            })}
          >
            <Stack gap="1">
              <Box class={css({ fontWeight: "semibold", fontSize: "lg" })}>
                Drop to import a project JSON
              </Box>
              <Box class={css({ fontSize: "sm", color: "fg.muted" })}>
                {draggingJsonHint()
                  ? "We’ll import it and open the project."
                  : "Drop a .json file (project export or legacy db)."}
              </Box>
            </Stack>
          </Box>
        </Box>
      </Show>

      <Container py="10" maxW="4xl">
        <VStack alignItems="stretch" gap="8">
          <HStack justify="space-between" gap="6" alignItems="flex-start">
            <Stack gap="2">
              <Box class={css({ fontSize: "2xl", fontWeight: "semibold" })}>
                Project Lists
              </Box>
              <Box class={css({ color: "fg.muted" })}>
                Create a project and organize items across lists (drag and
                drop).
              </Box>
            </Stack>

            <input
              ref={importEl}
              type="file"
              accept="application/json,.json"
              class={css({ display: "none" })}
              onChange={(e) => void importFiles(e.currentTarget.files)}
            />

            <HStack gap="2" flexWrap="wrap" justify="flex-end">
              <Button variant="outline" onClick={() => importEl?.click()}>
                Import JSON
              </Button>

              <Popover.Root
                open={isCreateOpen()}
                onOpenChange={(details: any) =>
                  setIsCreateOpen(!!details?.open)
                }
              >
                <Popover.Trigger
                  asChild={(triggerProps) => (
                    <Button variant="solid" {...triggerProps}>
                      <HStack gap="2" alignItems="center">
                        <PlusIcon />
                        <Box>New project</Box>
                      </HStack>
                    </Button>
                  )}
                />
                <Popover.Positioner>
                  <Popover.Content
                    class={css({
                      width: "min(480px, calc(100vw - 32px))",
                    })}
                  >
                    <Popover.Header>
                      <Popover.Title>Create project</Popover.Title>
                      <Popover.Description>
                        Basic local JSON persistence (no real DB yet).
                      </Popover.Description>
                    </Popover.Header>

                    <Popover.Body>
                      <form onSubmit={onCreate}>
                        <VStack alignItems="stretch" gap="3">
                          <label class={css({ display: "grid", gap: "2" })}>
                            <Box
                              class={css({ fontSize: "sm", color: "fg.muted" })}
                            >
                              Title
                            </Box>
                            <Input
                              ref={titleEl}
                              placeholder="e.g. Home renovation"
                            />
                          </label>
                          <label class={css({ display: "grid", gap: "2" })}>
                            <Box
                              class={css({ fontSize: "sm", color: "fg.muted" })}
                            >
                              Description
                            </Box>
                            <Textarea
                              ref={descEl}
                              placeholder="What is this project for?"
                              class={css({ minH: "100px" })}
                            />
                          </label>
                          <HStack justify="flex-end" gap="2">
                            <Popover.CloseTrigger
                              asChild={(closeProps) => (
                                <Button variant="outline" {...closeProps}>
                                  Cancel
                                </Button>
                              )}
                            />
                            <Button type="submit" variant="solid">
                              Create
                            </Button>
                          </HStack>
                        </VStack>
                      </form>
                    </Popover.Body>
                  </Popover.Content>
                </Popover.Positioner>
              </Popover.Root>
            </HStack>
          </HStack>

          <Show
            when={projects()}
            fallback={<Box class={css({ color: "fg.muted" })}>Loading…</Box>}
          >
            <Show
              when={(projects() ?? []).length > 0}
              fallback={
                <Box class={css({ color: "fg.muted" })}>No projects yet.</Box>
              }
            >
              <VStack
                alignItems="stretch"
                gap="0"
                class={css({
                  borderTopWidth: "1px",
                  borderTopColor: "border",
                })}
              >
                <For each={projects() ?? []}>
                  {(p) => (
                    <Link
                      href={`/projects/${p.id}`}
                      class={css({
                        display: "block",
                        textDecoration: "none",
                        color: "inherit",
                        px: "2",
                        py: "3",
                        borderBottomWidth: "1px",
                        borderBottomColor: "border",
                        _hover: { bg: "bg.muted" },
                        _focusVisible: {
                          outline: "2px solid",
                          outlineColor: "colorPalette.solid",
                          outlineOffset: "2px",
                        },
                      })}
                    >
                      <Stack gap="1">
                        <HStack
                          justify="space-between"
                          gap="4"
                          alignItems="flex-start"
                        >
                          <Box
                            class={css({
                              fontWeight: "semibold",
                              minW: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            })}
                          >
                            {p.title}
                          </Box>
                          <Box
                            class={css({
                              fontSize: "xs",
                              color: "fg.muted",
                              whiteSpace: "nowrap",
                            })}
                          >
                            Updated {new Date(p.updatedAt).toLocaleDateString()}
                          </Box>
                        </HStack>

                        <Show when={p.description?.trim()}>
                          <Box
                            class={css({
                              fontSize: "sm",
                              color: "fg.muted",
                            })}
                          >
                            {p.description}
                          </Box>
                        </Show>

                        <Box class={css({ fontSize: "sm", color: "fg.muted" })}>
                          {p.listCount} {p.listCount === 1 ? "list" : "lists"} •{" "}
                          {p.itemCount} {p.itemCount === 1 ? "item" : "items"}
                        </Box>
                      </Stack>
                    </Link>
                  )}
                </For>
              </VStack>
            </Show>
          </Show>
        </VStack>
      </Container>
    </Box>
  );
}
