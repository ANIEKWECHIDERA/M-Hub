import { useEffect, useMemo, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Redo2, Undo2 } from "lucide-react";
import {
  EMPTY_NOTE_HTML,
  NOTE_EDITOR_FORMATS,
  NOTE_EDITOR_TOOLBAR,
  sanitizeNoteHtmlClient,
} from "@/lib/notes";

type NoteEditorProps = {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

const isSameHtml = (left: string, right: string) =>
  sanitizeNoteHtmlClient(left) === sanitizeNoteHtmlClient(right);

export function NoteEditor({
  value,
  placeholder,
  disabled = false,
  onChange,
  onBlur,
}: NoteEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isApplyingExternalValueRef = useRef(false);

  const modules = useMemo(
    () => ({
      toolbar: NOTE_EDITOR_TOOLBAR,
      history: {
        delay: 400,
        maxStack: 200,
        userOnly: true,
      },
    }),
    [],
  );

  useEffect(() => {
    if (!editorContainerRef.current || quillRef.current) {
      return;
    }

    const quill = new Quill(editorContainerRef.current, {
      theme: "snow",
      placeholder,
      modules,
      formats: [...NOTE_EDITOR_FORMATS],
    });

    quill.root.classList.add(
      "min-h-[18rem]",
      "bg-background",
      "text-sm",
      "leading-7",
    );

    const handleTextChange = () => {
      if (isApplyingExternalValueRef.current) {
        return;
      }

      onChange(quill.root.innerHTML || EMPTY_NOTE_HTML);
    };

    const handleBlur = () => onBlur?.();

    const handlePaste = (event: ClipboardEvent) => {
      const html = event.clipboardData?.getData("text/html");

      if (!html) {
        return;
      }

      event.preventDefault();
      const sanitizedHtml = sanitizeNoteHtmlClient(html);
      const range = quill.getSelection(true);
      const index = range?.index ?? quill.getLength();
      quill.clipboard.dangerouslyPasteHTML(index, sanitizedHtml, "user");
    };

    quill.on("text-change", handleTextChange);
    quill.root.addEventListener("blur", handleBlur);
    quill.root.addEventListener("paste", handlePaste);
    quillRef.current = quill;

    return () => {
      quill.off("text-change", handleTextChange);
      quill.root.removeEventListener("blur", handleBlur);
      quill.root.removeEventListener("paste", handlePaste);
      quillRef.current = null;
    };
  }, [modules, onBlur, onChange, placeholder]);

  useEffect(() => {
    const quill = quillRef.current;

    if (!quill) {
      return;
    }

    quill.enable(!disabled);
  }, [disabled]);

  useEffect(() => {
    const quill = quillRef.current;
    const sanitizedValue = sanitizeNoteHtmlClient(value);

    if (!quill || isSameHtml(quill.root.innerHTML, sanitizedValue)) {
      return;
    }

    isApplyingExternalValueRef.current = true;
    const selection = quill.getSelection();
    quill.setContents([]);
    quill.clipboard.dangerouslyPasteHTML(sanitizedValue, "api");

    if (selection) {
      const safeIndex = Math.min(selection.index, quill.getLength() - 1);
      quill.setSelection(Math.max(safeIndex, 0), selection.length, "silent");
    }

    isApplyingExternalValueRef.current = false;
  }, [value]);

  const handleUndo = () => quillRef.current?.history.undo();
  const handleRedo = () => quillRef.current?.history.redo();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-end gap-1 border-b px-3 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" onClick={handleUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" onClick={handleRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          ref={editorContainerRef}
          className="notes-quill-editor h-full [&_.ql-container]:h-[calc(100%-42px)] [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[18rem] [&_.ql-editor]:overflow-y-auto [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b"
        />
      </div>
    </div>
  );
}
