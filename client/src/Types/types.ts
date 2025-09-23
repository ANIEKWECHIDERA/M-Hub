export interface Project {
  id: number;
  title: string;
  client: string;
  status: string;
  progress: number;
  deadline: string;
  description: string;
  tasks: {
    total: number;
    completed: number;
  };
  team: TeamMember[];
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
  name: string;
  role: string;
  avatar: string;
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

  loading: boolean;
  error: string | null;
}

//////////////// TaskContextTypes ////////////////
export interface Task {
  id: number;
  title: string;
  assignee: string;
  status: string;
  dueDate: string;
  description: string;
  total?: number;
  completed?: number;
}

export interface TaskContextType {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentTask: Task | null;
  setCurrentTask: React.Dispatch<React.SetStateAction<Task | null>>;

  fetchTasks: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: number, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;

  loading: boolean;
  error: string | null;
}

/////////////////// AssetContextTypes ///////////////
export interface File {
  id: number;
  name: string;
  size: string;
  uploadDate: string;
  type: "pdf" | "image" | "document" | string;
}

export interface AssetContextType {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  currentFile: File | null;
  setCurrentFile: React.Dispatch<React.SetStateAction<File | null>>;

  fetchFiles: () => Promise<void>;
  addFile: (file: File) => Promise<void>;
  updateFile: (id: number, data: Partial<File>) => Promise<void>;
  deleteFile: (id: number) => Promise<void>;

  loading: boolean;
  error: string | null;
}

//////////////// CommentContextTypes //////////////
export interface Comment {
  id: number;
  author: string;
  content: string;
  timestamp: string;
  avatar: string;
}

export interface CommentContextType {
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  currentComment: Comment | null;
  setCurrentComment: React.Dispatch<React.SetStateAction<Comment | null>>;

  fetchComments: () => Promise<void>;
  addComment: (
    content: string,
    author?: string,
    avatar?: string
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
