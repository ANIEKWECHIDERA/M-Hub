export interface ClientResponseDTO {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface CreateClientDTO {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateClientDTO {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}
