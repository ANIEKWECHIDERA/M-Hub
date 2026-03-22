import { EventEmitter } from "events";
import { CommentStreamEvent } from "../types/comment.types";

class CommentRealtimeService {
  private emitter = new EventEmitter();

  subscribe(
    companyId: string,
    projectId: string,
    listener: (event: CommentStreamEvent) => void,
  ) {
    const wrapped = (event: CommentStreamEvent) => {
      if (event.company_id === companyId && event.project_id === projectId) {
        listener(event);
      }
    };

    this.emitter.on("comment", wrapped);

    return () => {
      this.emitter.off("comment", wrapped);
    };
  }

  emit(event: CommentStreamEvent) {
    this.emitter.emit("comment", event);
  }
}

export const commentRealtimeService = new CommentRealtimeService();
