import { EventEmitter } from "events";
import { ChatRealtimeEvent } from "../types/chat.types";

class ChatRealtimeService {
  private emitter = new EventEmitter();
  private presence = new Map<string, number>();

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

  markOnline(companyId: string, userId: string) {
    const key = `${companyId}:${userId}`;
    const count = this.presence.get(key) ?? 0;
    this.presence.set(key, count + 1);

    if (count === 0) {
      this.emit({
        type: "chat.presence",
        company_id: companyId,
        user_id: userId,
        online: true,
      });
    }
  }

  markOffline(companyId: string, userId: string) {
    const key = `${companyId}:${userId}`;
    const count = this.presence.get(key) ?? 0;

    if (count <= 1) {
      this.presence.delete(key);
      this.emit({
        type: "chat.presence",
        company_id: companyId,
        user_id: userId,
        online: false,
      });
      return;
    }

    this.presence.set(key, count - 1);
  }

  isOnline(companyId: string, userId: string) {
    return (this.presence.get(`${companyId}:${userId}`) ?? 0) > 0;
  }
}

export const chatRealtimeService = new ChatRealtimeService();
