import { EventEmitter } from "events";
import { NotificationStreamEvent } from "../types/notification.types";

class NotificationRealtimeService {
  private emitter = new EventEmitter();

  subscribe(
    userId: string,
    companyId: string,
    listener: (event: NotificationStreamEvent) => void,
  ) {
    const wrapped = (event: NotificationStreamEvent) => {
      if (event.user_id === userId && event.company_id === companyId) {
        listener(event);
      }
    };

    this.emitter.on("notification", wrapped);

    return () => {
      this.emitter.off("notification", wrapped);
    };
  }

  emit(event: NotificationStreamEvent) {
    this.emitter.emit("notification", event);
  }
}

export const notificationRealtimeService = new NotificationRealtimeService();
