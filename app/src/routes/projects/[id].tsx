import { useParams } from "@solidjs/router";
import { ProjectBoardPage } from "~/components/projects/ProjectBoardPage";

export default function ProjectRoute() {
  const params = useParams();
  return <ProjectBoardPage projectId={params.id!} />;
}
