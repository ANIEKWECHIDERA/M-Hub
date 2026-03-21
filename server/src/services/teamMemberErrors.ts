export class TeamMemberHttpError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.name = "TeamMemberHttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isTeamMemberHttpError(error: unknown): error is TeamMemberHttpError {
  return error instanceof TeamMemberHttpError;
}
