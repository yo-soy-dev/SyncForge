import { useState } from "react"
import MonacoEditor from "@monaco-editor/react"
import { useEditor } from "../hooks/useEditor"
import { Users, X } from "lucide-react"

export const Editor = ({
  roomId,
  language = "javascript",
  onCodeChange,
  onSelectionChange,
  editorRef,
  hideUserList = false,
}) => {
  const { handleMount, users } = useEditor(roomId)
  const [showUsers, setShowUsers] = useState(false)

  const handleEditorMount = (editor, monaco) => {
    if (editorRef) editorRef.current = editor

    handleMount(editor, monaco)

    editor.onDidChangeCursorSelection(() => {
      const selection = editor.getModel()?.getValueInRange(editor.getSelection())
      onSelectionChange?.(selection || "")
    })
  }

  return (
    <div className="relative flex flex-col md:flex-row h-full w-full overflow-hidden bg-gray-950">

      {!hideUserList && (
        <button
          onClick={() => setShowUsers(true)}
          className="md:hidden absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/90 border border-gray-700 text-gray-300 backdrop-blur"
        >
          <Users size={16} />
          <span className="text-xs font-medium">
            {users.length + 1}
          </span>
        </button>
      )}

      {!hideUserList && showUsers && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            onClick={() => setShowUsers(false)}
            className="flex-1 bg-black/60"
          />
          <div className="w-72 max-w-[85vw] bg-gray-900 border-l border-gray-800 h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold text-sm">
                Active Users
              </h2>
              <button
                onClick={() => setShowUsers(false)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 text-sm text-gray-400">
              {users.length === 0
                ? "No active users"
                : users.map((u, i) => (
                    <div key={i} className="py-1">
                      {u.name || "Anonymous User"}
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">

        <div className="h-12 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>

            <span className="text-xs sm:text-sm text-gray-400 font-medium ml-3 truncate">
              main.{
                language === "javascript"
                  ? "js"
                  : language === "typescript"
                  ? "ts"
                  : language === "python"
                  ? "py"
                  : language
              }
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="capitalize">{language}</span>
            <span>•</span>
            <span>Live Collaboration</span>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <MonacoEditor
            height="100%"
            language={language}
            theme="vs-dark"
            onMount={handleEditorMount}
            onChange={(value) => onCodeChange?.(value || "")}
            loading={
              <div className="h-full flex items-center justify-center bg-gray-950 text-gray-400">
                Loading editor...
              </div>
            }
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
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
            }}
          />
        </div>
      </div>
    </div>
  )
}