import { useProjectBoard } from "./project-board-context";
import { Box } from "styled-system/jsx";
import { For, Show } from "solid-js";
import { boardGridClass, loadingClass } from "./ProjectBoardGrid.styles";
import { ProjectBoardColumn } from "./ProjectBoardColumn";

export function ProjectBoardGrid() {
  const pb = useProjectBoard();

  return (
    <Show when={pb.board()} fallback={<Box class={loadingClass}>Loading…</Box>}>
      <Box class={boardGridClass}>
        <For each={pb.orderedColumns()}>
          {(col) => <ProjectBoardColumn col={col} />}
        </For>
      </Box>
    </Show>
  );
}
