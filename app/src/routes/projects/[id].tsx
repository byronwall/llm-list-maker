import { createAsync, useAction, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { css } from "styled-system/css";
import { Box, Container, Grid, HStack, Stack, VStack } from "styled-system/jsx";

import { Button } from "~/components/ui/button";
import * as Card from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Link } from "~/components/ui/link";

import type { Feature, FeatureStatus, Phase } from "~/lib/domain";
import { addJourneyStep, addUIArea, createFeature, deleteFeature, updateFeature } from "~/server/actions";
import { getProjectBoard } from "~/server/queries";

const PHASES: Phase[] = ["MVP", "V1", "Later"];
const STATUSES: FeatureStatus[] = ["proposed", "accepted", "in_progress", "done", "cut"];

export default function ProjectRoute() {
  const params = useParams();
  const projectId = () => params.id;

  const board = createAsync(() => getProjectBoard(projectId()));

  const runAddJourneyStep = useAction(addJourneyStep);
  const runAddUIArea = useAction(addUIArea);
  const runCreateFeature = useAction(createFeature);
  const runUpdateFeature = useAction(updateFeature);
  const runDeleteFeature = useAction(deleteFeature);

  let newStepEl!: HTMLInputElement;
  let newAreaEl!: HTMLInputElement;

  let featureTitleEl!: HTMLInputElement;
  let featureDescEl!: HTMLTextAreaElement;

  const onAddStep = async (e: Event) => {
    e.preventDefault();
    const name = newStepEl.value.trim();
    if (!name) return;
    await runAddJourneyStep({ projectId: projectId(), name });
    newStepEl.value = "";
    window.location.reload();
  };

  const onAddArea = async (e: Event) => {
    e.preventDefault();
    const name = newAreaEl.value.trim();
    if (!name) return;
    await runAddUIArea({ projectId: projectId(), name });
    newAreaEl.value = "";
    window.location.reload();
  };

  const onCreateFeature = async (e: Event) => {
    e.preventDefault();
    const title = featureTitleEl.value.trim();
    const description = featureDescEl.value.trim();
    if (!title) return;

    await runCreateFeature({
      projectId: projectId(),
      title,
      description,
      journeyStepId: null,
      uiAreaId: null,
      phase: "MVP",
      status: "proposed",
    });

    featureTitleEl.value = "";
    featureDescEl.value = "";
    window.location.reload();
  };

  const onUpdateFeature = async (featureId: string, patch: Partial<Feature>) => {
    await runUpdateFeature({ projectId: projectId(), featureId, patch });
    window.location.reload();
  };

  const onDelete = async (featureId: string) => {
    await runDeleteFeature({ projectId: projectId(), featureId });
    window.location.reload();
  };

  return (
    <Container py="8" maxW="7xl">
      <VStack alignItems="stretch" gap="6">
        <HStack justify="space-between" align="flex-start">
          <Stack gap="1">
            <Box class={css({ fontSize: "xl", fontWeight: "semibold" })}>
              <Show when={board()} fallback="Loading…">
                {board()!.project.name}
              </Show>
            </Box>
            <HStack gap="3">
              <Link href="/">← Projects</Link>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </HStack>
          </Stack>
        </HStack>

        <Show when={board()}>
          {(b) => (
            <>
              <Card.Root>
                <Card.Header>
                  <Card.Title>Idea</Card.Title>
                  <Card.Description>Raw input saved with the project.</Card.Description>
                </Card.Header>
                <Card.Body>
                  <Box class={css({ whiteSpace: "pre-wrap", color: b().project.ideaRaw ? "fg.default" : "fg.muted" })}>
                    {b().project.ideaRaw || "No idea text yet."}
                  </Box>
                </Card.Body>
              </Card.Root>

              <Grid columns={{ base: 1, md: 2 }} gap="4">
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Add journey step</Card.Title>
                    <Card.Description>Rows on the board.</Card.Description>
                  </Card.Header>
                  <Card.Body>
                    <form onSubmit={onAddStep}>
                      <HStack>
                        <Input ref={newStepEl} placeholder="e.g. Checkout" />
                        <Button type="submit">Add</Button>
                      </HStack>
                    </form>
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header>
                    <Card.Title>Add UI area</Card.Title>
                    <Card.Description>Columns on the board.</Card.Description>
                  </Card.Header>
                  <Card.Body>
                    <form onSubmit={onAddArea}>
                      <HStack>
                        <Input ref={newAreaEl} placeholder="e.g. Billing" />
                        <Button type="submit">Add</Button>
                      </HStack>
                    </form>
                  </Card.Body>
                </Card.Root>
              </Grid>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Create feature</Card.Title>
                  <Card.Description>A basic card you can later move around.</Card.Description>
                </Card.Header>
                <Card.Body>
                  <form onSubmit={onCreateFeature}>
                    <VStack alignItems="stretch" gap="3">
                      <Input ref={featureTitleEl} placeholder="Feature title" />
                      <Textarea ref={featureDescEl} placeholder="Short description" class={css({ minH: "90px" })} />
                      <HStack justify="flex-end">
                        <Button type="submit">Create feature</Button>
                      </HStack>
                    </VStack>
                  </form>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Scope Board</Card.Title>
                  <Card.Description>
                    Columns = UI Areas. Rows = Journey Steps. (MVP: use dropdowns to move features.)
                  </Card.Description>
                </Card.Header>
                <Card.Body>
                  <ScopeBoard
                    journeySteps={b().journeySteps}
                    uiAreas={b().uiAreas}
                    features={b().features}
                    onUpdate={onUpdateFeature}
                    onDelete={onDelete}
                  />
                </Card.Body>
              </Card.Root>
            </>
          )}
        </Show>
      </VStack>
    </Container>
  );
}

