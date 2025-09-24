import { useParams } from "react-router-dom";
import { TaskContextProvider } from "@/context/TaskContext";
import ProjectDetail from "./ProjectDetail";

const ProjectDetailWrapper = () => {
  const { id } = useParams();

  if (!id) return <div>Project ID is missing</div>;

  return (
    <TaskContextProvider projectId={Number(id)}>
      <ProjectDetail />
    </TaskContextProvider>
  );
};

export default ProjectDetailWrapper;
