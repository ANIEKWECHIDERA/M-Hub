import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ListTodo, Plus, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useSubTasksContext } from "@/context/SubTasksContext";
import { useTeamContext } from "@/context/TeamMemberContext";
import type { Subtask } from "@/Types/types";

interface SubtasksSectionProps {
  taskId: string;
}

export function SubtasksSection({ taskId }: SubtasksSectionProps) {
  const {
    subtasks: allSubtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    loading,
  } = useSubTasksContext();

  const { currentMember } = useTeamContext();

  const [newSubtask, setNewSubtask] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const subtasks = useMemo<Subtask[]>(() => {
    return allSubtasks.filter((subtask) => subtask.task_id === taskId);
  }, [allSubtasks, taskId]);

  const completedCount = subtasks.filter((subtask) => subtask.completed).length;
  const progress =
    subtasks.length > 0
      ? Math.round((completedCount / subtasks.length) * 100)
      : 0;

  const handleToggle = async (subtask: Subtask) => {
    await updateSubtask(subtask.id, {
      completed: !subtask.completed,
    });
  };

  const handleAdd = async () => {
    try {
      if (!newSubtask.trim() || !currentMember) {
        throw new Error("Invalid subtask or no member detected");
      }

      await addSubtask({
        task_id: taskId,
        title: newSubtask.trim(),
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setNewSubtask("");
    } catch (err) {
      console.error("Failed to add subtask:", err);
    }
  };

  const handleEditSave = async (subtaskId: string) => {
    if (!editingTitle.trim()) return;

    await updateSubtask(subtaskId, {
      title: editingTitle.trim(),
    });

    setEditingId(null);
    setEditingTitle("");
  };

  const handleDelete = async (subtaskId: string) => {
    await deleteSubtask(subtaskId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4" />
            My Subtasks
            {subtasks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {completedCount}/{subtasks.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {subtasks.length > 0 && (
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="min-w-[40px] text-sm text-muted-foreground">
              {progress}%
            </span>
          </div>
        )}

        <div className="space-y-2">
          {subtasks.length > 0 ? (
            subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50"
              >
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={() => handleToggle(subtask)}
                />

                {editingId === subtask.id ? (
                  <>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="h-8 flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleEditSave(subtask.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setEditingTitle("");
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        subtask.completed &&
                          "line-through text-muted-foreground",
                      )}
                    >
                      {subtask.title}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setEditingId(subtask.id);
                        setEditingTitle(subtask.title);
                      }}
                      aria-label="Edit subtask"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600"
                      onClick={() => handleDelete(subtask.id)}
                      aria-label="Delete subtask"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No subtasks yet. Add your first one below!
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add a new subtask..."
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newSubtask.trim() || loading || !currentMember}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Subtasks are personal to you and help break down this task into
          manageable steps.
        </p>
      </CardContent>
    </Card>
  );
}
