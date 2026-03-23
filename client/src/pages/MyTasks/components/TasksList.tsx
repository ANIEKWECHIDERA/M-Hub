import { useMemo, useRef } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { TaskWithAssigneesDTO } from "@/Types/types";
import { TaskCard } from "./TaskCard";

interface TasksListProps {
  tasks: TaskWithAssigneesDTO[];
  onOpenTask: (task: TaskWithAssigneesDTO) => void;
  onToggleStatus: (taskId: string, done: boolean) => void;
  onReorder?: (orderedTaskIds: string[]) => void;
}

interface SortableTaskRowProps {
  task: TaskWithAssigneesDTO;
  onOpenTask: (task: TaskWithAssigneesDTO) => void;
  onToggleStatus: (taskId: string, done: boolean) => void;
  suppressOpenUntilRef: React.MutableRefObject<number>;
}

function SortableTaskRow({
  task,
  onOpenTask,
  onToggleStatus,
  suppressOpenUntilRef,
}: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl">
      <TaskCard
        task={task}
        onOpen={(nextTask) => {
          if (Date.now() < suppressOpenUntilRef.current) {
            return;
          }

          onOpenTask(nextTask);
        }}
        onToggleStatus={onToggleStatus}
        dragHandleProps={attributes}
        dragHandleListeners={listeners}
        setDragHandleRef={setActivatorNodeRef}
        isDragging={isDragging}
      />
    </div>
  );
}

export function TasksList({
  tasks,
  onOpenTask,
  onToggleStatus,
  onReorder,
}: TasksListProps) {
  const suppressOpenUntilRef = useRef(0);
  const itemIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const orderedTaskIds = [...itemIds];
    const [moved] = orderedTaskIds.splice(oldIndex, 1);
    orderedTaskIds.splice(newIndex, 0, moved);

    suppressOpenUntilRef.current = Date.now() + 350;
    onReorder?.(orderedTaskIds);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          className="flex flex-col gap-2.5 px-1 pb-4 pt-1 overscroll-contain sm:gap-3 sm:px-0"
          aria-label="My task list"
        >
          {tasks.map((task) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              onOpenTask={onOpenTask}
              onToggleStatus={onToggleStatus}
              suppressOpenUntilRef={suppressOpenUntilRef}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
