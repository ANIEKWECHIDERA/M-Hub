export interface Project {
  id: string;
  company_id: string;
  client_id?: string | null;
  title: string;
  description?: string | null;
  status: string;
  deadline?: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateProjectDTO = Omit<
  Project,
  "id" | "created_at" | "updated_at"
>;

export type UpdateProjectDTO = Partial<CreateProjectDTO>;

////////////////////////// AUTH TYPES///////////////////////////
import type { auth } from "firebase-admin";

export interface AppUser extends auth.DecodedIdToken {
  id?: string;
  user_id?: string;
  email?: string;
  firebase_uid?: string;
  company_id?: string | null;
  role?: string;
  team_member_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  terms_accepted?: boolean | null;
}
