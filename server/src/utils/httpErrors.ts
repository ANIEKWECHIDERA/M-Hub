import type { Request, Response } from "express";

type PublicErrorOptions = {
  status: number;
  error: string;
  code: string;
  details?: unknown;
};

export class AppHttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  expose: boolean;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: {
      details?: unknown;
      expose?: boolean;
    },
  ) {
    super(message);
    this.name = "AppHttpError";
    this.status = status;
    this.code = code;
    this.details = options?.details;
    this.expose = options?.expose ?? status < 500;
  }
}

export function sendPublicError(
  req: Request,
  res: Response,
  { status, error, code, details }: PublicErrorOptions,
) {
  return res.status(status).json({
    error,
    code,
    ...(details !== undefined ? { details } : {}),
    ...(req.requestId ? { requestId: req.requestId } : {}),
  });
}
