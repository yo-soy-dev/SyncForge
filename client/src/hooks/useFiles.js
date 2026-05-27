import { useState, useCallback } from "react"
import { filesApi } from "../services/api"
import { toast } from "sonner"

export const useFiles = (roomId) => {
  const [files, setFiles]   = useState([])
  const [saving, setSaving] = useState(false)

  const loadFiles = useCallback(async () => {
    if (!roomId) return
    try {
      const data = await filesApi.getByRoom(roomId)
      setFiles(data.files || [])
    } catch (err) {
      console.warn("File service unavailable:", err.message)
      setFiles([])
    }
  }, [roomId])

  const saveFile = useCallback(async (filename, content, language) => {
    setSaving(true)
    try {
      const data = await filesApi.save({ roomId, filename, content, language })
      setFiles(prev => {
        const exists = prev.find(f => f.filename === filename)
        if (exists) {
          return prev.map(f => f.filename === filename ? data.file : f)
        }
        return [data.file, ...prev]
      })
      toast.success(`${filename} saved successfully!`)
    } catch (err) {
      console.error("Save error:", err)
      toast.error("Save failed: " + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }, [roomId])

  const loadFile = useCallback((file) => {
    return file.content || ""
  }, [])

  return { files, saving, loadFiles, saveFile, loadFile }
}  }, [roomId])

  const loadFile = useCallback((file) => {
    return file.content
  }, [])

  return { files, saving, loadFiles, saveFile, loadFile }
}
