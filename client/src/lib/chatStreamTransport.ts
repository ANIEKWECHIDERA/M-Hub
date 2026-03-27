import type { ChatStreamEvent } from "@/api/chat.api";

type ChatStreamHandlers = {
  onChatEvent: (event: ChatStreamEvent) => void;
};

type ChatSocketMessage =
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
      payload: ChatStreamEvent;
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

function toWebSocketUrl(baseUrl: string, token: string) {
  const url = new URL("/api/chat/ws", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", token);
  return url.toString();
}

function toSseUrl(baseUrl: string, token: string) {
  const url = new URL("/api/chat/stream", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export function openChatStreamTransport(
  baseUrl: string,
  token: string,
  handlers: ChatStreamHandlers,
) {
  let disposed = false;
  let fallbackStarted = false;
  let websocketOpened = false;
  let socket: WebSocket | null = null;
  let eventSource: EventSource | null = null;

  const startSseFallback = () => {
    if (disposed || fallbackStarted) {
      return;
    }

    fallbackStarted = true;
    eventSource = new EventSource(toSseUrl(baseUrl, token));
    eventSource.addEventListener("chat", (event) => {
      try {
        handlers.onChatEvent(JSON.parse((event as MessageEvent<string>).data) as ChatStreamEvent);
      } catch {
        // Ignore malformed events and let the next fetch reconcile state.
      }
    });
  };

  if (typeof WebSocket !== "undefined") {
    try {
      socket = new WebSocket(toWebSocketUrl(baseUrl, token));

      socket.addEventListener("open", () => {
        websocketOpened = true;
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data as string) as ChatSocketMessage;
          if (message.type === "chat") {
            handlers.onChatEvent(message.payload);
          }
        } catch {
          // Ignore malformed socket payloads and let background refresh reconcile state.
        }
      });

      socket.addEventListener("error", () => {
        if (!websocketOpened) {
          socket?.close();
          startSseFallback();
        }
      });

      socket.addEventListener("close", () => {
        if (!websocketOpened) {
          startSseFallback();
        }
      });

      window.setTimeout(() => {
        if (!disposed && !websocketOpened) {
          socket?.close();
          startSseFallback();
        }
      }, 2500);
    } catch {
      startSseFallback();
    }
  } else {
    startSseFallback();
  }

  return () => {
    disposed = true;
    socket?.close();
    eventSource?.close();
  };
}
