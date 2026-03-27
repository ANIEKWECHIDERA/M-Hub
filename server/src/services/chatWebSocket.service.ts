import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import admin from "../config/firebaseAdmin";
import { ChatRealtimeEvent } from "../types/chat.types";
import { RequestCacheService } from "./requestCache.service";
import { UserService } from "./user.service";
import { chatRealtimeService } from "./chatRealtime.service";
import { logger } from "../utils/logger";

type ChatSocketEnvelope =
  | {
      type: "connected";
      data: {
        companyId: string;
        userId: string;
        transport: "websocket";
      };
    }
  | {
      type: "chat";
      payload: ChatRealtimeEvent;
    }
  | {
      type: "ping";
      data: {
        ts: string;
      };
    }
  | {
      type: "error";
      data: {
        message: string;
      };
    };

class ChatWebSocketService {
  private wss: WebSocketServer | null = null;

  initialize(server: {
    on: (event: string, listener: (...args: any[]) => void) => void;
  }) {
    if (this.wss) {
      return;
    }

    this.wss = new WebSocketServer({
      noServer: true,
    });

    server.on("upgrade", (request: IncomingMessage, socket, head) => {
      const pathname = this.getPathname(request);
      if (pathname !== "/api/chat/ws") {
        return;
      }

      this.wss?.handleUpgrade(request, socket, head, (ws) => {
        this.wss?.emit("connection", ws, request);
      });
    });

    this.wss.on("connection", (ws, request) => {
      void this.handleConnection(ws, request);
    });
  }

  private getPathname(request: IncomingMessage) {
    try {
      return new URL(request.url ?? "", this.getRequestOrigin(request)).pathname;
    } catch {
      return "";
    }
  }

  private getRequestOrigin(request: IncomingMessage) {
    const host = request.headers.host ?? "localhost";
    const forwardedProto = request.headers["x-forwarded-proto"];
    const proto =
      typeof forwardedProto === "string"
        ? forwardedProto.split(",")[0]
        : "http";

    return `${proto}://${host}`;
  }

  private send(ws: WebSocket, envelope: ChatSocketEnvelope) {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    ws.send(JSON.stringify(envelope));
  }

  private async handleConnection(ws: WebSocket, request: IncomingMessage) {
    const token = this.getToken(request);

    if (!token) {
      this.send(ws, {
        type: "error",
        data: { message: "Missing chat stream token" },
      });
      ws.close(4401, "Missing token");
      return;
    }

    try {
      const decoded =
        RequestCacheService.getVerifiedToken(token, {
          requestPath: "/api/chat/ws",
        }) ?? (await admin.auth().verifyIdToken(token, true));

      RequestCacheService.setVerifiedToken(token, decoded, {
        requestPath: "/api/chat/ws",
      });

      const cachedUser = RequestCacheService.getUser(decoded.uid, {
        requestPath: "/api/chat/ws",
      });
      const user = cachedUser ?? (await UserService.findByFirebaseUid(decoded.uid));

      if (!user?.company_id || !user?.id) {
        this.send(ws, {
          type: "error",
          data: { message: "Chat stream unavailable" },
        });
        ws.close(4403, "Chat unavailable");
        return;
      }

      if (!cachedUser) {
        RequestCacheService.setUser(decoded.uid, user, {
          requestPath: "/api/chat/ws",
        });
      }

      const closePresenceSession = await chatRealtimeService.openPresenceSession(
        user.company_id,
        user.id,
      );

      const unsubscribe = chatRealtimeService.subscribe(
        user.company_id,
        user.id,
        (event) => {
          this.send(ws, {
            type: "chat",
            payload: event,
          });
        },
      );

      this.send(ws, {
        type: "connected",
        data: {
          companyId: user.company_id,
          userId: user.id,
          transport: "websocket",
        },
      });

      const keepAlive = setInterval(() => {
        this.send(ws, {
          type: "ping",
          data: { ts: new Date().toISOString() },
        });
      }, 25000);

      const cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
        void closePresenceSession();
      };

      ws.on("close", cleanup);
      ws.on("error", (error) => {
        logger.warn("chatWebSocketService: socket error", { error });
      });
    } catch (error: any) {
      logger.error("chatWebSocketService: connection failed", {
        error: error?.message ?? error,
      });
      this.send(ws, {
        type: "error",
        data: { message: "Invalid or expired token" },
      });
      ws.close(4401, "Invalid token");
    }
  }

  private getToken(request: IncomingMessage) {
    try {
      const url = new URL(request.url ?? "", this.getRequestOrigin(request));
      return url.searchParams.get("token")?.trim() ?? "";
    } catch {
      return "";
    }
  }
}

export const chatWebSocketService = new ChatWebSocketService();
