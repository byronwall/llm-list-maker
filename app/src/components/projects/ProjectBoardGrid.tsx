import { useProjectBoard } from "./project-board-context";
import { Box } from "styled-system/jsx";
import { For, Show } from "solid-js";
import { boardGridClass, loadingClass } from "./ProjectBoardGrid.styles";
import { ProjectBoardColumn } from "./ProjectBoardColumn";

export function ProjectBoardGrid(props: { when?: boolean }) {
  const pb = useProjectBoard();

  return (
    <Show when={props.when ?? true}>
      <Show
        when={pb.board()}
        fallback={<Box class={loadingClass}>Loading…</Box>}
      >
      <Box class={boardGridClass}>
        <For each={pb.orderedColumns()}>
          {(col) => <ProjectBoardColumn col={col} />}
        </For>
      </Box>
    </Show>
    </Show>
  );
}
