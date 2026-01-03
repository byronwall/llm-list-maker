import { Container, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { ProjectBoardProvider } from "./project-board-context";
import { createProjectBoardController } from "./createProjectBoardController";
import { ProjectBoardHeader } from "./ProjectBoardHeader";
import { AiHelpDialog } from "./AiHelpDialog";
import { AiReviewCard } from "./AiReviewCard";
import { ProjectBoardGrid } from "./ProjectBoardGrid";

export function ProjectBoardPage(props: { projectId: string }) {
  const projectId = () => props.projectId;
  const controller = createProjectBoardController(projectId);

  const compactCardHeaderClass = css({ p: "4", gap: "1" });
  const compactCardBodyClass = css({ px: "4", pb: "4" });

  return (
    <ProjectBoardProvider value={controller}>
      <Container py="8" maxW="6xl">
        <VStack alignItems="stretch" gap="5">
          <ProjectBoardHeader />
          <AiHelpDialog />
          <AiReviewCard
            compactCardHeaderClass={compactCardHeaderClass}
            compactCardBodyClass={compactCardBodyClass}
          />
          <ProjectBoardGrid />
        </VStack>
      </Container>
    </ProjectBoardProvider>
  );
}


