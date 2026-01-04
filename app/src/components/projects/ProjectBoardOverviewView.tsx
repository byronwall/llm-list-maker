import { Show, createEffect, onCleanup, onMount } from "solid-js";
import { css } from "styled-system/css";
import { Box, HStack, Stack, VStack } from "styled-system/jsx";
import { useProjectBoard } from "./project-board-context";
import type { createProjectBoardUrlState } from "./project-board-url-state";
import { createListIndexEntries } from "./project-board-list-model";
import { ProjectBoardListMenu } from "./ProjectBoardListMenu";
import { ProjectBoardQuickAddItem } from "./ProjectBoardQuickAddItem";

type UrlState = ReturnType<typeof createProjectBoardUrlState>;

export function ProjectBoardOverviewView(props: { when: boolean; url: UrlState }) {
  const pb = useProjectBoard();
  const { entries } = createListIndexEntries({
    pb,
    q: () => props.url.q(),
    sort: () => props.url.sort(),
  });

  const scrollKey = () => `pb:overview:scroll:${props.url.projectId()}`;

  onMount(() => {
    if (typeof window === "undefined") return;
    if (!props.when) return;
    try {
      const raw = sessionStorage.getItem(scrollKey());
      const y = raw ? Number(raw) : NaN;
      if (Number.isFinite(y)) queueMicrotask(() => window.scrollTo(0, y));
    } catch {}
  });

  createEffect(() => {
    if (typeof window === "undefined") return;
    if (!props.when) return;
    const onScroll = () => {
      try {
        sessionStorage.setItem(scrollKey(), String(window.scrollY || 0));
      } catch {}
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", onScroll));
  });

  return (
    <Show when={props.when}>
      <Show
        when={pb.board()}
        fallback={<Box class={css({ color: "fg.muted" })}>Loading…</Box>}
      >
        <Box
          class={css({
            display: "grid",
            gridTemplateColumns: {
              base: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
              xl: "repeat(3, minmax(0, 1fr))",
            },
            gap: "3",
            alignItems: "start",
            pb: "2",
          })}
        >
          <Show
            when={entries().length > 0}
            fallback={
              <Box
                class={css({
                  borderWidth: "1px",
                  borderColor: "border",
                  rounded: "xl",
                  bg: "bg.default",
                  p: "6",
                  gridColumn: "1 / -1",
                })}
              >
                <Stack gap="2">
                  <Box class={css({ fontWeight: "semibold", fontSize: "lg" })}>
                    Create your first list
                  </Box>
                  <Box class={css({ color: "fg.muted" })}>
                    Use “Add list” above to start organizing items.
                  </Box>
                </Stack>
              </Box>
            }
          >
            {entries().map((e) => {
              const items = () => pb.itemsByListId().get(e.key) ?? [];
              return (
                <Box
                  onClick={() => props.url.openSplitFor(e.key)}
                  class={css({
                    borderWidth: "1px",
                    borderColor: "border",
                    rounded: "xl",
                    bg: "bg.default",
                    overflow: "hidden",
                    cursor: "pointer",
                    transitionProperty: "transform, box-shadow, border-color",
                    transitionDuration: "150ms",
                    _hover: { transform: "translateY(-1px)", boxShadow: "md", borderColor: "border.emphasized" },
                    _focusVisible: {
                      outline: "2px solid",
                      outlineColor: "colorPalette.solid",
                      outlineOffset: "2px",
                    },
                  })}
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key !== "Enter") return;
                    props.url.openSplitFor(e.key);
                  }}
                >
                  <VStack alignItems="stretch" gap="3" class={css({ p: "4" })}>
                    <HStack justify="space-between" gap="3" alignItems="flex-start">
                      <Stack gap="1" minW="0">
                        <Box
                          class={css({
                            fontWeight: "semibold",
                            fontSize: "md",
                            minW: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          })}
                        >
                          {e.title || "Untitled list"}
                        </Box>
                        <HStack gap="2" flexWrap="wrap" class={css({ fontSize: "xs", color: "fg.muted" })}>
                          <Box>{e.itemCount} items</Box>
                          <Box>•</Box>
                          <Box>Updated {new Date(e.updatedAt).toLocaleDateString()}</Box>
                        </HStack>
                      </Stack>

                      <HStack gap="1" onClick={(ev) => ev.stopPropagation()}>
                        <ProjectBoardQuickAddItem
                          listId={e.key === "LOOSE" ? null : e.key}
                          size="xs"
                          label="Add"
                        />
                        <ProjectBoardListMenu
                          listId={e.listId}
                          listKey={e.key}
                          title={e.title}
                          description={e.description}
                          items={items()}
                          onRename={() => {
                            if (e.list) pb.startEditList(e.list);
                          }}
                        />
                      </HStack>
                    </HStack>

                    <Box
                      class={css({
                        display: "grid",
                        gap: "1.5",
                        minH: "68px",
                      })}
                    >
                      <Show
                        when={items().length > 0}
                        fallback={<Box class={css({ color: "fg.muted", fontSize: "sm" })}>No items yet.</Box>}
                      >
                        {items()
                          .slice(0, 4)
                          .map((it) => (
                            <Box
                              class={css({
                                fontSize: "sm",
                                color: "fg.default",
                                lineClamp: "1",
                              })}
                            >
                              {it.label}
                            </Box>
                          ))}
                        <Show when={items().length > 4}>
                          <Box class={css({ fontSize: "sm", color: "fg.muted" })}>
                            +{items().length - 4} more
                          </Box>
                        </Show>
                      </Show>
                    </Box>
                  </VStack>
                </Box>
              );
            })}
          </Show>
        </Box>
      </Show>
    </Show>
  );
}


