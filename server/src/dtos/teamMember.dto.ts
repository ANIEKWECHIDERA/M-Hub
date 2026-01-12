export interface TeamMemberDTO {
  id: string;
  email: string;
  role: string;
  status: string;

  firstName?: string;
  lastName?: string;
  avatar?: string;
}