function ScopeBoard(props: {
  journeySteps: { id: string; name: string }[];
  uiAreas: { id: string; name: string }[];
  features: Feature[];
  onUpdate: (featureId: string, patch: Partial<Feature>) => Promise<void>;
  onDelete: (featureId: string) => Promise<void>;
}) {
  const allRows = () => [{ id: "unassigned", name: "Unassigned" }, ...props.journeySteps];
  const allCols = () => [{ id: "unassigned", name: "Unassigned" }, ...props.uiAreas];

  const featuresForCell = (rowId: string, colId: string) => {
    const journeyStepId = rowId === "unassigned" ? null : rowId;
    const uiAreaId = colId === "unassigned" ? null : colId;
    return props.features.filter((f) => f.journeyStepId === journeyStepId && f.uiAreaId === uiAreaId);
  };

  return (
    <Box class={css({ overflowX: "auto" })}>
      <Box
        class={css({
          minW: "900px",
          display: "grid",
          gridTemplateColumns: `220px repeat(${allCols().length}, minmax(240px, 1fr))`,
          gap: "2",
          alignItems: "stretch",
        })}
      >
        <Box />
        <For each={allCols()}>
          {(col) => (
            <Box
              class={css({
                borderWidth: "1px",
                borderColor: "border",
                rounded: "md",
                px: "3",
                py: "2",
                fontWeight: "semibold",
                bg: "bg.subtle",
              })}
            >
              {col.name}
            </Box>
          )}
        </For>

        <For each={allRows()}>
          {(row) => (
            <>
              <Box
                class={css({
                  borderWidth: "1px",
                  borderColor: "border",
                  rounded: "md",
                  px: "3",
                  py: "2",
                  fontWeight: "semibold",
                  bg: "bg.subtle",
                })}
              >
                {row.name}
              </Box>
              <For each={allCols()}>
                {(col) => (
                  <Box
                    class={css({
                      borderWidth: "1px",
                      borderColor: "border",
                      rounded: "md",
                      p: "2",
                      minH: "120px",
                      bg: "bg.default",
                    })}
                  >
                    <VStack alignItems="stretch" gap="2">
                      <For each={featuresForCell(row.id, col.id)}>
                        {(f) => <FeatureCard feature={f} rows={props.journeySteps} cols={props.uiAreas} onUpdate={props.onUpdate} onDelete={props.onDelete} />}
                      </For>
                    </VStack>
                  </Box>
                )}
              </For>
            </>
          )}
        </For>
      </Box>
    </Box>
  );
}

