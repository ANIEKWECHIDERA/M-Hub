import { SettingsProvider } from "./SettingsContext.tsx";
import { ProjectContextProvider } from "./ProjectContext.tsx";
import { NoteContextProvider } from "./NoteContext.tsx";
import { AssetContextProvider } from "./AssetContext.tsx";
import { CommentContextProvider } from "./CommentContext.tsx";
import { TeamContextProvider } from "./TeamContext.tsx";

export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <SettingsProvider>
      <ProjectContextProvider>
        <NoteContextProvider>
          <AssetContextProvider>
            <CommentContextProvider>
              <TeamContextProvider>{children}</TeamContextProvider>
            </CommentContextProvider>
          </AssetContextProvider>
        </NoteContextProvider>
      </ProjectContextProvider>
    </SettingsProvider>
  );
};
