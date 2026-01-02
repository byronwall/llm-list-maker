import { createAsync, useAction } from "@solidjs/router";
import { For, Show } from "solid-js";
import { css } from "styled-system/css";
import { Box, Container, HStack, Stack, VStack } from "styled-system/jsx";

import { Button } from "~/components/ui/button";
import * as Card from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Link } from "~/components/ui/link";

import { createProject } from "~/server/actions";
import { listProjects } from "~/server/queries";

export default function HomeRoute() {
  const projects = createAsync(() => listProjects());
  const runCreateProject = useAction(createProject);

  let nameEl!: HTMLInputElement;
  let ideaEl!: HTMLTextAreaElement;

  const onCreate = async (e: Event) => {
    e.preventDefault();
    const name = nameEl.value.trim();
    const ideaRaw = ideaEl.value.trim();
    if (!name) return;

    const project = await runCreateProject({ name, ideaRaw });
    nameEl.value = "";
    ideaEl.value = "";

    window.location.href = `/projects/${project.id}`;
  };

  return (
    <Container py="10" maxW="4xl">
      <VStack alignItems="stretch" gap="8">
        <Stack gap="2">
          <Box class={css({ fontSize: "2xl", fontWeight: "semibold" })}>
            Prod Ideator
          </Box>
          <Box class={css({ color: "fg.muted" })}>
            Create a project, capture the idea, and organize scope on a simple
            board.
          </Box>
        </Stack>

        <Card.Root>
          <Card.Header>
            <Card.Title>Create project</Card.Title>
            <Card.Description>
              Basic local JSON persistence (no real DB yet).
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <form onSubmit={onCreate}>
              <VStack alignItems="stretch" gap="4">
                <label class={css({ display: "grid", gap: "2" })}>
                  <Box class={css({ fontSize: "sm", color: "fg.muted" })}>
                    Name
                  </Box>
                  <Input
                    ref={nameEl}
                    placeholder="e.g. Acme Onboarding Assistant"
                  />
                </label>
                <label class={css({ display: "grid", gap: "2" })}>
                  <Box class={css({ fontSize: "sm", color: "fg.muted" })}>
                    Idea (raw)
                  </Box>
                  <Textarea
                    ref={ideaEl}
                    placeholder="Dump the idea / context here..."
                    class={css({ minH: "120px" })}
                  />
                </label>
                <HStack justify="flex-end">
                  <Button type="submit" variant="solid">
                    Create
                  </Button>
                </HStack>
              </VStack>
            </form>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title>Projects</Card.Title>
            <Card.Description>Your locally saved projects.</Card.Description>
          </Card.Header>
          <Card.Body>
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
                <VStack alignItems="stretch" gap="2">
                  <For each={projects() ?? []}>
                    {(p) => (
                      <HStack
                        justify="space-between"
                        class={css({
                          borderWidth: "1px",
                          borderColor: "border",
                          rounded: "md",
                          px: "3",
                          py: "2",
                        })}
                      >
                        <Box>
                          <Box class={css({ fontWeight: "semibold" })}>
                            {p.name}
                          </Box>
                          <Box
                            class={css({ fontSize: "sm", color: "fg.muted" })}
                          >
                            Updated {new Date(p.updatedAt).toLocaleString()}
                          </Box>
                        </Box>
                        <Link href={`/projects/${p.id}`}>Open</Link>
                      </HStack>
                    )}
                  </For>
                </VStack>
              </Show>
            </Show>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  );
}
