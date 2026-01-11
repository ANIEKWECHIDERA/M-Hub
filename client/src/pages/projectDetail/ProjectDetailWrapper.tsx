import { useParams } from "react-router-dom";
import { TaskContextProvider } from "@/context/TaskContext";
import ProjectDetail from "./ProjectDetail";
import { CommentContextProvider } from "@/context/CommentContext";
import { useProjectContext } from "@/context/ProjectContext";

const ProjectDetailWrapper = () => {
  const { id } = useParams();
  const { projects } = useProjectContext();

  if (!id) return <div>Project ID is missing</div>;

  const project = projects.find((p) => p.id === id);
  if (!project) return <div>Project not found</div>;

  const projectId = project.id;

  return (
    <TaskContextProvider projectId={projectId}>
      <CommentContextProvider projectId={projectId}>
        <ProjectDetail />
      </CommentContextProvider>
    </TaskContextProvider>
  );
};

export default ProjectDetailWrapper;
