import { SettingsProvider } from "./SettingsContext.tsx";
import { ProjectContextProvider } from "./ProjectContext.tsx";
import { NoteContextProvider } from "./NoteContext.tsx";
import { AssetContextProvider } from "./AssetContext.tsx";
import { TeamContextProvider } from "./TeamMemberContext.tsx";
import { TaskContextProvider } from "./TaskContext.tsx";
import { SubTasksContextProvider } from "./SubTasksContext.tsx";
import { NotificationProvider } from "./NotificationContext.tsx";
import { AuthProvider } from "./AuthContext.tsx";
import { ClientProvider } from "./ClientContext.tsx";
import { MyTasksProvider } from "./MyTaskContext.tsx";

export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationProvider>
          <TeamContextProvider>
            <ClientProvider>
              <ProjectContextProvider>
                <SubTasksContextProvider>
                  <TaskContextProvider>
                    <MyTasksProvider>
                      <NoteContextProvider>
                        <AssetContextProvider>{children}</AssetContextProvider>
                      </NoteContextProvider>
                    </MyTasksProvider>
                  </TaskContextProvider>
                </SubTasksContextProvider>
              </ProjectContextProvider>
            </ClientProvider>
          </TeamContextProvider>
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};
