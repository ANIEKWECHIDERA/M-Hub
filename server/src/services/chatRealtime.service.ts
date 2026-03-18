import { EventEmitter } from "events";
import { ChatRealtimeEvent } from "../types/chat.types";

class ChatRealtimeService {
  private emitter = new EventEmitter();

  subscribe(
    companyId: string,
    userId: string,
    listener: (event: ChatRealtimeEvent) => void,
  ) {
    const wrapped = (event: ChatRealtimeEvent) => {
      if (event.company_id !== companyId) {
        return;
      }

      if ("user_ids" in event && Array.isArray(event.user_ids)) {
        if (!event.user_ids.includes(userId)) {
          return;
        }
      }

      listener(event);
    };

    this.emitter.on("chat", wrapped);

    return () => {
      this.emitter.off("chat", wrapped);
    };
  }

  emit(event: ChatRealtimeEvent) {
    this.emitter.emit("chat", event);
  }
}

export const chatRealtimeService = new ChatRealtimeService();
