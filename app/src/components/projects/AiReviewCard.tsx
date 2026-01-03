import * as Card from "~/components/ui/card";
import { Box, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { For, Show } from "solid-js";
import { useProjectBoard } from "./project-board-context";

export function AiReviewCard(props: {
  compactCardHeaderClass: string;
  compactCardBodyClass: string;
}) {
  const pb = useProjectBoard();

  return (
    <Show when={pb.reviewCommentary() || pb.reviewQuestions().length > 0}>
      <Card.Root>
        <Card.Header class={props.compactCardHeaderClass}>
          <Card.Title>AI review</Card.Title>
          <Card.Description>
            Commentary + questions about your current board.
          </Card.Description>
        </Card.Header>
        <Card.Body class={props.compactCardBodyClass}>
          <VStack alignItems="stretch" gap="3">
            <Show when={pb.reviewCommentary()}>
              <Box class={css({ whiteSpace: "pre-wrap" })}>
                {pb.reviewCommentary()!}
              </Box>
            </Show>
            <Show when={pb.reviewQuestions().length > 0}>
              <VStack alignItems="stretch" gap="2">
                <For each={pb.reviewQuestions()}>
                  {(q) => <Box class={css({ color: "fg.muted" })}>- {q}</Box>}
                </For>
              </VStack>
            </Show>
          </VStack>
        </Card.Body>
      </Card.Root>
    </Show>
  );
}


