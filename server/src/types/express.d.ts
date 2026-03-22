import { AppUser } from "./types";

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
      requestId?: string;
      log?: import("winston").Logger;
    }
  }
}

export {};
