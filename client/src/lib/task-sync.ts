import type { TaskWithAssigneesDTO } from "@/Types/types";

export const TASK_SYNC_EVENT = "crevo:task-sync";

export type TaskSyncPayload =
  | {
      type: "upsert";
      task: TaskWithAssigneesDTO;
    }
  | {
      type: "delete";
      taskId: string;
    };

export function dispatchTaskSync(payload: TaskSyncPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<TaskSyncPayload>(TASK_SYNC_EVENT, {
    detail: payload,
  }));
}

export function subscribeToTaskSync(
  handler: (payload: TaskSyncPayload) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<TaskSyncPayload>;
    if (!customEvent.detail) {
      return;
    }

    handler(customEvent.detail);
  };

  window.addEventListener(TASK_SYNC_EVENT, listener as EventListener);
  return () => {
    window.removeEventListener(TASK_SYNC_EVENT, listener as EventListener);
  };
}
