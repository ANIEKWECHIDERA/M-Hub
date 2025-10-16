import { SettingsProvider } from "./SettingsContext.tsx";
import { ProjectContextProvider } from "./ProjectContext.tsx";
import { NoteContextProvider } from "./NoteContext.tsx";
import { AssetContextProvider } from "./AssetContext.tsx";
import { CommentContextProvider } from "./CommentContext.tsx";
import { TeamContextProvider } from "./TeamMemberContext.tsx";
import { TaskContextProvider } from "./TaskContext.tsx";
import { SubTasksContextProvider } from "./SubTasksContext.tsx";
import { NotificationProvider } from "./NotificationContext.tsx";

export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <SettingsProvider>
      <NotificationProvider>
        <TeamContextProvider>
          <ProjectContextProvider>
            <SubTasksContextProvider>
              <TaskContextProvider>
                <NoteContextProvider>
                  <AssetContextProvider>
                    <CommentContextProvider>{children}</CommentContextProvider>
                  </AssetContextProvider>
                </NoteContextProvider>
              </TaskContextProvider>
            </SubTasksContextProvider>
          </ProjectContextProvider>
        </TeamContextProvider>
      </NotificationProvider>
    </SettingsProvider>
  );
};
