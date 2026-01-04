import { useProjectBoard } from "./project-board-context";
import { Box } from "styled-system/jsx";
import { For, Show, createMemo } from "solid-js";
import { boardGridClass, loadingClass } from "./ProjectBoardGrid.styles";
import { ProjectBoardColumn } from "./ProjectBoardColumn";
import { createProjectBoardUrlState } from "./project-board-url-state";
import { createListIndexEntries } from "./project-board-list-model";

export function ProjectBoardGrid() {
  const pb = useProjectBoard();
  const url = createProjectBoardUrlState(pb.projectId);

  const { entries } = createListIndexEntries({
    pb,
    q: () => url.q(),
    sort: () => url.sort(),
    dir: () => url.dir(),
  });

  const sortedCols = createMemo(() =>
    entries().map((e) => ({
      key: e.key,
      listId: e.listId,
      title: e.title,
      description: e.description,
    }))
  );

  return (
    <Show
      when={pb.board()}
      fallback={<Box class={loadingClass}>Loading…</Box>}
    >
      <Box class={boardGridClass}>
        <For each={sortedCols()}>{(col) => <ProjectBoardColumn col={col} />}</For>
      </Box>
    </Show>
  );
}
