import type { User } from "firebase/auth";

export interface CreateProjectDTO {
  title: string;
  description?: string;
  status?: "Active" | "Planning" | "In Progress" | "On Hold" | "Completed";
  deadline?: string; // ISO string
  client_id?: string;
  team_member_ids?: string[];
}

export interface UpdateProjectDTO {
  title?: string;
  description?: string;
  status?: "Active" | "Planning" | "In Progress" | "On Hold" | "Completed";
  deadline?: string;
  client_id?: string;
  team_member_ids?: string[];
}

export interface Project {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  status: "Active" | "Planning" | "In Progress" | "On Hold" | "Completed";
  deadline: string | null;
  created_at: string;

  client: {
    id: string;
    name: string;
  } | null;

  team_members: {
    id: string;
    name: string;
    avatar?: string | null;
    role: string | null;
  }[];
}

export interface ProjectContextType {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  currentProject: Project | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  addProject: (project: CreateProjectDTO) => Promise<Project>;

  updateProject: (id: string, data: CreateProjectDTO) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  confirmDelete: () => void;
  projectToDelete: Project | null;
  setProjectToDelete: React.Dispatch<React.SetStateAction<Project | null>>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface ProjectFormProps {
  project?: Partial<Project>;
  onSave: (data: Partial<Project>) => void;
  onCancel: () => void;
}

//////////////// TeamContextTypes ////////////////
export interface TeamMember {
  id: string;
  companyId?: string[];
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
  updateTeamMember: (id: string, data: Partial<TeamMember>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
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
  id: string;
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
  assignee?: string[];
  status: TaskStatus;
  dueDate: string;
  description: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  attachments?: number;
  comments?: number;
  subtaskIds?: string[];
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
    projectId: string,
    companyId: string,
    task: Partial<Task>
  ) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
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
  getEnrichedTaskById: (id: string) => EnrichedTask | undefined;
}

export interface Subtask {
  id: string;
  companyId: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface SubtaskContextType {
  subtasks: Subtask[];
  setSubtasks: React.Dispatch<React.SetStateAction<Subtask[]>>;
  fetchSubtasks: () => Promise<void>;
  addSubtask: (data: Omit<Subtask, "id">) => Promise<Subtask>;
  updateSubtask: (id: string, data: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (id: string) => Promise<void>;
  getSubtasksByIds: (ids: string[]) => Subtask[];
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
    assignee?: string[] | string;
    status?: string;
    dueDate?: string;
  };
}

/////////////////// AssetContextTypes ///////////////
export interface Assets {
  id: string;
  company_id: string;
  project_id: string;
  task_id?: string | null;
  uploaded_by_id: string;

  name: string;
  size: string;
  type: "pdf" | "image" | "document" | string;
  url: string;

  upload_date: string;
  updated_at: string;
}

export interface AssetContextType {
  files: Assets[];
  currentFile: Assets | null;

  loading: boolean;
  error: string | null;

  fetchFilesByProject: (projectId: string) => Promise<void>;
  uploadFiles: (
    projectId: string,
    files: File[],
    taskId?: string
  ) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;

  setCurrentFile: React.Dispatch<React.SetStateAction<Assets | null>>;
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fileToDelete: Assets | null;
  setFileToDelete: React.Dispatch<React.SetStateAction<Assets | null>>;
  confirmFileDelete: () => void;
}

//////////////// CommentContextTypes //////////////
export interface Comment {
  id: string;
  companyId: string;
  projectId: string;
  taskId?: string | null;
  authorId: string;
  content: string;
  timestamp: string; // ISO string
}

export interface CommentContextType {
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  currentComment: Comment | null;
  setCurrentComment: React.Dispatch<React.SetStateAction<Comment | null>>;
  newComment: string;
  setNewComment: React.Dispatch<React.SetStateAction<string>>;
  fetchComments: () => Promise<void>;
  addComment: (data: {
    content: string;
    projectId: string;
    taskId?: string;
  }) => Promise<void>;

  updateComment: (
    id: string,
    data: Partial<Pick<Comment, "content">>
  ) => Promise<void>;

  deleteComment: (id: string) => Promise<void>;

  loading: boolean;
  error: string | null;
}

export interface CreateCommentPayload {
  project_id: string;
  content: string;
  task_id?: string;
}

export interface UpdateCommentPayload {
  content?: string;
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
  id: string;
  companyId: string;
  projectId: string;
  authorId: string;
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
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  loading: boolean;
  error: string | null;
}

export interface NoteData {
  id: string;
  companyId: string;
  projectId: string;
  authorId: string;
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

  ////////////////////////clients/////////////////
}
export interface Client {
  id: string;
  company_id: string;
  name: string;
  contact_person: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at?: string;
}

export interface ClientContextType {
  clients: Client[];
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<void>;
}
