export interface UserResponseDTO {
  id: string;
  email: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserFromAuthDTO {
  firebase_uid: string;
  email: string;
  display_name?: string | null;
  photo_url?: string | null;
}

export interface CreateUserDTO {
  firebase_uid: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  terms_accepted: boolean;
  terms_accepted_at: Date;
}

export interface UpdateUserDTO {
  first_name?: string;
  last_name?: string;
  display_name?: string;
}

export interface UpdateUserAvatarDTO {
  photo_url: string;
}
