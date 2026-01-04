import { createAsync, useParams } from "@solidjs/router";
import { Meta, Title } from "@solidjs/meta";
import { createMemo } from "solid-js";
import { ProjectBoardPage } from "~/components/projects/ProjectBoardPage";
import { formatPageTitle, SITE_DESCRIPTION } from "~/lib/site-meta";
import { getProjectBoard } from "~/server/queries";

export default function ProjectRoute() {
  const params = useParams();
  const projectId = () => params.id!;
  const board = createAsync(() => getProjectBoard(projectId()));

  const projectTitle = createMemo(() => board()?.project.title);
  const projectDescription = createMemo(() => {
    const d = board()?.project.description?.trim();
    return d || SITE_DESCRIPTION;
  });

  const fullTitle = createMemo(() =>
    formatPageTitle(projectTitle() ? projectTitle()! : "Project")
  );

  return (
    <>
      <Title>{fullTitle()}</Title>
      <Meta name="description" content={projectDescription()} />
      <Meta property="og:title" content={fullTitle()} />
      <Meta property="og:description" content={projectDescription()} />
      <Meta property="twitter:card" content="summary" />

      <ProjectBoardPage projectId={projectId()} />
    </>
  );
}
