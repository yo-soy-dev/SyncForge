import { useState } from "react"
import MonacoEditor from "@monaco-editor/react"
import { useEditor } from "../hooks/useEditor"
import { useRemoteCursors } from "../hooks/useRemoteCursors"
import { useAuth } from "../context/AuthContext"
import { X, FileCode2 } from "lucide-react"
import { getPreferences } from "../utils/preferences"
import { defineCoduetTheme } from "../utils/monacoTheme"

export const Editor = ({
  roomId,
  language = "javascript",
  onCodeChange,
  onSelectionChange,
  editorRef,
  followSocketId = null,
  overlay = null,
  followName = "",
  onStopFollow,
  readOnly = false,
}) => {
  const { handleMount, users, cursors } = useEditor(roomId, { trackCursors: true })
  const { user } = useAuth()
  const [editorInstance, setEditorInstance] = useState(null)

  useRemoteCursors(editorInstance, users, cursors, user?.id, followSocketId)


  const handleEditorMount = (editor, monaco) => {
    if (editorRef) editorRef.current = editor
    setEditorInstance(editor)

    handleMount(editor, monaco)

    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getModel()?.getValueInRange(editor.getSelection())
      onSelectionChange?.(selection || "")
    })
  }

  return (
    <div className="relative flex flex-col md:flex-row h-full min-h-0 w-full min-w-0 overflow-hidden bg-ink">
      {overlay}
      {followSocketId && (
        <div className="absolute top-12 right-4 z-20 flex items-center gap-2 h-8 pl-3 pr-1.5 rounded-full border border-sync/40 bg-surface/90 backdrop-blur text-xs text-fg">
          <span className="w-1.5 h-1.5 rounded-full bg-sync animate-pulse" />
          Following {followName || "collaborator"}
          <button
            onClick={onStopFollow}
            aria-label="Stop following"
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-fg hover:bg-ink transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      )}



      <div className="flex-1 min-h-0 min-w-0 flex flex-col">

        <div className="h-10 border-b border-line bg-ink flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2 size={14} className="text-ember shrink-0" />

            <span className="font-mono text-xs text-fg truncate">
              main.{
                language === "javascript"
                  ? "js"
                  : language === "typescript"
                    ? "ts"
                    : language === "python"
                      ? "py"
                      : language === "java"
                        ? "java"
                        : language === "cpp"
                          ? "cpp"
                          : language === "go"
                            ? "go"
                            : language
              }
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-muted">
            <span className="capitalize">{language}</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${readOnly ? "bg-gold" : "bg-sync animate-pulse"}`} />
              {readOnly ? "Read-only" : "Live"}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={language}
            theme="coduet"
            beforeMount={defineCoduetTheme}
            onMount={handleEditorMount}
            onChange={(value) => onCodeChange?.(value || "")}
            loading={
              <div className="h-full flex items-center justify-center bg-ink text-muted">
                Loading editor...
              </div>
            }
            options={{
              fontSize:
                getPreferences().fontSize -
                (window.matchMedia("(max-width: 640px)").matches ? 2 : 0),
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: getPreferences().wordWrap ? "on" : "off",
              smoothScrolling: true,
              padding: { top: 16 },
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              renderLineHighlight: "all",
              roundedSelection: true,
              lineNumbersMinChars: 3,
              tabSize: 2,
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
              readOnly,
            }}
          />
        </div>
      </div>
    </div>
  )
}