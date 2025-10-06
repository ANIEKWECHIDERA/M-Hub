import { SettingsProvider } from "./SettingsContext.tsx";
import { ProjectContextProvider } from "./ProjectContext.tsx";
import { NoteContextProvider } from "./NoteContext.tsx";
import { AssetContextProvider } from "./AssetContext.tsx";
import { CommentContextProvider } from "./CommentContext.tsx";
import { TeamContextProvider } from "./TeamMemberContext.tsx";
import { TaskContextProvider } from "./TaskContext.tsx";

export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <SettingsProvider>
      <TeamContextProvider>
        <ProjectContextProvider>
          <TaskContextProvider>
            <NoteContextProvider>
              <AssetContextProvider>
                <CommentContextProvider>{children}</CommentContextProvider>
              </AssetContextProvider>
            </NoteContextProvider>
          </TaskContextProvider>
        </ProjectContextProvider>
      </TeamContextProvider>
    </SettingsProvider>
  );
};
