export interface Project {
  id: number;
  title: string;
  client: string;
  status: string;

  deadline: string;
  description: string;

  team: number[];
}

export interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentProject: Project | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  confirmDelete: () => void;
  projectToDelete: Project | null;
  setProjectToDelete: React.Dispatch<React.SetStateAction<Project | null>>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  getTeamMembersDetails: (memberIds: number[]) => TeamMember[];
  // Toaster: React.FC;
}

export interface ProjectFormProps {
  project?: Partial<Project>;
  onSave: (data: Partial<Project>) => void;
  onCancel: () => void;
}

//////////////// TeamContextTypes ////////////////
export interface TeamMember {
  id: number;
  companyId?: number[];
  firstname: string;
  lastname: string;
  email: string;
  role: string;
  access: "Admin" | "Team";
  lastlogin: Date | string;
  avatar: string;
  status?: "active" | "inactive";
}

export interface TeamContextType {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  currentMember: TeamMember | null;
  setCurrentMember: React.Dispatch<React.SetStateAction<TeamMember | null>>;

  fetchTeamMembers: () => Promise<void>;
  addTeamMember: (member: TeamMember) => Promise<void>;
  updateTeamMember: (id: number, data: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: number) => Promise<void>;
  confirmDelete: () => void;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  memberToDelete: TeamMember | null;
  setMemberToDelete: React.Dispatch<React.SetStateAction<TeamMember | null>>;
  loading: boolean;
  error: string | null;
}

export interface TeamMemberFormProps {
  member?: Partial<TeamMember>;
  onSave: (data: Partial<TeamMember>) => void;
  onCancel: () => void;
}

//////////////// TaskContextTypes ////////////////
export interface Task {
  id: number;
  companyId: number;
  projectId: number;
  title: string;
  assignee: number[];
  status: string;
  dueDate: string;
  description: string;
}

export interface TaskContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentTask: Task | null;
  setCurrentTask: React.Dispatch<React.SetStateAction<Task | null>>;
  fetchTasks: () => Promise<void>;
  addTask: (
    projectId: number,
    companyId: number,
    task: Partial<Task>
  ) => Promise<void>;
  updateTask: (id: number, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  loading: boolean;
  error: string | null;
  selectedTask: Task | null;
  setSelectedTask: React.Dispatch<React.SetStateAction<Task | null>>;
  confirmDelete: () => void;
  TaskToDelete: Task | null;
  setTaskToDelete: React.Dispatch<React.SetStateAction<Task | null>>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
}

export interface TaskFormProps {
  onSave: (formData: any) => void;
  onCancel: () => void;
  defaultValues?: {
    title?: string;
    description?: string;
    assignee?: string;
    status?: string;
    dueDate?: string;
  };
}

/////////////////// AssetContextTypes ///////////////
export interface Assets {
  id: number;
  companyId: number;
  projectId: number;
  assigneeId: number;
  name: string;
  size: string;
  uploadDate: string;
  type: "pdf" | "image" | "document" | string;
}

export interface AssetContextType {
  files: Assets[];
  setFiles: React.Dispatch<React.SetStateAction<Assets[]>>;
  currentFile: Assets | null;
  setCurrentFile: React.Dispatch<React.SetStateAction<Assets | null>>;

  fetchFiles: () => Promise<void>;
  addFile: (file: Assets) => Promise<void>;
  updateFile: (id: number, data: Partial<Assets>) => Promise<void>;
  deleteFile: (id: number) => Promise<void>;
  confirmFileDelete: () => void;
  fileToDelete: Assets | null;
  setFileToDelete: React.Dispatch<React.SetStateAction<Assets | null>>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;

  loading: boolean;
  error: string | null;
}

//////////////// CommentContextTypes //////////////
export interface Comment {
  id: number;
  companyId: number;
  projectId: number;
  authorId: number;
  content: string;
  timestamp: string;
}

export interface CommentContextType {
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  currentComment: Comment | null;
  setCurrentComment: React.Dispatch<React.SetStateAction<Comment | null>>;
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;

  fetchComments: () => Promise<void>;
  addComment: (
    content: string,
    authorId: number,
    companyId: number,
    projectId: number
  ) => Promise<void>;
  updateComment: (id: number, data: Partial<Comment>) => Promise<void>;
  deleteComment: (id: number) => Promise<void>;

  loading: boolean;
  error: string | null;
}

//////////////// SettingsContextTypes //////////////

export interface Preferences {
  notifications: boolean;
  compactMode: boolean;
}

export interface SettingsContextType {
  theme: "light" | "dark";
  setTheme: React.Dispatch<React.SetStateAction<"light" | "dark">>;
  toggleTheme: () => void;

  language: "en" | "es" | "fr";
  setLanguage: React.Dispatch<React.SetStateAction<"en" | "es" | "fr">>;

  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
}

//////////// NoteTypes //////////////////////
export interface Note {
  id: number;
  title: string;
  content?: string;
  project: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteContextType {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  currentNote: Note | null;
  setCurrentNote: React.Dispatch<React.SetStateAction<Note | null>>;

  fetchNotes: () => Promise<void>;
  addNote: (note: Note) => Promise<void>;
  updateNote: (id: number, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;

  loading: boolean;
  error: string | null;
}