function FeatureCard(props: {
  feature: Feature;
  rows: { id: string; name: string }[];
  cols: { id: string; name: string }[];
  onUpdate: (featureId: string, patch: Partial<Feature>) => Promise<void>;
  onDelete: (featureId: string) => Promise<void>;
}) {
  const f = () => props.feature;

  return (
    <Box
      class={css({
        borderWidth: "1px",
        borderColor: "border",
        rounded: "md",
        p: "3",
        display: "grid",
        gap: "2",
      })}
    >
      <Box class={css({ fontWeight: "semibold" })}>{f().title}</Box>
      <Show when={f().description}>
        <Box class={css({ fontSize: "sm", color: "fg.muted", whiteSpace: "pre-wrap" })}>{f().description}</Box>
      </Show>

      <Grid columns={2} gap="2" class={css({ pt: "1" })}>
        <label class={css({ display: "grid", gap: "1" })}>
          <Box class={css({ fontSize: "xs", color: "fg.muted" })}>Journey</Box>
          <select
            class={css({
              borderWidth: "1px",
              borderColor: "border",
              rounded: "sm",
              px: "2",
              py: "1",
              bg: "bg.default",
              fontSize: "sm",
            })}
            value={f().journeyStepId ?? ""}
            onChange={(e) => props.onUpdate(f().id, { journeyStepId: e.currentTarget.value || null })}
          >
            <option value="">Unassigned</option>
            <For each={props.rows}>{(r) => <option value={r.id}>{r.name}</option>}</For>
          </select>
        </label>

        <label class={css({ display: "grid", gap: "1" })}>
          <Box class={css({ fontSize: "xs", color: "fg.muted" })}>UI Area</Box>
          <select
            class={css({
              borderWidth: "1px",
              borderColor: "border",
              rounded: "sm",
              px: "2",
              py: "1",
              bg: "bg.default",
              fontSize: "sm",
            })}
            value={f().uiAreaId ?? ""}
            onChange={(e) => props.onUpdate(f().id, { uiAreaId: e.currentTarget.value || null })}
          >
            <option value="">Unassigned</option>
            <For each={props.cols}>{(c) => <option value={c.id}>{c.name}</option>}</For>
          </select>
        </label>

        <label class={css({ display: "grid", gap: "1" })}>
          <Box class={css({ fontSize: "xs", color: "fg.muted" })}>Phase</Box>
          <select
            class={css({
              borderWidth: "1px",
              borderColor: "border",
              rounded: "sm",
              px: "2",
              py: "1",
              bg: "bg.default",
              fontSize: "sm",
            })}
            value={f().phase}
            onChange={(e) => props.onUpdate(f().id, { phase: e.currentTarget.value as Phase })}
          >
            <For each={PHASES}>{(p) => <option value={p}>{p}</option>}</For>
          </select>
        </label>

        <label class={css({ display: "grid", gap: "1" })}>
          <Box class={css({ fontSize: "xs", color: "fg.muted" })}>Status</Box>
          <select
            class={css({
              borderWidth: "1px",
              borderColor: "border",
              rounded: "sm",
              px: "2",
              py: "1",
              bg: "bg.default",
              fontSize: "sm",
            })}
            value={f().status}
            onChange={(e) => props.onUpdate(f().id, { status: e.currentTarget.value as FeatureStatus })}
          >
            <For each={STATUSES}>{(s) => <option value={s}>{s.replaceAll("_", " ")}</option>}</For>
          </select>
        </label>
      </Grid>

      <HStack justify="space-between" class={css({ pt: "2" })}>
        <Box class={css({ fontSize: "xs", color: "fg.muted" })}>
          Updated {new Date(f().updatedAt).toLocaleString()}
        </Box>
        <Button variant="outline" size="xs" onClick={() => props.onDelete(f().id)}>
          Delete
        </Button>
      </HStack>
    </Box>
  );
}


