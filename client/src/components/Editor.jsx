import MonacoEditor from "@monaco-editor/react"
import { useEditor } from "../hooks/useEditor"
import { UserList } from "./UserList"
import { Loader } from "./Loader"

export const Editor = ({ roomId, language = "javascript", onCodeChange }) => {
  const { handleMount, users } = useEditor(roomId)

  return (
    <div className="flex h-full">
      <UserList users={users} />

      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          onMount={handleMount}
          onChange={(value) => onCodeChange?.(value || "")}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            padding: { top: 16 },
          }}
        />
      </div>
    </div>
  )
}