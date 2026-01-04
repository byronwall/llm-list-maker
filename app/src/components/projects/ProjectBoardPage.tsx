import { Container, HStack, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { ProjectBoardProvider } from "./project-board-context";
import { createProjectBoardController } from "./createProjectBoardController";
import { ProjectBoardHeader } from "./ProjectBoardHeader";
import { AiHelpDialog } from "./AiHelpDialog";
import { AiReviewCard } from "./AiReviewCard";
import { ProjectBoardGrid } from "./ProjectBoardGrid";
import { createProjectBoardUrlState } from "./project-board-url-state";
import { ProjectBoardViewToggle } from "./ProjectBoardViewToggle";
import { ProjectBoardViewControls } from "./ProjectBoardViewControls";
import { ProjectBoardSplitView } from "./ProjectBoardSplitView";
import { ProjectBoardOverviewView } from "./ProjectBoardOverviewView";
import { ProjectBoardTableView } from "./ProjectBoardTableView";
import { Show } from "solid-js";

export function ProjectBoardPage(props: { projectId: string }) {
  const projectId = () => props.projectId;
  const controller = createProjectBoardController(projectId);
  const url = createProjectBoardUrlState(projectId);

  const compactCardHeaderClass = css({ p: "4", gap: "1" });
  const compactCardBodyClass = css({ px: "4", pb: "4" });

  return (
    <ProjectBoardProvider value={controller}>
      <Container py="8" maxW="6xl">
        <VStack alignItems="stretch" gap="5">
          <ProjectBoardHeader />
          <HStack
            gap="3"
            flexWrap="wrap"
            alignItems="center"
            justify="space-between"
          >
            <ProjectBoardViewToggle
              value={url.view()}
              onChange={(v) => url.setView(v)}
            />
            <Show when={url.view() !== "split"}>
              <ProjectBoardViewControls
                compact
                q={url.q()}
                setQ={url.setQ}
                sort={url.sort()}
                setSort={url.setSort}
              />
            </Show>
          </HStack>
          <AiHelpDialog />
          <AiReviewCard
            compactCardHeaderClass={compactCardHeaderClass}
            compactCardBodyClass={compactCardBodyClass}
          />
          <VStack alignItems="stretch" gap="4">
            <ProjectBoardSplitView url={url} when={url.view() === "split"} />
            <ProjectBoardOverviewView
              url={url}
              when={url.view() === "overview"}
            />
            <ProjectBoardTableView url={url} when={url.view() === "table"} />
            <Show when={url.view() === "board"}>
              <ProjectBoardGrid />
            </Show>
          </VStack>
        </VStack>
      </Container>
    </ProjectBoardProvider>
  );
}
