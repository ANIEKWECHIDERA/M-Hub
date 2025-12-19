import type { User } from "firebase/auth";

export interface CreateProjectDTO {
  title: string;
  description?: string;
  status?: "Planning" | "In Progress" | "Completed";
  deadline?: string; // ISO string
  client_id?: string;
}

export interface UpdateProjectDTO {
  title?: string;
  description?: string;
  status?: "Planning" | "In Progress" | "Completed";
  deadline?: string;
  client_id?: string;
}

export interface Project {
  id: string;
  companyId: string;
  client?: string;
  title: string;
  description?: string;
  status: string;
  deadline?: Date | string;
  team?: number[];
  assets?: number[];
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
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
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

export interface Assignee {
  id: number;
  firstname: string;
  lastname: string;
  avatar?: string;
}

//////////////// TaskContextTypes ////////////////
export interface Task {
  id: string;
  companyId: string;
  projectId: string;
  title: string;
  assignee?: number[];
  status: TaskStatus;
  dueDate: string;
  description: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  attachments?: number;
  comments?: number;
  subtaskIds?: number[];
  progress?: number;
}

export type TaskStatus = "To-Do" | "In Progress" | "Done";

export interface EnrichedTask extends Task {
  projectTitle: string;
  clientName: string;
  subtasks?: Subtask[];
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
  selectedTask: EnrichedTask | null;
  setSelectedTask: React.Dispatch<React.SetStateAction<EnrichedTask | null>>;
  confirmDelete: () => void;
  TaskToDelete: Task | null;
  setTaskToDelete: React.Dispatch<React.SetStateAction<Task | null>>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  getEnrichedTasks: () => EnrichedTask[];
  getEnrichedTaskById: (id: number) => EnrichedTask | undefined;
}

export interface Subtask {
  id: number;
  companyId: number;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface SubtaskContextType {
  subtasks: Subtask[];
  setSubtasks: React.Dispatch<React.SetStateAction<Subtask[]>>;
  fetchSubtasks: () => Promise<void>;
  addSubtask: (data: Omit<Subtask, "id">) => Promise<Subtask>;
  updateSubtask: (id: number, data: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (id: number) => Promise<void>;
  getSubtasksByIds: (ids: number[]) => Subtask[];
  loading: boolean;
  error: string | null;
}

export interface TaskDetailDialogProps {
  task: Task | null;
  onClose: () => void;
  assignee: Assignee[];
}

export interface TaskFormProps {
  onSave: (formData: any) => void;
  onCancel: () => void;
  defaultValues?: {
    title?: string;
    description?: string;
    assignee?: number[] | string;
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
  url: string;
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
  companyId: number;
  projectId: number;
  authorId: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteContextType {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  currentNote: Note | null;
  setCurrentNote: React.Dispatch<React.SetStateAction<Note | null>>;
  tags: string[];
  fetchNotes: () => Promise<void>;
  addNote: (note: Note) => Promise<void>;
  updateNote: (id: number, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;

  loading: boolean;
  error: string | null;
}

export interface NoteData {
  id: number;
  companyId: number;
  projectId: number;
  authorId: number;
  title: string;
  content: string;
  tags: string[];
  updatedAt: string;
}

export interface NoteFormProps {
  note?: Note;
  onSave: (data: Partial<Note>) => void;
  onCancel: () => void;
}

////////////////// Authentication context type //////////////////
export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: String,
    termsAccepted: boolean
  ) => Promise<{
    user: User | null;
    error: string | null;
    uidToDeleteOnError: String | null;
  }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    user: User | null;
    error: String | null;
  }>;
  logout: () => Promise<void>;
  clearError: () => void;
  signInWithGoogle: () => Promise<any>;
  signUpWithGoogle: () => Promise<any>;
  idToken: string | null;
}

/////////// user profile type //////////////////////////
export interface UserProfile {
  id: string;
  firebaseUid: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  companyId?: string[];
  // Add any other fields you plan to store in Supabase
  phone?: string;
  bio?: string;
  department?: string;
  accessLevel?: string;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserProfileUpdate {
  first_name: string;
  last_name: string;
  phone?: string;
  bio?: string;
  department?: string;
  access_level?: string;
}

export interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (data: Partial<UserProfile>) => Promise<boolean>;
  deleteAccount?: () => Promise<boolean>;
  fetchUserProfile: (idToken: string) => Promise<UserProfile | null>;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  //   refreshProfile?: () => Promise<void>; // Optional: manual refresh
}
