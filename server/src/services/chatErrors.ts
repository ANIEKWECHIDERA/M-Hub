export class ChatHttpError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isChatHttpError(error: unknown): error is ChatHttpError {
  return error instanceof ChatHttpError;
}
