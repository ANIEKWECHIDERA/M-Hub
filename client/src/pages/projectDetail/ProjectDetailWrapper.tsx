import { useParams } from "react-router-dom";
import { TaskContextProvider } from "@/context/TaskContext";
import { ProjectDetail } from "./ProjectDetail";
import { CommentContextProvider } from "@/context/CommentContext";

const ProjectDetailWrapper = () => {
  const { id } = useParams();

  if (!id) return <div>Project ID is missing</div>;

  return (
    <TaskContextProvider projectId={id}>
      <CommentContextProvider projectId={id}>
        <ProjectDetail />
      </CommentContextProvider>
    </TaskContextProvider>
  );
};

export default ProjectDetailWrapper;
